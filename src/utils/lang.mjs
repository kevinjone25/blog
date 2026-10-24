export const DEFAULT_LANGUAGE = { lang: 'zh-Hant-TW', ogLocale: 'zh_TW' }

const ZH = new Set(['中文', '繁體中文', '正體中文', 'zh', 'zh-tw', 'zh-hant', 'zh-hant-tw', 'chinese'])
const EN = new Set(['english', '英文', '英語', 'en', 'en-us', 'en-gb'])

export function resolveLanguage(language) {
  const key = String(language ?? '').trim().toLowerCase()
  if (EN.has(key)) return { lang: 'en', ogLocale: 'en_US' }
  if (ZH.has(key)) return { ...DEFAULT_LANGUAGE }
  return { ...DEFAULT_LANGUAGE }
}
