import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, stripTags } from './helpers.mjs'

test('article names Markdown in its first heading and mentions LaTeX syntax', async () => {
  const h = await readPage('/blog/markdown-syntax')
  const h2 = [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(([, x]) => stripTags(x).replace(/#$/, '').trim())
  assert.ok(h2.includes('Markdown 基本語法')); assert.ok(!h2.includes('基本語法'))
  assert.ok(stripTags(h).includes('公式本身用 LaTeX 語法來寫'))
})
