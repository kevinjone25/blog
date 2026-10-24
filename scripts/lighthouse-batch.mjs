#!/usr/bin/env node
// Runs Lighthouse 13 (mobile + desktop) for each URL; one summary line per URL.
//   node scripts/lighthouse-batch.mjs --out <dir> <url>...
import { execFile } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const args = argv.filter((a) => a !== '--strict')
if (args[0] !== '--out' || !args[1] || args.length < 3) { console.error('usage: lighthouse-batch.mjs [--strict] --out <dir> <url>...'); process.exit(2) }
const out = args[1]
const urls = args.slice(2)
await mkdir(out, { recursive: true })
const THRESHOLD = { mobile: 95, desktop: 100 }
const SKIP_MODES = new Set(['notApplicable', 'informative', 'manual'])
const slug = (u) => u.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_$/, '')

async function lighthouse(url, mode, attempt) {
  const file = join(out, `${slug(url)}.${mode}.${attempt}.json`)
  const flags = ['--yes', 'lighthouse@13', url, '--quiet', '--chrome-flags=--headless=new', '--output=json', '--ignore-status-code', `--output-path=${file}`]
  if (mode === 'desktop') flags.push('--preset=desktop')
  await run('npx', flags, { maxBuffer: 1 << 26 })
  const json = JSON.parse(await readFile(file, 'utf8'))
  const cat = (k) => Math.round((json.categories[k]?.score ?? 0) * 100)
  const fails = Object.values(json.audits).filter((a) => a.score !== null && a.score < 1 && !SKIP_MODES.has(a.scoreDisplayMode)).map((a) => a.id)
  const catFails = (k) => (json.categories[k]?.auditRefs ?? []).map((r) => json.audits[r.id]).filter((a) => a && a.score !== null && a.score < 1 && !SKIP_MODES.has(a.scoreDisplayMode)).map((a) => a.id)
  const is404 = json.audits['http-status-code']?.score === 0
  return { P: cat('performance'), A: cat('accessibility'), BP: cat('best-practices'), SEO: cat('seo'), fails, bpFails: catFails('best-practices'), is404, file }
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

// Design section 7 exceptions: noindex pages (/search, 404) and preview hosts cannot reach SEO 100;
// a 404 page's own "Failed to load resource: 404" console error does not count against Best Practices.
function violations(url, mode, r) {
  const v = []
  const u = new URL(url)
  const noindexPage = r.is404 || u.pathname === '/search'
  const preview = u.hostname.endsWith('.workers.dev')
  if (r.P < THRESHOLD[mode]) v.push(`${mode} P=${r.P}<${THRESHOLD[mode]}`)
  if (r.A < 100) v.push(`${mode} A=${r.A}`)
  if (r.BP < 100 && !(r.is404 && r.bpFails.every((id) => id === 'errors-in-console'))) v.push(`${mode} BP=${r.BP}`)
  if (r.SEO < 100 && !noindexPage && !preview) v.push(`${mode} SEO=${r.SEO}`)
  return v
}

let errored = 0, violating = 0
for (const url of urls) {
  try {
    const m = await measure(url, 'mobile')
    const d = await measure(url, 'desktop')
    const fails = [...new Set([...m.fails, ...d.fails])]
    const v = [...violations(url, 'mobile', m), ...violations(url, 'desktop', d)]
    if (v.length) violating++
    console.log(`${url} mobile ${m.P}/${m.A}/${m.BP}/${m.SEO} desktop ${d.P}/${d.A}/${d.BP}/${d.SEO} fails=${fails.join(',') || '-'}${strict ? ` strict=${v.length ? 'FAIL(' + v.join(' ') + ')' : 'PASS'}` : ''}`)
  } catch (e) {
    errored++
    console.log(`${url} ERROR ${String(e.message).split('\n')[0]}`)
  }
}
console.log(`SUMMARY urls=${urls.length} errors=${errored} threshold-violations=${violating} strict=${strict}`)
process.exit(errored || (strict && violating) ? 1 : 0)
