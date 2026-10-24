import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DIST = fileURLToPath(new URL('../../dist', import.meta.url))

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(file)))
    else if (entry.isFile()) out.push(file)
  }
  return out
}

export async function distFiles() {
  return (await walk(DIST)).map((f) => relative(DIST, f).split(sep).join('/')).sort()
}
export const readDist = (rel) => readFile(join(DIST, rel), 'utf8')

export async function readPage(route) {
  if (route === '/') return readDist('index.html')
  const clean = route.replace(/^\/+|\/+$/g, '')
  if (clean === '404') return readDist('404.html')
  try {
    return await readDist(`${clean}/index.html`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return readDist(`${clean}.html`)
  }
}

export async function htmlRoutes() {
  const routes = []
  for (const f of await distFiles()) {
    if (!f.endsWith('.html') || f.startsWith('_astro/') || f.startsWith('pagefind/')) continue
    if (f === 'index.html') routes.push('/')
    else if (f.endsWith('/index.html')) routes.push('/' + f.slice(0, -'/index.html'.length))
    else routes.push('/' + f.slice(0, -'.html'.length))
  }
  return routes
}

export function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

export function attrs(tag) {
  const out = {}
  const body = tag.replace(/^<\s*[\w:-]+/, '')
  for (const m of body.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  }
  return out
}

export function title(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? decode(m[1]) : undefined
}

export function metaAll(html, key) {
  const out = []
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(tag)
    if ((a.name === key || a.property === key) && a.content !== undefined) out.push(decode(a.content))
  }
  return out
}
export const meta = (html, key) => metaAll(html, key)[0]

export function links(html, rel) {
  const out = []
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(tag)
    if ((a.rel ?? '').split(/\s+/).includes(rel)) out.push(Object.fromEntries(Object.entries(a).map(([k, v]) => [k, decode(v)])))
  }
  return out
}

export function htmlLang(html) {
  const m = html.match(/<html\b[^>]*>/i)
  return m ? attrs(m[0]).lang : undefined
}

export function scripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => ({ attrs: attrs(`<script ${m[1]}>`), body: m[2] }))
}

export function jsonLdGraph(html) {
  const nodes = []
  for (const s of scripts(html)) {
    if (s.attrs.type !== 'application/ld+json') continue
    const data = JSON.parse(s.body)
    const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data]
    nodes.push(...graph)
  }
  return nodes
}

export function stripTags(html) {
  return decode(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
  ).replace(/\s+/g, ' ').trim()
}

export function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}
