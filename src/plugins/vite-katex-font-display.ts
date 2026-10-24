// KaTeX ships `font-display:block`, which delays text rendering until fonts load.
// Rewrite it to `swap` at build time.
export default function katexFontDisplay() {
  return {
    name: 'katex-font-display',
    enforce: 'pre' as const,
    transform(code: string, id: string): string | undefined {
      if (!/[\\/]katex[\\/]dist[\\/]katex(\.min)?\.css(\?|$)/.test(id)) return undefined
      return code.replace(/font-display:\s*block/g, 'font-display:swap')
    }
  }
}
