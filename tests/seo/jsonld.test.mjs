import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, htmlRoutes, jsonLdGraph, meta } from './helpers.mjs'
import { PERSON, SEO_NAME, HOME_TITLE, HOME_DESC, TITLE_SUFFIX } from './expected.mjs'
import { loadPosts } from './content-model.mjs'
import { serializeJsonLd } from '../../src/utils/json-ld.mjs'

const ID = { '@id': 'https://zzy.tw/#person' }
const node = (h, type) => jsonLdGraph(h).find((n) => n['@type'] === type)
test('home: WebSite + Blog + Person', async () => {
  const h = await readPage('/')
  assert.deepEqual(node(h, 'Person'), PERSON)
  assert.deepEqual(node(h, 'WebSite'), { '@type': 'WebSite', '@id': 'https://blog.zzy.tw/#website', url: 'https://blog.zzy.tw/', name: SEO_NAME, inLanguage: 'zh-Hant-TW', publisher: ID })
  assert.deepEqual(node(h, 'Blog'), { '@type': 'Blog', '@id': 'https://blog.zzy.tw/#blog', url: 'https://blog.zzy.tw/', name: HOME_TITLE, description: HOME_DESC, inLanguage: 'zh-Hant-TW', author: ID, publisher: ID })
})
test('every post: BlogPosting + BreadcrumbList + Person derived from its frontmatter', async () => {
  const posts = await loadPosts()
  assert.ok(posts.length > 0, 'no posts found in src/content/blog')
  for (const p of posts) {
    const h = await readPage(p.route), U = `https://blog.zzy.tw${p.route}`
    assert.deepEqual(node(h, 'Person'), PERSON, p.route)
    assert.deepEqual(node(h, 'BlogPosting'), { '@type': 'BlogPosting', '@id': `${U}#article`, url: U, headline: p.title, description: meta(h, 'description'), datePublished: p.published, dateModified: p.modified, image: `https://blog.zzy.tw/og/${p.id}.png`, inLanguage: p.language.lang, ...(p.tags.length ? { keywords: p.tags } : {}), mainEntityOfPage: { '@type': 'WebPage', '@id': U }, author: ID, publisher: ID }, p.route)
    assert.deepEqual(node(h, 'BreadcrumbList'), { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: HOME_TITLE, item: 'https://blog.zzy.tw/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://blog.zzy.tw/blog' },
      { '@type': 'ListItem', position: 3, name: p.title, item: U } ] }, p.route)
  }
})
test('/about: ProfilePage + Person', async () => {
  const h = await readPage('/about')
  assert.deepEqual(node(h, 'Person'), PERSON)
  assert.deepEqual(node(h, 'ProfilePage'), { '@type': 'ProfilePage', '@id': 'https://blog.zzy.tw/about#profile', url: 'https://blog.zzy.tw/about', name: `About${TITLE_SUFFIX}`, inLanguage: 'zh-Hant-TW', mainEntity: ID })
})
test('every ld+json block on every page parses', async () => {
  for (const r of await htmlRoutes()) { const h = await readPage(r); assert.doesNotThrow(() => jsonLdGraph(h), r) }
})
test('serializeJsonLd cannot break out of the script element', () => {
  const headline = '</script><img src=x onerror=alert(1)> & \u2028'
  const s = serializeJsonLd({ headline })
  assert.doesNotMatch(s, /[<>&\u2028\u2029]/); assert.equal(JSON.parse(s).headline, headline)
})
