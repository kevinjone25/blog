import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readDist } from './helpers.mjs'

test('_headers caches hashed assets and noindexes workers.dev hosts only', async () => {
  const h = await readDist('_headers')
  assert.ok(h.includes('/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n'))
  assert.ok(h.includes('https://:worker.:sub.workers.dev/*\n  X-Robots-Tag: noindex\n'))
  assert.doesNotMatch(h, /^\/\*\s*$/m)
})
test('CI runs the offline SEO tests right after building', async () => {
  const yml = await readFile(new URL('../../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8')
  const build = yml.indexOf('run: npm run build'), seo = yml.indexOf('- name: Test SEO output\n        run: npm run test:seo')
  assert.ok(build > 0 && seo > build)
})
