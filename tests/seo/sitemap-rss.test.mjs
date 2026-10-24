import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPage, readDist, meta, htmlRoutes } from './helpers.mjs'
import { readPostDates, createLastmodResolver } from '../../src/utils/sitemap-lastmod.mjs'

const S = 'https://blog.zzy.tw'
test('sitemap lists pages with lastmod and excludes /search and 404', async () => {
  const xml = await readDist('sitemap-0.xml')
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, u]) => ({ loc: u.match(/<loc>(.*?)<\/loc>/)[1], lastmod: u.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] }))
  assert.deepEqual(urls.map((u) => u.loc).sort(), [S, `${S}/about`, `${S}/archives`, `${S}/blog`, `${S}/blog/markdown-syntax`, `${S}/tags`, `${S}/tags/%E5%AF%AB%E4%BD%9C`, `${S}/tags/markdown`].sort())
  for (const u of urls) assert.equal(u.lastmod, '2026-10-24T02:00:00.000Z', u.loc)
  const post = urls.find((u) => u.loc.endsWith('/blog/markdown-syntax'))
  assert.equal(post.lastmod, meta(await readPage('/blog/markdown-syntax'), 'article:modified_time'))
})
test('/search and 404 are noindex, follow; other pages carry no robots meta', async () => {
  const routes = await htmlRoutes()
  assert.ok(routes.length > 0, 'no HTML routes found in dist')
  for (const r of routes) {
    const expected = ['/search', '/404'].includes(r) ? 'noindex, follow' : undefined
    assert.equal(meta(await readPage(r), 'robots'), expected, r)
  }
})
test('RSS channel declares language and lastBuildDate', async () => {
  const rss = await readDist('rss.xml')
  assert.match(rss, /<language>zh-TW<\/language>/); assert.match(rss, /<lastBuildDate>Sat, 24 Oct 2026 02:00:00 GMT<\/lastBuildDate>/)
})
test('lastmod resolver handles encoded tags, pagination and empty sites', () => {
  const posts = [{ id: 'a', modified: new Date('2026-01-01T00:00:00Z'), tags: ['寫作'] }, { id: 'b', modified: new Date('2026-02-01T00:00:00Z'), tags: ['c++'] }]
  const at = createLastmodResolver(posts, S)
  assert.equal(at(`${S}/blog/a`), '2026-01-01T00:00:00.000Z')
  assert.equal(at(`${S}/tags/%E5%AF%AB%E4%BD%9C`), '2026-01-01T00:00:00.000Z')
  assert.equal(at(`${S}/tags/c%2B%2B/2`), '2026-02-01T00:00:00.000Z')
  for (const u of [`${S}/`, `${S}/about`, `${S}/blog/2`]) assert.equal(at(u), '2026-02-01T00:00:00.000Z', u)
  assert.equal(createLastmodResolver([], S)(`${S}/about`), undefined)
})
test('readPostDates skips drafts, prefers updatedDate, normalizes ids and tags', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'posts-')); await mkdir(join(dir, 'Foo'))
  await writeFile(join(dir, 'Foo/index.md'), "---\ntitle: x\npublishDate: 2026-01-01\nupdatedDate: 2026-03-01\ntags: [' Markdown ', markdown, 寫作]\n---\nbody")
  await writeFile(join(dir, 'draft.md'), '---\ntitle: y\npublishDate: 2026-02-01\ndraft: true\n---\nbody')
  assert.deepEqual(await readPostDates(dir), [{ id: 'foo', modified: new Date('2026-03-01T00:00:00Z'), tags: ['markdown', '寫作'] }])
})
