import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DIST, readDist, htmlRoutes, readPage, links } from './helpers.mjs'
import { pngsToIco } from '../../scripts/make-icons.mjs'

test('pngsToIco writes an ICO directory of PNG entries', () => {
  const ico = pngsToIco([{ size: 16, data: Buffer.from('a') }, { size: 32, data: Buffer.from('bb') }])
  assert.deepEqual([...ico.subarray(0, 6)], [0, 0, 1, 0, 2, 0])
  assert.equal(ico[6], 16); assert.equal(ico[22], 32); assert.equal(ico.readUInt32LE(18), 38)
})
test('dist/favicon.ico holds 16, 32 and 48 px images', async () => {
  const ico = await readFile(join(DIST, 'favicon.ico'))
  assert.equal(ico.readUInt16LE(4), 3); assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48])
})
test('web manifest', async () => {
  assert.deepEqual(JSON.parse(await readDist('site.webmanifest')), { name: 'zzy / Blog', short_name: 'zzy / Blog', lang: 'zh-Hant-TW', start_url: '/', display: 'browser', background_color: '#FCFCFD', theme_color: '#FCFCFD', icons: [{ src: '/images/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] })
})
test('every page links the ICO, SVG icon and manifest', async () => {
  for (const r of await htmlRoutes()) {
    const h = await readPage(r), icons = links(h, 'icon')
    assert.ok(icons.some((l) => l.href === '/favicon.ico' && l.sizes === '32x32'), r)
    assert.ok(icons.some((l) => l.href === '/favicon.svg'), r)
    assert.equal(links(h, 'manifest')[0]?.href, '/site.webmanifest', r)
  }
})
