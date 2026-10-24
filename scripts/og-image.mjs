import { writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { renderOgImage } from '../src/utils/og-image.mjs'

const { values } = parseArgs({
  options: {
    label: { type: 'string' },
    title: { type: 'string' },
    footer: { type: 'string' },
    out: { type: 'string' }
  }
})
const { label, title, footer, out } = values
if (label === undefined || title === undefined || footer === undefined || out === undefined) {
  console.error('Usage: node scripts/og-image.mjs --label <s> --title <s> --footer <s> --out <path>')
  process.exit(1)
}
await writeFile(out, await renderOgImage({ label, title, footer }))
console.log(`Wrote ${out}`)
