#!/usr/bin/env node
// Validates the JSON-LD of each HTML file or URL with the schema.org validator.
//   node scripts/validate-jsonld.mjs <html-file-or-url>...
import { readFile } from 'node:fs/promises'

const targets = process.argv.slice(2)
if (targets.length === 0) { console.error('usage: validate-jsonld.mjs <html-file-or-url>...'); process.exit(2) }
let bad = 0
for (const target of targets) {
  try {
    const html = /^https?:\/\//.test(target) ? await (await fetch(target)).text() : await readFile(target, 'utf8')
    const res = await fetch('https://validator.schema.org/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ html })
    })
    if (!res.ok) throw new Error(`validator HTTP ${res.status}`)
    const text = (await res.text()).replace(/^\)\]\}'\s*\n?/, '')
    const data = JSON.parse(text)
    const objects = data.numObjects ?? 0
    const errors = data.totalNumErrors ?? 0
    const types = [...new Set((data.tripleGroups ?? []).map((g) => g.type).flat())]
    console.log(`${target} objects=${objects} errors=${errors} types=${types.join(',')}`)
    if (errors > 0 || objects === 0) bad++
  } catch (e) {
    bad++
    console.log(`${target} objects=0 errors=1 types= (${e.message})`)
  }
}
process.exit(bad ? 1 : 0)
