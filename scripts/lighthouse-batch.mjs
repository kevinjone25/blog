#!/usr/bin/env node
// Runs Lighthouse 13 (mobile + desktop) for each URL; one summary line per URL.
//   node scripts/lighthouse-batch.mjs --out <dir> <url>...
import { execFile } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const args = process.argv.slice(2)
if (args[0] !== '--out' || !args[1] || args.length < 3) { console.error('usage: lighthouse-batch.mjs --out <dir> <url>...'); process.exit(2) }
const out = args[1]
const urls = args.slice(2)
await mkdir(out, { recursive: true })
const THRESHOLD = { mobile: 95, desktop: 100 }
const SKIP_MODES = new Set(['notApplicable', 'informative', 'manual'])
const slug = (u) => u.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_$/, '')

async function lighthouse(url, mode, attempt) {
  const file = join(out, `${slug(url)}.${mode}.${attempt}.json`)
  const flags = ['--yes', 'lighthouse@13', url, '--quiet', '--chrome-flags=--headless=new', '--output=json', `--output-path=${file}`]
  if (mode === 'desktop') flags.push('--preset=desktop')
  await run('npx', flags, { maxBuffer: 1 << 26 })
  const json = JSON.parse(await readFile(file, 'utf8'))
  const cat = (k) => Math.round((json.categories[k]?.score ?? 0) * 100)
  const fails = Object.values(json.audits).filter((a) => a.score !== null && a.score < 1 && !SKIP_MODES.has(a.scoreDisplayMode)).map((a) => a.id)
  return { P: cat('performance'), A: cat('accessibility'), BP: cat('best-practices'), SEO: cat('seo'), fails, file }
}

async function measure(url, mode) {
  const runs = [await lighthouse(url, mode, 1)]
  if (runs[0].P < THRESHOLD[mode]) {
    for (const n of [2, 3]) runs.push(await lighthouse(url, mode, n))
    runs.sort((a, b) => a.P - b.P)
    return runs[1] // median by performance
  }
  return runs[0]
}

let failed = 0
for (const url of urls) {
  try {
    const m = await measure(url, 'mobile')
    const d = await measure(url, 'desktop')
    const fails = [...new Set([...m.fails.map((f) => f), ...d.fails])]
    console.log(`${url} mobile ${m.P}/${m.A}/${m.BP}/${m.SEO} desktop ${d.P}/${d.A}/${d.BP}/${d.SEO} fails=${fails.join(',') || '-'}`)
  } catch (e) {
    failed++
    console.log(`${url} ERROR ${String(e.message).split('\n')[0]}`)
  }
}
process.exit(failed ? 1 : 0)
