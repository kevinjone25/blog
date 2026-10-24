import test from 'node:test'
import assert from 'node:assert/strict'
import { htmlRoutes, readPage, scripts, decode } from './helpers.mjs'
import { BLOG_RUM_TOKEN } from './expected.mjs'
import { isAllowedExternalScript } from '../../scripts/verify-static.mjs'

const BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js'

test('every page defers the Web Analytics beacon until window load via one inline loader', async () => {
  const routes = await htmlRoutes()
  assert.ok(routes.length > 0, 'no HTML routes found in dist/')
  for (const r of routes) {
    const all = scripts(await readPage(r))
    assert.equal(all.filter((s) => (s.attrs.src ?? '').includes('static.cloudflareinsights.com')).length, 0, `${r}: beacon must not be a <script src>`)
    assert.equal(all.filter((s) => 'data-cf-beacon' in s.attrs).length, 0, `${r}: no static data-cf-beacon script`)
    const loaders = all.filter((s) => !s.attrs.src && s.body.includes(BEACON_URL) && s.body.includes(BLOG_RUM_TOKEN))
    assert.equal(loaders.length, 1, `${r}: exactly one inline loader`)
    assert.ok(loaders[0].body.includes("'load'") || loaders[0].body.includes('"load"'), `${r}: waits for load`)
    assert.ok(loaders[0].body.includes('readyState'), `${r}: checks readyState`)
  }
})
test('404 page has exactly one <main> landmark', async () => {
  assert.equal((await readPage('/404')).match(/<main[\s>]/g)?.length, 1)
})
test('only same-origin scripts and the Cloudflare beacon are allowed', () => {
  for (const ok of ['/_astro/a.js', 'https://blog.zzy.tw/_astro/a.js', 'https://static.cloudflareinsights.com/beacon.min.js']) assert.equal(isAllowedExternalScript(ok), true, ok)
  for (const bad of ['https://www.googletagmanager.com/gtag/js', 'https://static.cloudflareinsights.com/other.js', 'https://cdn.jsdelivr.net/npm/x']) assert.equal(isAllowedExternalScript(bad), false, bad)
})
