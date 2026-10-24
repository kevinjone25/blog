import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

test('test:seo never touches the network', async () => {
  const dir = new URL('./', import.meta.url)
  for (const f of (await readdir(dir)).filter((f) => f.endsWith('.mjs') && f !== 'offline.test.mjs')) {
    const src = await readFile(new URL(f, dir), 'utf8')
    assert.doesNotMatch(src, /\bfetch\s*\(|node:https?['"]|validator\.schema\.org|lighthouse/, f)
  }
})
