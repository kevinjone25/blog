#!/usr/bin/env node
// Visual regression helper: screenshots via Chrome DevTools Protocol (no dependencies), compare via sharp.
//   node scripts/visual-snapshot.mjs --out <dir> <name>=<url>...
//   node scripts/visual-snapshot.mjs --compare <beforeDir> <afterDir>
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const VIEWPORTS = [
  { width: 1440, height: 900, mobile: false },
  { width: 390, height: 844, mobile: true }
]
const SCHEMES = ['light', 'dark']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
    } else if (msg.method) listeners.forEach((l) => l(msg))
  })
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', reject)
  })
  return {
    opened,
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const n = ++id
      pending.set(n, { resolve, reject })
      ws.send(JSON.stringify({ id: n, method, params }))
    }),
    on: (fn) => listeners.push(fn),
    close: () => ws.close()
  }
}

async function launchChrome() {
  const dir = await mkdtemp(join(tmpdir(), 'visual-chrome-'))
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
  let port
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100)
    try { port = Number((await readFile(join(dir, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch {}
  }
  if (!port) { proc.kill(); throw new Error('Chrome did not expose a DevTools port') }
  return { port, close: async () => { proc.kill(); await sleep(300); await rm(dir, { recursive: true, force: true }).catch(() => {}) } }
}

async function shot(port, url, vp, scheme) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const c = cdp(target.webSocketDebuggerUrl)
  await c.opened
  try {
    await c.send('Page.enable')
    await c.send('Network.enable')
    let docStatus
    c.on((m) => { if (m.method === 'Network.responseReceived' && m.params.type === 'Document' && docStatus === undefined) docStatus = m.params.response.status })
    await c.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile })
    await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] })
    const loaded = new Promise((resolve) => c.on((m) => m.method === 'Page.loadEventFired' && resolve()))
    const nav = await c.send('Page.navigate', { url })
    if (nav.errorText) throw new Error(`navigation to ${url} failed: ${nav.errorText}`)
    let timer
    const timedOut = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), 30000) })
    const outcome = await Promise.race([loaded.then(() => 'loaded'), timedOut])
    clearTimeout(timer)
    if (outcome === 'timeout') throw new Error(`load event timed out after 30s for ${url}`)
    if (docStatus === undefined || docStatus < 200 || docStatus >= 300) throw new Error(`${url} returned HTTP status ${docStatus ?? 'none'}`)
    await sleep(1500)
    const m = await c.send('Page.getLayoutMetrics')
    const w = Math.ceil(m.cssContentSize.width), h = Math.ceil(m.cssContentSize.height)
    const r = await c.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } })
    return Buffer.from(r.data, 'base64')
  } finally {
    c.close()
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {})
  }
}

async function compare(beforeDir, afterDir, strict) {
  const { default: sharp } = await import('sharp')
  const files = (await readdir(beforeDir)).filter((f) => f.endsWith('.png')).sort()
  if (files.length === 0) throw new Error(`no PNG files in ${beforeDir}`)
  let problems = 0, changed = 0
  for (const f of files) {
    let a, b
    try {
      a = await sharp(join(beforeDir, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      b = await sharp(join(afterDir, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    } catch (e) { problems++; console.log(`${f} missing-or-unreadable (${e.message})`); continue }
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      problems++
      console.log(`${f} same-size=false before=${a.info.width}x${a.info.height} after=${b.info.width}x${b.info.height}`)
      continue
    }
    let diff = 0
    const n = a.info.width * a.info.height
    for (let i = 0; i < n; i++) {
      const o = i * 4
      if (Math.abs(a.data[o] - b.data[o]) > 16 || Math.abs(a.data[o + 1] - b.data[o + 1]) > 16 || Math.abs(a.data[o + 2] - b.data[o + 2]) > 16 || Math.abs(a.data[o + 3] - b.data[o + 3]) > 16) diff++
    }
    if (diff > 0) changed++
    console.log(`${f} same-size=true diff=${(diff / n).toFixed(6)}`)
  }
  console.log(`SUMMARY files=${files.length} problems=${problems} changed=${changed} strict=${strict}`)
  if (strict && problems > 0) process.exitCode = 1
}

const args = process.argv.slice(2)
if (args[0] === '--compare') {
  const strict = args.includes('--strict')
  const dirs = args.slice(1).filter((a) => a !== '--strict')
  if (dirs.length !== 2) { console.error('usage: --compare <beforeDir> <afterDir> [--strict]'); process.exit(2) }
  await compare(dirs[0], dirs[1], strict)
} else if (args[0] === '--out') {
  const out = args[1]
  const pairs = args.slice(2).map((a) => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)] })
  if (!out || pairs.length === 0) { console.error('usage: --out <dir> <name>=<url>...'); process.exit(2) }
  await mkdir(out, { recursive: true })
  const chrome = await launchChrome()
  let captured = 0, errors = 0
  try {
    for (const [name, url] of pairs) {
      for (const vp of VIEWPORTS) for (const scheme of SCHEMES) {
        const file = join(out, `${name}-${vp.width}-${scheme}.png`)
        try {
          await writeFile(file, await shot(chrome.port, url, vp, scheme))
          captured++
          console.log(file)
        } catch (e) {
          errors++
          console.log(`ERROR ${name}-${vp.width}-${scheme}: ${e.message}`)
        }
      }
    }
  } finally { await chrome.close() }
  console.log(`SUMMARY captured=${captured} errors=${errors}`)
  if (errors > 0) process.exitCode = 1
} else { console.error('usage: --out <dir> <name>=<url>... | --compare <before> <after>'); process.exit(2) }
