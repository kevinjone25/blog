import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DIST, readPage, meta, metaAll, distFiles, pngSize } from './helpers.mjs'
import { BIO, SEO_NAME, postOgAlt, GENERIC_OG_ALT } from './expected.mjs'
import { renderOgImage } from '../../src/utils/og-image.mjs'

const POST_OG = 'https://blog.zzy.tw/og/markdown-syntax.png'
test('each post gets a generated 1200×630 PNG', async () => {
  assert.deepEqual(pngSize(await readFile(join(DIST, 'og/markdown-syntax.png'))), { width: 1200, height: 630 })
})
test('post pages carry og/twitter image, alt text and article meta', async () => {
  const h = await readPage('/blog/markdown-syntax'), alt = postOgAlt('Markdown 語法指南')
  assert.equal(meta(h, 'og:image'), POST_OG); assert.equal(meta(h, 'twitter:image'), POST_OG)
  assert.equal(meta(h, 'og:image:alt'), alt); assert.equal(meta(h, 'twitter:image:alt'), alt)
  assert.equal(meta(h, 'article:published_time'), '2026-10-24T02:00:00.000Z')
  assert.equal(meta(h, 'article:modified_time'), '2026-10-24T02:00:00.000Z')
  assert.deepEqual(metaAll(h, 'article:tag'), ['markdown', '寫作'])
  assert.equal(meta(h, 'article:author'), SEO_NAME)
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
