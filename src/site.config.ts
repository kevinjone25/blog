import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'
import { DEFAULT_LANGUAGE } from './utils/lang.mjs'

export const BIO = '人生就像瑞士捲，有的人在瑞士，有的人在卷'
export const SEO_NAME = 'Kevin (ccy / zzy)'
export const HOME_TITLE = 'Kevin (ccy / zzy) 的部落格'
export const HOME_DESC = '人生就像瑞士捲，有的人在瑞士，有的人在卷。Kevin（ccy / zzy）的部落格：筆記、想法，和值得留下的東西。'
export const ABOUT_DESC = '人生就像瑞士捲，有的人在瑞士，有的人在卷。關於 Kevin（ccy / zzy）：這個部落格的由來，以及在 GitHub 與個人入口網站找到他的方式。'
export const ABOUT_INTRO = "I'm Kevin, also known as ccy and zzy."
export const BLOG_DESC = 'Kevin（ccy / zzy）部落格的全部文章，依發布時間由新到舊排列；每篇附摘要與標籤，也可以改用年份封存或標籤分類來瀏覽。'
export const ARCHIVES_DESC = '依年份整理 Kevin（ccy / zzy）部落格的全部文章，一眼看出每一年寫了哪些主題，適合從最早的文章開始按時間順序回顧。'
export const TAGS_DESC = 'Kevin（ccy / zzy）部落格的所有標籤與各標籤的文章數量，點選任一標籤即可找到同一主題的全部文章，方便依主題閱讀。'
export const tagDesc = (tag: string): string =>
  `Kevin（ccy / zzy）部落格中標記為「${tag}」的全部文章，依發布時間由新到舊排列，方便集中閱讀同一主題的筆記與心得。`
export const SEARCH_DESC = '搜尋 Kevin（ccy / zzy）部落格的全部文章：輸入關鍵字、主題或標籤，就能在瀏覽器內即時找到相關段落，不需要登入或連線到第三方服務。'
export const NOT_FOUND_DESC = '找不到這個頁面：網址可能已經變更或輸入有誤。可以回到 Kevin（ccy / zzy）的部落格首頁，或從文章列表與標籤重新找起。'
export const PERSON = {
  '@type': 'Person',
  '@id': 'https://zzy.tw/#person',
  name: 'Kevin',
  alternateName: ['ccy', 'zzy'],
  description: BIO,
  url: 'https://zzy.tw/',
  sameAs: ['https://github.com/kevinjone25', 'https://blog.zzy.tw/']
} as const

// Modified from Astro Theme Pure for zzy's static, comment-free blog.
export const theme: ThemeUserConfig = {
  title: 'zzy / Blog',
  author: 'zzy',
  description: 'Notes, stories and small discoveries.',
  favicon: '/favicon.svg',
  socialCard: '/images/social-card.png',
  locale: {
    lang: DEFAULT_LANGUAGE.lang,
    attrs: DEFAULT_LANGUAGE.ogLocale,
    dateLocale: 'en-US',
    dateOptions: { day: 'numeric', month: 'short', year: 'numeric' }
  },
  logo: { src: '/images/avatar.svg', alt: 'zzy' },
  titleDelimiter: '|',
  prerender: true,
  head: [],
  customCss: [],
  header: {
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Archive', link: '/archives' },
      { title: 'Tags', link: '/tags' },
      { title: 'About', link: '/about' }
    ]
  },
  footer: {
    year: `© ${new Date().getFullYear()} `,
    links: [],
    credits: true,
    social: [
      { icon: 'github', label: 'GitHub', href: 'https://github.com/kevinjone25' },
      { icon: 'rss', label: 'RSS', href: '/rss.xml' }
    ]
  },
  content: {
    externalLinks: { content: '', properties: { rel: 'noopener noreferrer' } },
    blogPageSize: 8,
    share: []
  }
}

export const integ: IntegrationUserConfig = {
  links: { logbook: [], applyTip: [], cacheAvatar: false },
  pagefind: true,
  typography: {
    class: 'prose text-base',
    blockquoteStyle: 'italic',
    inlineCodeBlockStyle: 'modern'
  },
  mediumZoom: {
    enable: true,
    selector: '.prose .zoomable',
    options: { className: 'zoomable' }
  }
}

export default { ...theme, integ } satisfies Config
