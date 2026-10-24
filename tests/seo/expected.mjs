export const BIO = '人生就像瑞士捲，有的人在瑞士，有的人在卷'
export const SEO_NAME = 'Kevin (ccy / zzy)'
export const HOME_TITLE = 'Kevin (ccy / zzy) 的部落格'
export const HOME_DESC = '人生就像瑞士捲，有的人在瑞士，有的人在卷。Kevin（ccy / zzy）的部落格：筆記、想法，和值得留下的東西。'
export const ABOUT_DESC = '人生就像瑞士捲，有的人在瑞士，有的人在卷。關於 Kevin（ccy / zzy）：這個部落格的由來，以及在 GitHub 與個人入口網站找到他的方式。'
export const ABOUT_INTRO = "I'm Kevin, also known as ccy and zzy."
export const BLOG_DESC = 'Kevin（ccy / zzy）部落格的全部文章，依發布時間由新到舊排列；每篇附摘要與標籤，也可以改用年份封存或標籤分類來瀏覽。'
export const ARCHIVES_DESC = '依年份整理 Kevin（ccy / zzy）部落格的全部文章，一眼看出每一年寫了哪些主題，適合從最早的文章開始按時間順序回顧。'
export const TAGS_DESC = 'Kevin（ccy / zzy）部落格的所有標籤與各標籤的文章數量，點選任一標籤即可找到同一主題的全部文章，方便依主題閱讀。'
export const tagDesc = (tag) => `Kevin（ccy / zzy）部落格中標記為「${tag}」的全部文章，依發布時間由新到舊排列，方便集中閱讀同一主題的筆記與心得。`
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
}

export const TITLE_SUFFIX = ` | ${SEO_NAME}`
export const TITLES = {
  '/': HOME_TITLE, '/blog': `Blog${TITLE_SUFFIX}`, '/archives': `Archives${TITLE_SUFFIX}`, '/tags': `Tags${TITLE_SUFFIX}`,
  '/tags/markdown': `Tag: markdown${TITLE_SUFFIX}`, '/tags/寫作': `Tag: 寫作${TITLE_SUFFIX}`, '/search': `Search${TITLE_SUFFIX}`,
  '/about': `About${TITLE_SUFFIX}`, '/404': `Page not found${TITLE_SUFFIX}`, '/blog/markdown-syntax': `Markdown 語法指南${TITLE_SUFFIX}`
}
export const DESCRIPTIONS = {
  '/': HOME_DESC, '/about': ABOUT_DESC, '/blog': BLOG_DESC, '/archives': ARCHIVES_DESC, '/tags': TAGS_DESC,
  '/tags/寫作': tagDesc('寫作'), '/search': SEARCH_DESC, '/404': NOT_FOUND_DESC
}
