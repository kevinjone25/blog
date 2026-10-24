import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, htmlRoutes, jsonLdGraph, meta } from './helpers.mjs'
import { PERSON, SEO_NAME, HOME_TITLE, HOME_DESC, TITLE_SUFFIX } from './expected.mjs'
import { serializeJsonLd } from '../../src/utils/json-ld.mjs'

const ID = { '@id': 'https://zzy.tw/#person' }, U = 'https://blog.zzy.tw/blog/markdown-syntax'
const node = (h, type) => jsonLdGraph(h).find((n) => n['@type'] === type)
test('home: WebSite + Blog + Person', async () => {
  const h = await readPage('/')
  assert.deepEqual(node(h, 'Person'), PERSON)
  assert.deepEqual(node(h, 'WebSite'), { '@type': 'WebSite', '@id': 'https://blog.zzy.tw/#website', url: 'https://blog.zzy.tw/', name: SEO_NAME, inLanguage: 'zh-Hant-TW', publisher: ID })
  assert.deepEqual(node(h, 'Blog'), { '@type': 'Blog', '@id': 'https://blog.zzy.tw/#blog', url: 'https://blog.zzy.tw/', name: HOME_TITLE, description: HOME_DESC, inLanguage: 'zh-Hant-TW', author: ID, publisher: ID })
})
test('post: BlogPosting + BreadcrumbList + Person', async () => {
  const h = await readPage('/blog/markdown-syntax')
  assert.deepEqual(node(h, 'Person'), PERSON)
  assert.deepEqual(node(h, 'BlogPosting'), { '@type': 'BlogPosting', '@id': `${U}#article`, url: U, headline: 'Markdown 語法指南', description: meta(h, 'description'), datePublished: '2026-10-24T02:00:00.000Z', dateModified: '2026-10-24T02:00:00.000Z', image: 'https://blog.zzy.tw/og/markdown-syntax.png', inLanguage: 'zh-Hant-TW', keywords: ['markdown', '寫作'], mainEntityOfPage: { '@type': 'WebPage', '@id': U }, author: ID, publisher: ID })
  assert.deepEqual(node(h, 'BreadcrumbList'), { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: HOME_TITLE, item: 'https://blog.zzy.tw/' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://blog.zzy.tw/blog' },
    { '@type': 'ListItem', position: 3, name: 'Markdown 語法指南', item: U } ] })
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
