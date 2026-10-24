import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import sharp from 'sharp'

export function pngsToIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const dir = Buffer.alloc(16 * images.length)
  let offset = header.length + dir.length
  images.forEach(({ size, data }, i) => {
    const o = i * 16
    dir[o] = size >= 256 ? 0 : size
    dir[o + 1] = size >= 256 ? 0 : size
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(data.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += data.length
  })
  return Buffer.concat([header, dir, ...images.map((i) => i.data)])
}

const renderPng = (svg, size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()

async function main() {
  const { values } = parseArgs({
    options: { svg: { type: 'string' }, 'out-dir': { type: 'string' }, apple: { type: 'boolean' } }
  })
  const { svg, 'out-dir': outDir, apple } = values
  if (svg === undefined || outDir === undefined) {
    console.error('Usage: node scripts/make-icons.mjs --svg <path> --out-dir <dir> [--apple]')
    process.exit(1)
  }
  const source = await readFile(svg)
  const images = []
  for (const size of [16, 32, 48]) images.push({ size, data: await renderPng(source, size) })
  const ico = join(outDir, 'favicon.ico')
  await writeFile(ico, pngsToIco(images))
  console.log(`Wrote ${ico}`)
  if (apple) {
    const png = join(outDir, 'apple-touch-icon.png')
    await writeFile(png, await renderPng(source, 180))
    console.log(`Wrote ${png}`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
