#!/usr/bin/env node
// Live crawler for the SEO acceptance (design section 7). Prints one PASS|FAIL line per page.
//   node scripts/seo-audit.mjs --blog-origin <url> --portal-origin <url> --blog-token <t> --portal-token <t> [--preview] [--skip-404-noindex]
import { deepStrictEqual } from 'node:assert/strict'
import { SEO_NAME, PERSON } from '../tests/seo/expected.mjs'
import { attrs, decode, htmlLang, jsonLdGraph, links, meta, metaAll, pngSize, scripts, title } from '../tests/seo/helpers.mjs'

const argv = process.argv.slice(2)
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined }
const flag = (name) => argv.includes(name)
const origin = (u) => u?.replace(/\/+$/, '')
const BLOG_ORIGIN = origin(opt('--blog-origin')), PORTAL_ORIGIN = origin(opt('--portal-origin'))
const BLOG_TOKEN = opt('--blog-token'), PORTAL_TOKEN = opt('--portal-token')
const PREVIEW = flag('--preview'), SKIP_404_NOINDEX = flag('--skip-404-noindex')
if (!BLOG_ORIGIN || !PORTAL_ORIGIN || !BLOG_TOKEN || !PORTAL_TOKEN) {
  console.error('usage: seo-audit.mjs --blog-origin <url> --portal-origin <url> --blog-token <t> --portal-token <t> [--preview] [--skip-404-noindex]')
  process.exit(2)
}
const PROD = { blog: 'https://blog.zzy.tw', portal: 'https://zzy.tw' }
const SITES = {
  blog: { name: 'blog', origin: BLOG_ORIGIN, prod: PROD.blog, token: BLOG_TOKEN },
  portal: { name: 'portal', origin: PORTAL_ORIGIN, prod: PROD.portal, token: PORTAL_TOKEN }
}
const MISSING = '/seo-audit-missing-page'
const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js'
const swapOrigin = (url) => {
  for (const s of Object.values(SITES)) if (url === s.prod || url.startsWith(s.prod + '/')) return s.origin + url.slice(s.prod.length)
  return url
}
const equal = (a, b) => { try { deepStrictEqual(a, b); return true } catch { return false } }
const fetchPage = (url) => fetch(url, { redirect: 'manual', headers: { 'user-agent': 'seo-audit/1.0' } })
const hasNoindex = (res) => /noindex/i.test(res.headers.get('x-robots-tag') ?? '')

const results = []
const record = (url, failures) => {
  results.push({ url, failures })
  console.log(`${failures.length ? 'FAIL' : 'PASS'} ${url} ${failures.join('; ')}`.trimEnd())
}

function locs(xml) { return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decode(m[1])) }

async function collectSite(site) {
  const failures = []
  const pages = []
  const robotsRes = await fetchPage(site.origin + '/robots.txt')
  const robots = robotsRes.status === 200 ? await robotsRes.text() : ''
  const sitemapLines = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1])
  if (robotsRes.status !== 200) failures.push(`robots.txt status ${robotsRes.status}`)
  if (sitemapLines.length === 0) failures.push('robots.txt has no Sitemap line')
  if (PREVIEW ? !hasNoindex(robotsRes) : robotsRes.headers.has('x-robots-tag')) failures.push('robots.txt x-robots-tag mismatch')
  let urls = []
  const queue = sitemapLines.map(swapOrigin)
  const seen = new Set()
  let lastmodMissing = 0
  while (queue.length) {
    const u = queue.shift()
    if (seen.has(u)) continue
    seen.add(u)
    const res = await fetchPage(u)
    if (res.status !== 200) { failures.push(`sitemap ${u} status ${res.status}`); continue }
    const xml = await res.text()
    if (/<sitemapindex/.test(xml)) queue.push(...locs(xml).map(swapOrigin))
    else {
      for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
        const loc = locs(m[1])[0]
        urls.push(loc)
        if (!/<lastmod>\s*\S+\s*<\/lastmod>/.test(m[1])) lastmodMissing++
      }
    }
  }
  if (urls.length === 0) failures.push('sitemap lists no URLs')
  if (lastmodMissing) failures.push(`${lastmodMissing} sitemap URLs lack lastmod`)
  for (const u of urls) if (!u.startsWith(site.prod)) failures.push(`sitemap URL not on ${site.prod}: ${u}`)
  const paths = urls.map((u) => new URL(u).pathname)
  if (site.name === 'blog' && paths.includes('/search')) failures.push('blog sitemap includes /search')
  record(`${site.origin} (robots+sitemap)`, failures)
  for (const p of paths) pages.push({ site, path: p, kind: 'page' })
  if (!paths.includes('/')) pages.push({ site, path: '/', kind: 'page' })
  if (site.name === 'blog' && !paths.includes('/search')) pages.push({ site, path: '/search', kind: 'page' })
  pages.push({ site, path: MISSING, kind: '404' })
  return pages
}

async function auditPage({ site, path, kind }, titles) {
  const is404 = kind === '404'
  const url = site.origin + path
  const failures = []
  let res
  try { res = await fetchPage(url) } catch (e) { return record(url, [`fetch failed: ${e.message}`]) }
  const html = await res.text()
  const expectStatus = is404 ? 404 : 200
  if (res.status !== expectStatus) failures.push(`status ${res.status} expected ${expectStatus}`)

  // x-robots-tag
  if (PREVIEW) {
    if (!hasNoindex(res) && !(is404 && SKIP_404_NOINDEX)) failures.push('missing x-robots-tag noindex')
  } else if (res.headers.has('x-robots-tag')) failures.push(`unexpected x-robots-tag: ${res.headers.get('x-robots-tag')}`)

  // title
  const t = title(html)
  if (!t) failures.push('title missing')
  else {
    if (!t.includes(SEO_NAME)) failures.push(`title lacks SEO_NAME: "${t}"`)
    if (!is404) {
      if (titles.has(t)) failures.push(`title not unique: "${t}" also on ${titles.get(t)}`)
      else titles.set(t, url)
    }
  }

  // description
  const d = meta(html, 'description')
  if (d === undefined) failures.push('description missing')
  else { const n = [...d].length; if (n < 50 || n > 160) failures.push(`description length ${n}` ) }

  // lang / og:locale
  const lang = htmlLang(html), locale = meta(html, 'og:locale')
  const okPairs = site.name === 'portal' ? [['en', null]] : [['zh-Hant-TW', 'zh_TW'], ['en', 'en_US']]
  if (site.name === 'portal') { if (lang !== 'en') failures.push(`portal lang ${lang} expected en`) }
  else if (!okPairs.some(([l, o]) => l === lang && o === locale)) failures.push(`lang/og:locale mismatch: ${lang} / ${locale}`)
  if (site.name === 'portal' && !is404 && locale === undefined) failures.push('og:locale missing')

  // beacon
  const beacons = [...html.matchAll(/<script\b[^>]*\bdata-cf-beacon\b[^>]*>/gi)].map((m) => attrs(m[0]))
  if (beacons.length !== 1) failures.push(`beacon count ${beacons.length}`)
  else {
    let tok
    try { tok = JSON.parse(decode(beacons[0]['data-cf-beacon'])).token } catch { tok = undefined }
    if (tok !== site.token) failures.push(`beacon token ${tok}`)
    if (beacons[0].src !== BEACON_SRC) failures.push(`beacon src ${beacons[0].src}`)
  }

  if (!is404) {
    // canonical
    const want = path === '/' ? site.prod + '/' : new URL(path, site.prod).href
    const canon = links(html, 'canonical')
    if (canon.length !== 1) failures.push(`canonical count ${canon.length}`)
    else if (new URL(canon[0].href).href !== new URL(want).href) failures.push(`canonical ${canon[0].href} expected ${want}`)

    // og:image
    const og = meta(html, 'og:image')
    if (!og) failures.push('og:image missing')
    else {
      try {
        const r = await fetchPage(swapOrigin(og))
        const buf = Buffer.from(await r.arrayBuffer())
        const isPng = buf.length > 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        if (r.status !== 200) failures.push(`og:image status ${r.status}`)
        else if (!isPng) failures.push('og:image is not PNG')
        else { const { width, height } = pngSize(buf); if (width !== 1200 || height !== 630) failures.push(`og:image ${width}x${height}`) }
      } catch (e) { failures.push(`og:image fetch failed: ${e.message}`) }
    }

    // JSON-LD
    let graph = []
    try { graph = jsonLdGraph(html) } catch (e) { failures.push(`JSON-LD invalid JSON: ${e.message}`) }
    const types = graph.flatMap((n) => [n['@type']].flat())
    const isPost = site.name === 'blog' && /^\/blog\/[^/]+$/.test(path)
    let required = []
    if (site.name === 'blog' && path === '/') required = ['WebSite', 'Blog', 'Person']
    else if (site.name === 'blog' && path === '/about') required = ['ProfilePage', 'Person']
    else if (isPost) required = ['BlogPosting', 'BreadcrumbList', 'Person']
    else if (site.name === 'portal' && path === '/') required = ['WebSite', 'Person']
    for (const r of required) if (!types.includes(r)) failures.push(`JSON-LD lacks ${r} (has ${types.join(',') || 'none'})`)
    for (const n of graph.filter((n) => [n['@type']].flat().includes('Person'))) {
      if (!equal(n, PERSON)) failures.push('Person node differs from PERSON')
    }
  }

  // portal: link to blog without JS
  if (site.name === 'portal' && path === '/' && ![...html.matchAll(/<a\b[^>]*>/gi)].some((m) => attrs(m[0]).href === 'https://blog.zzy.tw/')) failures.push('portal static HTML lacks <a href="https://blog.zzy.tw/">')

  record(url, failures)
}

const titles = new Map()
let allPages = []
for (const site of Object.values(SITES)) allPages.push(...(await collectSite(site)))
if (allPages.length === 0) { console.error('no pages collected'); process.exit(1) }
for (const p of allPages) await auditPage(p, titles)
const pageResults = results.filter((r) => !r.url.endsWith('(robots+sitemap)'))
const failed = results.filter((r) => r.failures.length)
const siteResults = results.filter((r) => r.url.endsWith('(robots+sitemap)'))
console.log(`SUMMARY pages=${pageResults.length} pass=${pageResults.filter((r) => !r.failures.length).length} fail=${pageResults.filter((r) => r.failures.length).length} site-checks=${siteResults.length} site-checks-failed=${siteResults.filter((r) => r.failures.length).length}`)
process.exit(failed.length ? 1 : 0)
