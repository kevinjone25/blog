import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import satori from 'satori'
import sharp from 'sharp'

const require = createRequire(import.meta.url)

let fontsPromise
const loadFonts = () =>
  (fontsPromise ??= Promise.all([
    ['@expo-google-fonts/noto-sans-tc/400Regular/NotoSansTC_400Regular.ttf', 400],
    ['@expo-google-fonts/noto-sans-tc/700Bold/NotoSansTC_700Bold.ttf', 700]
  ].map(async ([id, weight]) => ({
    name: 'Noto Sans TC',
    data: await readFile(require.resolve(id)),
    weight,
    style: 'normal'
  }))))

const box = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } })

export async function renderOgImage({ label, title, footer }) {
  const element = box(
    {
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
      height: '100%',
      background: '#ffffff',
      color: '#0a0a0a',
      padding: '72px 88px',
      borderTop: '16px solid #0a0a0a',
      fontFamily: 'Noto Sans TC'
    },
    [
      box({ fontSize: 28, fontWeight: 400, color: '#525252' }, label),
      box({ fontSize: [...title].length <= 24 ? 72 : 56, fontWeight: 700, lineHeight: 1.25 }, title),
      box({ fontSize: 32, fontWeight: 400, borderTop: '2px solid #0a0a0a', paddingTop: 24 }, footer)
    ]
  )
  const svg = await satori(element, { width: 1200, height: 630, fonts: await loadFonts() })
  return sharp(Buffer.from(svg)).png().toBuffer()
}
