import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DIST, readPage, meta, metaAll, distFiles, pngSize } from './helpers.mjs'
import { BIO, SEO_NAME, postOgAlt, GENERIC_OG_ALT } from './expected.mjs'
import { loadPosts } from './content-model.mjs'
import { renderOgImage } from '../../src/utils/og-image.mjs'

test('each post gets a generated 1200×630 PNG', async () => {
  const posts = await loadPosts()
  assert.ok(posts.length > 0, 'no posts found in src/content/blog')
  for (const p of posts) assert.deepEqual(pngSize(await readFile(join(DIST, `og/${p.id}.png`))), { width: 1200, height: 630 }, p.id)
})
test('post pages carry og/twitter image, alt text and article meta', async () => {
  for (const p of await loadPosts()) {
    const h = await readPage(p.route), alt = postOgAlt(p.title), img = `https://blog.zzy.tw/og/${p.id}.png`
    assert.equal(meta(h, 'og:image'), img, p.route); assert.equal(meta(h, 'twitter:image'), img, p.route)
    assert.equal(meta(h, 'og:image:alt'), alt, p.route); assert.equal(meta(h, 'twitter:image:alt'), alt, p.route)
    assert.equal(meta(h, 'article:published_time'), p.published, p.route)
    assert.equal(meta(h, 'article:modified_time'), p.modified, p.route)
    assert.deepEqual(metaAll(h, 'article:tag'), p.tags, p.route)
    assert.equal(meta(h, 'article:author'), SEO_NAME, p.route)
  }
})
test('Twitter card tags use name=, not property=', async () => {
  const h = await readPage('/')
  for (const k of ['card', 'url', 'title', 'description', 'image', 'image:alt']) assert.match(h, new RegExp(`<meta\\b[^>]*\\bname="twitter:${k}"`), k)
  assert.doesNotMatch(h, /property="twitter:/)
})
test('other pages keep the generic social card', async () => {
  for (const r of ['/', '/blog', '/about', '/search']) {
    const h = await readPage(r)
    assert.equal(meta(h, 'og:image'), 'https://blog.zzy.tw/images/social-card.png', r)
    assert.equal(meta(h, 'og:image:alt'), GENERIC_OG_ALT, r)
    assert.equal(meta(h, 'article:published_time'), undefined, r)
  }
})
test('the CJK font is build-time only', async () => {
  assert.ok(!(await distFiles()).some((f) => /\.(ttf|otf)$/i.test(f) && /noto/i.test(f)))
})
test('renderOgImage handles a 60-character title', async () => {
  const png = await renderOgImage({ label: 'blog.zzy.tw', title: '長'.repeat(60), footer: SEO_NAME })
  assert.deepEqual(pngSize(png), { width: 1200, height: 630 })
})
test('og-image CLI writes a PNG and prints one line', async () => {
  const out = join(await mkdtemp(join(tmpdir(), 'og-')), 'og.png')
  const stdout = execFileSync('node', ['scripts/og-image.mjs', '--label', 'zzy.tw', '--title', SEO_NAME, '--footer', BIO, '--out', out], { encoding: 'utf8' })
  assert.equal(stdout, `Wrote ${out}\n`); assert.deepEqual(pngSize(await readFile(out)), { width: 1200, height: 630 })
})
