import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, distFiles, readDist } from './helpers.mjs'

test('every KaTeX @font-face uses font-display: swap', async () => {
  const blocks = []
  for (const f of (await distFiles()).filter((f) => /^_astro\/.*\.css$/.test(f))) blocks.push(...(await readDist(f)).match(/@font-face\{[^}]*KaTeX_[^}]*\}/g) ?? [])
  assert.ok(blocks.length >= 20)
  for (const b of blocks) { assert.match(b, /font-display:swap/); assert.doesNotMatch(b, /font-display:block/) }
})
test('task-list checkboxes are named after their item text', async () => {
  const h = await readPage('/blog/markdown-syntax')
  const names = [...h.matchAll(/<li class="task-list-item">\s*<input\b([^>]*)>/g)].map(([, a]) => a.match(/aria-label="([^"]*)"/)?.[1])
  assert.deepEqual(names, ['架好部落格', '寫第一篇文章', '持續寫下去'])
})
test('accessible names contain the visible labels', async () => {
  assert.doesNotMatch(await readPage('/blog/markdown-syntax'), /aria-label="Copy article link"/)
  assert.doesNotMatch(await readPage('/blog'), /aria-label="View all blog by years"/)
})
test('BackToTop reads no layout during connectedCallback', async () => {
  const s = (await readPage('/blog/markdown-syntax')).match(/class ScrollBtn[\s\S]*?customElements\.define/)[0]
  const connected = s.slice(s.indexOf('connectedCallback()'), s.indexOf('handleEvent('))
  assert.doesNotMatch(connected, /scrollHeight|offsetTop|clientHeight/); assert.match(s, /measure\(\)/)
})
