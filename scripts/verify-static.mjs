import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = 'https://blog.zzy.tw'
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const demoHashes = new Set([
  '6516fe16d110f9a581992a38839423538648b38d346ab758ec68b044da8ded5f',
  '481b08182f0febf9dc1ba01415a2271f42dbd82857a0f41d322aa5ce66c7d0f9',
  '23f5d1ad7fac6517e9563815d53b23b8c4ad593a29293246056304a0b852f6c0',
  '4388d9b2cc2ed8e52c7fa6d38f141db691392aac4745486c2d348bafed8d793e',
  '3da8549026d7577eac1f9af30ed11f1ed4b3071a1a7c1db544353fa8187d00c0',
  '4f37244a587dab47856b8e3b2e21a1f6b399fee4b0ae7c46ef579eb4c9e9300c',
  'c19cdcd72a47a780ad1d6c061540cd983df01450aaa69d0992f95c1de6305049'
])
const BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js'
const runtimeService = /(?:@waline\/client|walineInit|waline\.js\.org|astro-theme-pure-waline\.arthals\.ink|giscus\.app\/client|disqus\.com\/embed|twikoo\.all(?:\.min)?\.js)/i
const widgetToken = /^(?:waline(?:[-_].*)?|wl-(?:comment|content|editor|reaction).*|giscus(?:-frame)?|disqus_thread|twikoo(?:-container)?|comment-component)$/i
const remoteApiCall = /\b(?:fetch|sendBeacon|WebSocket|EventSource)\s*\(\s*["'`](https?:\/\/[^\s"'`]+)/g

async function exists(file) {
  try { await stat(file); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error }
}
async function filesWithin(directory) {
  if (!await exists(directory)) return []
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in static output: ${file}`)
    if (entry.isDirectory()) files.push(...await filesWithin(file))
    else if (entry.isFile()) files.push(file)
  }
  return files
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]]))
}
function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
function canonicalOrigin(value) {
  try { return new URL(decode(value)).origin === SITE } catch { return false }
}
function xmlText(value) {
  return decode(value.replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/, '$1').trim())
}

/** Same-origin scripts and the single approved Cloudflare Web Analytics beacon. */
export function isAllowedExternalScript(src) {
  let url
  try { url = new URL(src, SITE) } catch { return false }
  return url.origin === SITE || url.href === BEACON_URL
}

/** Inspect built artifacts and configuration; article prose is not treated as executable code. */
export async function verifyStaticSite(root = projectRoot) {
  const dist = resolve(root, 'dist')
  const failures = []
  const requireCheck = (condition, description) => { if (!condition) failures.push(description) }
  requireCheck(await exists(dist), 'dist/ is missing; build the site first')
  if (!await exists(dist)) throw new Error(`Static verification failed:\n- ${failures.join('\n- ')}`)
  const files = await filesWithin(dist)
  const htmlFiles = files.filter((file) => file.endsWith('.html'))
  const clientFiles = files.filter((file) => /\.(?:m?js|css)$/.test(file))

  for (const route of ['', 'blog', 'archives', 'tags', 'search', 'about', '404']) {
    const alternatives = route ? [join(dist, route, 'index.html'), join(dist, `${route}.html`)] : [join(dist, 'index.html')]
    const found = (await Promise.all(alternatives.map(exists))).some(Boolean)
    requireCheck(found, `Missing pre-rendered page: /${route}`)
  }
  for (const name of ['_worker.js', '_routes.json', '.prerender', 'server', 'client', 'functions', '_functions']) {
    requireCheck(!await exists(join(dist, name)), `Unexpected server/SSR artifact: dist/${name}`)
  }
  requireCheck(await exists(join(dist, 'pagefind', 'pagefind.js')), 'Static Pagefind index is missing')
  requireCheck(await exists(join(dist, 'robots.txt')), 'Pre-rendered robots.txt is missing')

  const configPath = join(root, 'astro.config.ts')
  if (await exists(configPath)) {
    const config = (await readFile(configPath, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter((line) => !line.trimStart().startsWith('//')).join('\n')
    requireCheck(/\boutput\s*:\s*['"]static['"]/.test(config), 'Astro must explicitly use output: static')
    requireCheck(!/\badapter\s*:|from\s*['"]@astrojs\/(?:vercel|cloudflare|node|netlify)['"]/.test(config), 'SSR adapter remains in Astro configuration')
  } else failures.push('astro.config.ts is missing')
  const packagePath = join(root, 'package.json')
  if (await exists(packagePath)) {
    const pkg = JSON.parse(await readFile(packagePath, 'utf8'))
    const dependencies = { ...pkg.dependencies, ...pkg.devDependencies }
    requireCheck(!('@waline/client' in dependencies), 'Waline client dependency remains installed by the site')
    requireCheck(!Object.keys(dependencies).some((name) => /^@astrojs\/(vercel|cloudflare|node|netlify)$/.test(name)), 'Unused SSR adapter dependency remains')
  }

  async function checkLocalScriptReference(src, label) {
    let url
    try { url = new URL(decode(src), SITE) } catch { failures.push(`${label}: invalid script src`); return }
    requireCheck(!runtimeService.test(url.href), `${label}: comment service script reference remains`)
    requireCheck(isAllowedExternalScript(url.href), `${label}: third-party script ${url.href} is not allowed`)
    if (url.origin !== SITE) return
    const asset = resolve(dist, `.${decodeURIComponent(url.pathname)}`)
    requireCheck(asset.startsWith(dist + sep), `${label}: script reference escapes dist/`)
    if (asset.startsWith(dist + sep)) requireCheck(await exists(asset), `${label}: missing static script ${url.pathname}`)
  }
  function checkExecutable(code, label) {
    requireCheck(!runtimeService.test(code), `${label}: comment service code remains`)
    for (const match of code.matchAll(remoteApiCall)) {
      let url
      try { url = new URL(match[1]) } catch { continue }
      requireCheck(url.origin === SITE, `${label}: direct external runtime request to ${url.origin}`)
    }
    requireCheck(!/https?:\/\/(?:dummyjson\.com\/quotes|api\.swo\.moe\/stats)/i.test(code), `${label}: demo quote/statistics service remains`)
  }

  for (const file of htmlFiles) {
    const label = relative(dist, file)
    const html = await readFile(file, 'utf8')
    const canonicalTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]))
      .filter((attr) => attr.rel?.toLowerCase().split(/\s+/).includes('canonical'))
    requireCheck(canonicalTags.length === 1, `${label}: expected one canonical URL`)
    for (const tag of canonicalTags) requireCheck(canonicalOrigin(tag.href ?? ''), `${label}: canonical does not use ${SITE}`)
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
      const attr = attributes(match[0])
      const key = (attr.property ?? attr.name ?? '').toLowerCase()
      if (['og:url', 'twitter:url'].includes(key)) requireCheck(canonicalOrigin(attr.content ?? ''), `${label}: ${key} has an upstream or invalid origin`)
      if (key === 'author') requireCheck(!/^(?:Pure Lab|CWorld)$/i.test(attr.content ?? ''), `${label}: upstream author metadata remains`)
      if (key === 'og:site_name') requireCheck(!/^Astro Theme Pure$/i.test(attr.content ?? ''), `${label}: upstream site name remains`)
    }
    const pageTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
    requireCheck(!/Astro Theme Pure/.test(pageTitle), `${label}: upstream page title remains`)
    for (const match of html.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)) {
      const tagName = match[1].toLowerCase()
      const attr = attributes(match[0])
      requireCheck(!widgetToken.test(tagName), `${label}: comment custom element ${tagName} remains`)
      const tokens = [attr.id, ...(attr.class ?? '').split(/\s+/)].filter(Boolean)
      requireCheck(!tokens.some((token) => widgetToken.test(token)), `${label}: comment widget marker remains`)
      if (tagName === 'a') requireCheck(!/^mailto:/i.test(attr.href ?? ''), `${label}: Email UI remains`)
      for (const name of ['src', 'data-server-url', 'action']) {
        if (attr[name]) requireCheck(!runtimeService.test(attr[name]), `${label}: comment service ${name} remains`)
      }
    }
    for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
      const attr = attributes(match[0])
      if (!/\b(?:stylesheet|preload|modulepreload)\b/i.test(attr.rel ?? '') || !attr.href) continue
      let href
      try { href = new URL(decode(attr.href), SITE) } catch { continue }
      if (href.origin !== SITE) failures.push(`${label}: external ${attr.rel} link ${href.href} is not allowed`)
    }
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attr = attributes(match[1])
      if (attr.src) await checkLocalScriptReference(attr.src, label)
      if (!attr.type || /^(?:module|(?:text|application)\/(?:java|ecma)script)$/i.test(attr.type)) checkExecutable(match[2], `${label} inline script`)
    }
  }
  for (const file of clientFiles) {
    const code = await readFile(file, 'utf8')
    const label = relative(dist, file)
    if (file.endsWith('.css')) requireCheck(!/--waline-|\.wl-comment|#waline\b|\.giscus-frame/.test(code), `${label}: comment CSS remains`)
    else checkExecutable(code, label)
  }

  const rssPath = join(dist, 'rss.xml')
  requireCheck(await exists(rssPath), 'Pre-rendered RSS is missing')
  if (await exists(rssPath)) {
    const rss = await readFile(rssPath, 'utf8')
    requireCheck(/<rss\b/.test(rss) && /<channel\b/.test(rss) && /<\/channel>/.test(rss), 'RSS has no complete rss/channel structure')
    const channel = rss.match(/<channel\b[^>]*>([\s\S]*?)<\/channel>/i)?.[1] ?? ''
    const channelLink = channel.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1]
    requireCheck(!!channelLink && canonicalOrigin(xmlText(channelLink)), 'RSS channel link must use the production blog origin')
    // A valid empty feed has no items; do not require any article entries.
    for (const match of rss.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
      const link = match[1].match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1]
      requireCheck(!!link && canonicalOrigin(xmlText(link)), 'RSS item link points outside the production blog')
    }
  }
  const sitemaps = files.filter((file) => /(?:^|\/)sitemap(?:-[^/]*)?\.xml$/.test(file.replaceAll('\\', '/')))
  requireCheck(await exists(join(dist, 'sitemap-index.xml')), 'Sitemap index is missing')
  requireCheck(sitemaps.length >= 2, 'Expected a sitemap index and at least one generated sitemap')
  for (const file of sitemaps) {
    const xml = await readFile(file, 'utf8')
    const locations = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map((match) => xmlText(match[1]))
    requireCheck(locations.length > 0, `${relative(dist, file)} contains no locations`)
    requireCheck(locations.every(canonicalOrigin), `${relative(dist, file)} contains non-production locations`)
  }
  const contentFiles = (await filesWithin(join(root, 'src', 'content', 'blog'))).filter((file) => /\.(?:md|mdx)$/.test(file))
  for (const file of contentFiles) {
    const hash = createHash('sha256').update(await readFile(file)).digest('hex')
    requireCheck(!demoHashes.has(hash), `Unmodified upstream demo article remains: ${relative(root, file)}`)
  }
  if (failures.length) throw new Error(`Static verification failed (${failures.length}):\n- ${failures.join('\n- ')}`)
  return { files: files.length, htmlPages: htmlFiles.length, clientFiles: clientFiles.length, contentFiles: contentFiles.length }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifyStaticSite()
    console.log(`Static verification passed: ${result.htmlPages} HTML pages, ${result.files} files, ${result.contentFiles} content sources; no SSR/comment output.`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
