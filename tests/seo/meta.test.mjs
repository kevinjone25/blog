import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, htmlRoutes, title, meta, htmlLang, stripTags, links } from './helpers.mjs'
import { SEO_NAME, HOME_TITLE, TITLE_SUFFIX, BIO, ABOUT_INTRO, TITLES, DESCRIPTIONS, tagDesc } from './expected.mjs'
import { loadPosts } from './content-model.mjs'
import { resolveLanguage } from '../../src/utils/lang.mjs'
import { paginatedName, paginatedDescription } from '../../src/utils/page-title.mjs'

async function routes() {
  const r = await htmlRoutes()
  assert.ok(r.length > 0, 'no HTML routes found in dist (run npm run build first)')
  return r
}

const uniqueTags = (posts) => [...new Set(posts.flatMap((p) => p.tags))]

test('titles follow the templates', async () => {
  const posts = await loadPosts()
  const expected = { ...TITLES }
  for (const p of posts) expected[p.route] = `${p.title}${TITLE_SUFFIX}`
  for (const t of uniqueTags(posts)) expected[`/tags/${t}`] = `Tag: ${t}${TITLE_SUFFIX}`
  for (const [route, title_] of Object.entries(expected)) assert.equal(title(await readPage(route)), title_, route)
})
test('every title is unique and carries SEO_NAME', async () => {
  const titles = await Promise.all((await routes()).map(async (r) => title(await readPage(r))))
  assert.equal(new Set(titles).size, titles.length)
  for (const t of titles) assert.ok(t.includes(SEO_NAME), t)
})
test('fixed-copy descriptions match Copy; every non-article page stays within 50–160 characters', async () => {
  const posts = await loadPosts(), postRoutes = new Set(posts.map((p) => p.route))
  const expected = { ...DESCRIPTIONS }
  for (const t of uniqueTags(posts)) expected[`/tags/${t}`] = tagDesc(t)
  for (const [route, desc] of Object.entries(expected)) assert.equal(meta(await readPage(route), 'description'), desc, route)
  // Article descriptions are author-written and deliberately not gated here (the schema only caps them at 160).
  for (const r of await routes()) {
    if (postRoutes.has(r)) continue
    const n = [...(meta(await readPage(r), 'description') ?? '')].length
    assert.ok(n >= 50 && n <= 160, `${r}: ${n}`)
  }
})
test('paginated pages beyond the first get a distinct description', async () => {
  for (const r of await routes()) {
    const m = r.match(/^(\/blog|\/tags\/[^/]+)\/(\d+)$/)
    if (!m) continue
    const first = meta(await readPage(m[1]), 'description'), here = meta(await readPage(r), 'description')
    assert.equal(here, `${first} · Page ${m[2]}`, r)
  }
})
test('lang, og:locale, og:site_name and author on every page', async () => {
  const byRoute = new Map((await loadPosts()).map((p) => [p.route, p.language]))
  for (const r of await routes()) {
    const h = await readPage(r), want = byRoute.get(r) ?? { lang: 'zh-Hant-TW', ogLocale: 'zh_TW' }
    assert.equal(htmlLang(h), want.lang, r); assert.equal(meta(h, 'og:locale'), want.ogLocale, r)
    assert.equal(meta(h, 'og:site_name'), SEO_NAME, r); assert.equal(meta(h, 'author'), SEO_NAME, r)
  }
})
test('og:title uses the document title except on articles', async () => {
  assert.equal(meta(await readPage('/'), 'og:title'), HOME_TITLE)
  assert.equal(meta(await readPage('/about'), 'og:title'), `About${TITLE_SUFFIX}`)
  for (const p of await loadPosts()) assert.equal(meta(await readPage(p.route), 'og:title'), p.title, p.route)
})
test('visual site name is unchanged; /about opens with the intro and bio and keeps its sections', async () => {
  assert.match(await readPage('/'), />zzy \/ Blog</)
  const about = stripTags(await readPage('/about'))
  for (const s of [ABOUT_INTRO, `${BIO}。`, 'This is a place for notes, ideas and things worth keeping.', 'For everything else, visit my portal', 'You can follow new writing through the RSS feed.']) assert.ok(about.includes(s), s)
  assert.ok(!about.includes("I'm zzy."))
  const en = [...(await readPage('/about')).matchAll(/<p lang="en">([\s\S]*?)<\/p>/g)].map(([, x]) => stripTags(x))
  assert.deepEqual(en, [ABOUT_INTRO, 'This is a place for notes, ideas and things worth keeping.'])
})
test('body element carries no stray description attribute', async () => {
  for (const r of await routes()) assert.doesNotMatch(await readPage(r), /<body\b[^>]*\bdescription=/i, r)
})
test('canonicals and internal links have no trailing slash', async () => {
  for (const r of await routes()) {
    const h = await readPage(r), canonical = links(h, 'canonical')[0].href
    assert.ok(canonical === 'https://blog.zzy.tw/' || !canonical.endsWith('/'), canonical)
    for (const [, href] of h.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
      if (href.startsWith('/') && href.length > 1) assert.ok(!href.endsWith('/'), `${r}: ${href}`)
      if (href.startsWith('https://blog.zzy.tw/') && href !== 'https://blog.zzy.tw/') assert.ok(!href.endsWith('/'), `${r}: ${href}`)
    }
  }
})
test('resolveLanguage maps frontmatter language and falls back safely', () => {
  const zh = { lang: 'zh-Hant-TW', ogLocale: 'zh_TW' }, en = { lang: 'en', ogLocale: 'en_US' }
  for (const v of [undefined, '', '中文', '繁體中文', 'zh-TW', '日本語']) assert.deepEqual(resolveLanguage(v), zh, String(v))
  for (const v of [' English ', 'english', 'en', 'EN-us', '英文']) assert.deepEqual(resolveLanguage(v), en, v)
})
test('paginatedName keeps paginated titles unique', () => {
  assert.equal(paginatedName('Blog'), 'Blog'); assert.equal(paginatedName('Blog', 1), 'Blog')
  assert.equal(paginatedName('Blog', 2), 'Blog · Page 2')
  assert.equal(paginatedDescription('d'), 'd'); assert.equal(paginatedDescription('d', 1), 'd')
  assert.equal(paginatedDescription('d', 3), 'd · Page 3')
})
