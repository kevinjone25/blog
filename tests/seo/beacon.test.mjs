import test from 'node:test'
import assert from 'node:assert/strict'
import { htmlRoutes, readPage, scripts, decode } from './helpers.mjs'
import { BLOG_RUM_TOKEN } from './expected.mjs'
import { isAllowedExternalScript } from '../../scripts/verify-static.mjs'

test('every page loads exactly one deferred Web Analytics beacon', async () => {
  const routes = await htmlRoutes()
  assert.ok(routes.length > 0, 'no HTML routes found in dist/')
  for (const r of routes) {
    const b = scripts(await readPage(r)).filter((s) => s.attrs.src === 'https://static.cloudflareinsights.com/beacon.min.js')
    assert.equal(b.length, 1, r); assert.ok('defer' in b[0].attrs, r)
    assert.deepEqual(JSON.parse(decode(b[0].attrs['data-cf-beacon'])), { token: BLOG_RUM_TOKEN }, r)
  }
})
test('only same-origin scripts and the Cloudflare beacon are allowed', () => {
  for (const ok of ['/_astro/a.js', 'https://blog.zzy.tw/_astro/a.js', 'https://static.cloudflareinsights.com/beacon.min.js']) assert.equal(isAllowedExternalScript(ok), true, ok)
  for (const bad of ['https://www.googletagmanager.com/gtag/js', 'https://static.cloudflareinsights.com/other.js', 'https://cdn.jsdelivr.net/npm/x']) assert.equal(isAllowedExternalScript(bad), false, bad)
})
