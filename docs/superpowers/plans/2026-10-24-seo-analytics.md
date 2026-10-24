# SEO 強化與 Cloudflare Web Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 zzy.tw 與 blog.zzy.tw 在技術 SEO 上無可挑剔：兩站宣告同一個 Person、每頁 meta／JSON-LD／sitemap 完整正確、Lighthouse 達標，並為兩站開啟 Cloudflare Web Analytics。

**Architecture:** 部落格（Astro 靜態輸出）把文案與身分常數集中在 `src/site.config.ts`，由 `BaseHead` 依擴充後的 `PageMeta` 產生 title／meta／JSON-LD。每篇文章的 og:image 由建置期端點產生（satori 產生 SVG，sharp 轉 PNG）。離線測試用 `node:test` 對 `npm run build` 產出的 `dist/` 做斷言。portal 沒有建置步驟，改動直接寫進 `/Users/kevin/Desktop/github/blog/dist/`，圖檔用部落格的 CLI 產生一次。Cloudflare 變更透過 Cloudflare MCP（`mcp__plugin_cloudflare_cloudflare__execute`，`account_id` 帶 `dc6a1a24f6283359bb4fed063050d736`）呼叫 API，結果記在狀態檔。

**Tech Stack:** Astro 6.4.8、astro-pure 1.4.9（本地 `packages/pure`）、@astrojs/sitemap 3.7.2、satori 0.32.0、@expo-google-fonts/noto-sans-tc 0.4.4、sharp 0.34.5（既有）、`node:test`、headless Chrome＋`npx lighthouse@13`、Cloudflare API。

**Spec:** `docs/superpowers/specs/2026-10-24-seo-analytics-design.md`（下稱「設計」，§ 指它的節號）。改善前稽核：`/private/tmp/claude-501/-Users-kevin/14c9c9f1-5547-40d7-b4b8-831450b3c601/scratchpad/seo/AUDIT.md`（只供對照）。

**Execution:** Subagent-driven

## 路徑與名詞

- `BLOG` = `/Users/kevin/Desktop/github/blog/sites/blog`（git repo，branch `main`）。下文相對路徑都相對於 `BLOG`，除非寫明 `PORTAL/`。
- `PORTAL` = `/Users/kevin/Desktop/github/blog`（不是 git repo；網站原始碼在 `PORTAL/dist/`）。
- `STATE` = `BLOG/docs/superpowers/plans/2026-10-24-seo-analytics-state.md`。Task 8 建立，用來在 task 之間傳遞 Cloudflare 值與驗收結果，格式是一行一個 `KEY=value`。
- `$SCRATCH` = 執行者自己 session 的 scratchpad 目錄。
- `Z` = zone id `8b7d63f3cb2e701d340bc409da52342f`；`ACCOUNT` = `dc6a1a24f6283359bb4fed063050d736`；`WWW_RECORD` = DNS 記錄 id `ec5d0397d06d521d1fc35215cc6143ff`（2026-10-24 查證：`CNAME www.zzy.tw → zzy.tw`，proxied，ttl 1）。
- 「建置＋測試」= 在 `BLOG` 執行 `npm run build && npm run test:seo`。

## Copy（全計畫唯一的文案來源）

各 task 以下列 ID 引用，不得在別處另寫一份。部落格的 `src/site.config.ts`、`tests/seo/expected.mjs`，以及 portal 的測試常數，都用與 ID 同名的常數，值逐字照抄這裡。

- `BIO`：人生就像瑞士捲，有的人在瑞士，有的人在卷
- `SEO_NAME`（給搜尋引擎看的站名，半形括號）：Kevin (ccy / zzy)
- `HOME_TITLE`：Kevin (ccy / zzy) 的部落格
- 標題模板：`<頁名> | Kevin (ccy / zzy)`（測試常數 `TITLE_SUFFIX` = `' | '` 接 `SEO_NAME`）。
  - 頁名：`Blog`、`Archives`、`Tags`、`Tag: <tag>`、`Search`、`About`、`Page not found`；文章用文章標題。
  - 分頁第 n 頁（n>1）在頁名後加 ` · Page n`。
- `HOME_DESC`：人生就像瑞士捲，有的人在瑞士，有的人在卷。Kevin（ccy / zzy）的部落格：筆記、想法，和值得留下的東西。
- `ABOUT_DESC`：人生就像瑞士捲，有的人在瑞士，有的人在卷。關於 Kevin（ccy / zzy）：這個部落格的由來，以及在 GitHub 與個人入口網站找到他的方式。
- `ABOUT_INTRO`：I'm Kevin, also known as ccy and zzy.
- `BLOG_DESC`：Kevin（ccy / zzy）部落格的全部文章，依發布時間由新到舊排列；每篇附摘要與標籤，也可以改用年份封存或標籤分類來瀏覽。
- `ARCHIVES_DESC`：依年份整理 Kevin（ccy / zzy）部落格的全部文章，一眼看出每一年寫了哪些主題，適合從最早的文章開始按時間順序回顧。
- `TAGS_DESC`：Kevin（ccy / zzy）部落格的所有標籤與各標籤的文章數量，點選任一標籤即可找到同一主題的全部文章，方便依主題閱讀。
- `tagDesc(tag)`：Kevin（ccy / zzy）部落格中標記為「<tag>」的全部文章，依發布時間由新到舊排列，方便集中閱讀同一主題的筆記與心得。
- `SEARCH_DESC`：搜尋 Kevin（ccy / zzy）部落格的全部文章：輸入關鍵字、主題或標籤，就能在瀏覽器內即時找到相關段落，不需要登入或連線到第三方服務。
- `NOT_FOUND_DESC`：找不到這個頁面：網址可能已經變更或輸入有誤。可以回到 Kevin（ccy / zzy）的部落格首頁，或從文章列表與標籤重新找起。
- `postOgAlt(title)`：文章〈<title>〉的分享圖，作者 Kevin (ccy / zzy)
- `GENERIC_OG_ALT`：zzy / Blog：Notes, stories and small discoveries.
- `PORTAL_DESC`：人生就像瑞士捲，有的人在瑞士，有的人在卷。這裡是 Kevin（ccy / zzy）的個人入口，通往部落格與 GitHub。
- `PORTAL_OG_ALT`：Kevin (ccy / zzy)：人生就像瑞士捲，有的人在瑞士，有的人在卷
- `PORTAL_404_DESC`：找不到這個頁面：網址可能已經變更或輸入有誤。請回到 Kevin（ccy / zzy）的個人入口網站，或直接前往他的部落格與 GitHub。
- `PORTAL_404_COPY`（portal 404 頁的可見文字）：
  - eyebrow：`ERROR 404`
  - h1：`Page not found.`
  - 段落：`This page wandered off.`、換行、muted 的 `Try the portal or the blog.`
  - 連結一：`Back to the portal` → `https://zzy.tw/`
  - 連結二：`Visit the blog` → `https://blog.zzy.tw/`
  - footer：與 `PORTAL/dist/index.html:52` 的 `footer-left` 相同（`zzy.tw` / `A small corner of the internet.`），不含右側時鐘。
- `PERSON`（兩站逐字一致，不加 image、jobTitle）：`{"@type":"Person","@id":"https://zzy.tw/#person","name":"Kevin","alternateName":["ccy","zzy"],"description":"人生就像瑞士捲，有的人在瑞士，有的人在卷","url":"https://zzy.tw/","sameAs":["https://github.com/kevinjone25","https://blog.zzy.tw/"]}`

上列所有 description 的長度都在 57–75 字之間（以 `[...s].length` 計）。

## Global Constraints

- 給搜尋引擎看的站名一律是 `SEO_NAME`。頁面上看得到的站名（部落格頁首的 `zzy / Blog`、portal 的 zzy）不改；`theme.title`、`theme.author`、`theme.description` 也不改（§2、§6.1）。
- 每頁 meta description 長度 50–160；title 全站唯一，且含 `SEO_NAME`。
- 部落格預設 `lang="zh-Hant-TW"`、`og:locale=zh_TW`；文章依 frontmatter `language` 對應；介面上的英文標籤不翻譯；日期格式維持 `en-US`。portal 維持 `<html lang="en">`。
- canonical、sitemap、站內連結不帶結尾斜線，根路徑 `https://blog.zzy.tw/`、`https://zzy.tw/` 除外。
- preview 不被索引的做法：兩站 `_headers` 各有 `https://:worker.:sub.workers.dev/*` → `X-Robots-Tag: noindex` 這條規則。不改 build 指令、不改 deploy 指令、不加 CI 環境變數（§6.3）。
- 瀏覽器端唯一允許的第三方請求是 `https://static.cloudflareinsights.com/beacon.min.js`（以及它自己送出的 beacon）。不加任何瀏覽器端依賴、字型 CDN 或其他分析工具。
- 新增依賴只准：`satori@0.32.0`、`@expo-google-fonts/noto-sans-tc@0.4.4`（devDependencies，exact），以及 `@astrojs/sitemap@3.7.2`（dependencies，exact，原本就是 astro-pure 的相依）。HTML 解析不加依賴，沿用 `scripts/verify-static.mjs` 的 regex 屬性解析法。
- `npm run test:seo` 必須完全離線：測試只讀 `dist/`、暫存目錄與本機模組，不得有 `fetch`、`node:http`、`node:https` 或任何外部服務（Task 1 有測試把關）。需要網路的驗證（schema.org 驗證器、線上爬蟲、Lighthouse）只在 Task 14、15 的本機驗收執行。
- 測試只用 `node:test` 與 `node:assert/strict`，必須能在本機 Node 22.17 與 CI 的 Node 24 上跑：測試檔是 `.mjs`，只能 import `.mjs`，不能 import `.ts`。
- 不公開 Email。不碰 zone 內 `zzy.tw`、`www.zzy.tw`、`blog.zzy.tw` 以外的主機名。不改 HSTS、SSL、TLS 設定。
- 外觀不可退化：只准改文字與 meta（§3 反目標）。
- 部署規則：
  - Task 1–13 只 commit、不 push；push 只出現在 Task 14、15、16（§6.7-2 已授權）。
  - 部落格正式站由 Kevin 在 Actions 手動 dispatch。
  - portal 正式部署前必須停下來請示 Kevin。
- 會改變 Cloudflare 設定的 API 呼叫只准出現在 Task 8、13、16，且只限 §6.7 列出的變更；Workers 部署另依上一條部署規則。
- 只在 `BLOG` commit。訊息用英文祈使句，結尾附執行者 session 要求的 attribution 行。`PORTAL` 沒有 git，所以 Task 11 動任何 portal 檔之前要先備份。

## Review Focus

1. portal 的 404 頁會在任意多層路徑（例如 `/a/b/c`）被回傳，CSS 與圖示仍要正常載入，所以 `404.html` 只能用絕對路徑（`/style.css`）。測試在 Task 12 Step 1。
2. 文章超過 8 篇、出現分頁後，`/blog/2`、`/tags/x/2` 的 title 不可與第一頁重複。測試在 Task 1（`paginatedName`）。
3. frontmatter `language` 是 ` English `、`en`、空字串、`日本語` 等非預期值時，不可產生空的 `lang`，也不可讓建置失敗。測試在 Task 1（`resolveLanguage`）。
4. 文章標題或描述含 `</script>`、`<`、`&`、U+2028 時，JSON-LD 不可跳出 `<script>`，也必須仍是合法 JSON。測試在 Task 3（`serializeJsonLd`）。
5. 標題達 schema 上限 60 字，或標籤需要百分比編碼（`寫作`、`c++`）時，og:image 仍是 1200×630，sitemap 的 lastmod 仍對得上。測試在 Task 2（60 字）、Task 4（編碼標籤）。

---

### Task 1: 測試基礎、身分常數、標題、描述與語言

**Files:**
- Create: `tests/seo/helpers.mjs`、`tests/seo/expected.mjs`、`tests/seo/meta.test.mjs`、`tests/seo/offline.test.mjs`、`src/utils/lang.mjs`、`src/utils/page-title.mjs`、`src/types/index.ts`
- Modify: `package.json`（scripts）、`src/site.config.ts:5-18`、`src/components/BaseHead.astro:7-14,22,41-55,69-72`、`src/layouts/BaseLayout.astro:3,12-26`、`src/layouts/ContentLayout.astro:3,9-13`、`src/layouts/CommonPage.astro:5-9`、`src/layouts/BlogPost.astro:16-23`、`src/pages/index.astro:11`、`src/pages/about/index.astro:11-13`、`src/pages/blog/[...page].astro:31`、`src/pages/archives/index.astro:14-17`、`src/pages/tags/index.astro:11-14`、`src/pages/tags/[tag]/[...page].astro:34-37`、`src/pages/search/index.astro:9`、`src/pages/404.astro:5-8`

**Interfaces:**
- Consumes: 無。
- Produces:
  - `tests/seo/helpers.mjs`：
    - `DIST: string`（`BLOG/dist` 的絕對路徑）
    - `readPage(route): Promise<string>`：`'/'` 對 `index.html`；`'/about'` 對 `about/index.html`，找不到再試 `about.html`；`'/404'` 對 `404.html`。
    - `htmlRoutes(): Promise<string[]>`：所有 HTML 轉成 route，排除 `_astro/` 與 `pagefind/`。
    - `distFiles(): Promise<string[]>`（相對路徑）、`readDist(rel): Promise<string>`（UTF-8）
    - `decode(s)`
    - `attrs(tag): Record<string,string>`：沒有值的布林屬性（例如 `defer`）也記成 key，值為 `''`。
    - `title(html)`
    - `meta(html, key): string | undefined`：比對 `name` 或 `property`，回傳解碼後的 `content`。`metaAll(html, key): string[]`。
    - `links(html, rel): Record<string,string>[]`：`rel` 以空白切成 token 後包含指定值的 `<link>`。
    - `htmlLang(html)`
    - `scripts(html): {attrs, body}[]`
    - `jsonLdGraph(html): Record<string, unknown>[]`：把所有 `application/ld+json` 的 `@graph` 節點攤平；JSON 不合法時 throw。
    - `stripTags(html)`：先整段移除 `<script>` 與 `<style>` 元素，再把其餘標籤換成空字串、解碼 entity、把連續空白壓成一個並 trim。
    - `pngSize(buf): {width, height}`：讀 IHDR。
  - `tests/seo/expected.mjs`：Copy 中部落格用到的 ID（`BIO`、`SEO_NAME`、`HOME_TITLE`、`HOME_DESC`、`ABOUT_DESC`、`ABOUT_INTRO`、`BLOG_DESC`、`ARCHIVES_DESC`、`TAGS_DESC`、`tagDesc`、`SEARCH_DESC`、`NOT_FOUND_DESC`、`PERSON`），再加上衍生的 `TITLE_SUFFIX`、`TITLES`、`DESCRIPTIONS`（Step 1）。後續 task 會再加 export。
  - `src/site.config.ts` 新 export：`BIO`、`SEO_NAME`、`HOME_TITLE`、`HOME_DESC`、`ABOUT_DESC`、`ABOUT_INTRO`、`BLOG_DESC`、`ARCHIVES_DESC`、`TAGS_DESC`、`tagDesc(tag: string): string`、`SEARCH_DESC`、`NOT_FOUND_DESC`、`PERSON`（`as const`）。值全部取自 Copy。
  - `src/utils/lang.mjs`：`DEFAULT_LANGUAGE = { lang: 'zh-Hant-TW', ogLocale: 'zh_TW' }`；`resolveLanguage(language?: string): { lang: string, ogLocale: string }`。
  - `src/utils/page-title.mjs`：`paginatedName(name: string, currentPage?: number): string`。
  - `src/types/index.ts`：`export interface PageMeta extends SiteMeta { description: string; documentTitle?: string; lang?: string; ogLocale?: string }`（Task 2、3、4 會再擴充）。
  - `BaseLayout`、`ContentLayout` 的 prop 改成 `meta: PageMeta`。`CommonPage` 的 props 是 `{ title: string; description: string; headings?: MarkdownHeading[] }`。
  - npm script：`"test:seo": "node --test 'tests/seo/*.test.mjs'"`（執行前要先 `npm run build`）。

- [ ] **Step 1: 寫 `tests/seo/helpers.mjs` 與 `tests/seo/expected.mjs`**

`helpers.mjs` 照 Interfaces 的簽章實作，屬性解析照抄 `scripts/verify-static.mjs:35-41` 的寫法，再補上布林屬性。

`expected.mjs` 先 export Interfaces 列出的 Copy ID（值逐字照抄 Copy），再加入以下衍生常數：

```js
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
```

- [ ] **Step 2: 寫失敗測試 `tests/seo/meta.test.mjs` 與 `tests/seo/offline.test.mjs`**

```js
// tests/seo/meta.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, htmlRoutes, title, meta, htmlLang, stripTags, links } from './helpers.mjs'
import { SEO_NAME, HOME_TITLE, TITLE_SUFFIX, BIO, ABOUT_INTRO, TITLES, DESCRIPTIONS } from './expected.mjs'
import { resolveLanguage } from '../../src/utils/lang.mjs'
import { paginatedName } from '../../src/utils/page-title.mjs'

test('titles follow the templates', async () => {
  for (const [route, expected] of Object.entries(TITLES)) assert.equal(title(await readPage(route)), expected, route)
})
test('every title is unique and carries SEO_NAME', async () => {
  const titles = await Promise.all((await htmlRoutes()).map(async (r) => title(await readPage(r))))
  assert.equal(new Set(titles).size, titles.length)
  for (const t of titles) assert.ok(t.includes(SEO_NAME), t)
})
test('descriptions match Copy and stay within 50–160 characters', async () => {
  for (const [route, expected] of Object.entries(DESCRIPTIONS)) assert.equal(meta(await readPage(route), 'description'), expected, route)
  for (const r of await htmlRoutes()) {
    const n = [...(meta(await readPage(r), 'description') ?? '')].length
    assert.ok(n >= 50 && n <= 160, `${r}: ${n}`)
  }
})
test('lang, og:locale, og:site_name and author on every page', async () => {
  for (const r of await htmlRoutes()) {
    const h = await readPage(r)
    assert.equal(htmlLang(h), 'zh-Hant-TW', r); assert.equal(meta(h, 'og:locale'), 'zh_TW', r)
    assert.equal(meta(h, 'og:site_name'), SEO_NAME, r); assert.equal(meta(h, 'author'), SEO_NAME, r)
  }
})
test('og:title uses the document title except on articles', async () => {
  assert.equal(meta(await readPage('/'), 'og:title'), HOME_TITLE)
  assert.equal(meta(await readPage('/about'), 'og:title'), `About${TITLE_SUFFIX}`)
  assert.equal(meta(await readPage('/blog/markdown-syntax'), 'og:title'), 'Markdown 語法指南')
})
test('visual site name is unchanged; /about opens with the intro and bio and keeps its sections', async () => {
  assert.match(await readPage('/'), />zzy \/ Blog</)
  const about = stripTags(await readPage('/about'))
  for (const s of [ABOUT_INTRO, `${BIO}。`, 'This is a place for notes, ideas and things worth keeping.', 'For everything else, visit my portal', 'You can follow new writing through the RSS feed.']) assert.ok(about.includes(s), s)
  assert.ok(!about.includes("I'm zzy."))
})
test('canonicals and internal links have no trailing slash', async () => {
  for (const r of await htmlRoutes()) {
    const h = await readPage(r), canonical = links(h, 'canonical')[0].href
    assert.ok(canonical === 'https://blog.zzy.tw/' || !canonical.endsWith('/'), canonical)
    for (const [, href] of h.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
      if (href.startsWith('/') && href.length > 1) assert.ok(!href.endsWith('/'), `${r}: ${href}`)
      if (href.startsWith('https://blog.zzy.tw/') && href !== 'https://blog.zzy.tw/') assert.ok(!href.endsWith('/'), `${r}: ${href}`)
    }
  }
})
test('resolveLanguage maps frontmatter language and falls back safely', () => {
  const zh = { lang: 'zh-Hant-TW', ogLocale: 'zh_TW' }, en = { lang: 'en', ogLocale: 'en_US' }
  for (const v of [undefined, '', '中文', '繁體中文', 'zh-TW', '日本語']) assert.deepEqual(resolveLanguage(v), zh, String(v))
  for (const v of [' English ', 'english', 'en', 'EN-us', '英文']) assert.deepEqual(resolveLanguage(v), en, v)
})
test('paginatedName keeps paginated titles unique', () => {
  assert.equal(paginatedName('Blog'), 'Blog'); assert.equal(paginatedName('Blog', 1), 'Blog')
  assert.equal(paginatedName('Blog', 2), 'Blog · Page 2')
})
```

```js
// tests/seo/offline.test.mjs
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
```

- [ ] **Step 3: 加 npm script 並確認測試失敗**

在 `package.json` scripts 加 `"test:seo": "node --test 'tests/seo/*.test.mjs'"`。
Run: `npm run build && npm run test:seo`
Expected: build 通過；`meta.test.mjs` FAIL，原因是 `ERR_MODULE_NOT_FOUND`（找不到 `src/utils/lang.mjs`）；`offline.test.mjs` PASS。

- [ ] **Step 4: 實作 `src/utils/lang.mjs` 與 `src/utils/page-title.mjs`**

- `resolveLanguage`：先把值 `trim().toLowerCase()`。
  - `中文`、`繁體中文`、`正體中文`、`zh`、`zh-tw`、`zh-hant`、`zh-hant-tw`、`chinese` → `{lang:'zh-Hant-TW', ogLocale:'zh_TW'}`。
  - `english`、`英文`、`英語`、`en`、`en-us`、`en-gb` → `{lang:'en', ogLocale:'en_US'}`。
  - 其他值（含空字串、undefined）→ `DEFAULT_LANGUAGE` 的複本。
- `paginatedName`：只有 `currentPage > 1` 時回傳 `` `${name} · Page ${currentPage}` ``，否則回傳 `name`。

- [ ] **Step 5: 改 `src/site.config.ts`、`src/types/index.ts`、`BaseHead`、`BaseLayout`、`ContentLayout`、`CommonPage`**

- `site.config.ts`：
  - 新增 Interfaces 列的 export，值照 Copy。
  - `theme.locale` 改成 `lang: DEFAULT_LANGUAGE.lang`、`attrs: DEFAULT_LANGUAGE.ogLocale`（從 `./utils/lang.mjs` import），`dateLocale` 與 `dateOptions` 不動。
  - `titleDelimiter` 改成 `'|'`。
- `BaseHead.astro`：
  - Props 型別改用 `PageMeta`。
  - 新增 `const fullTitle = documentTitle ?? \`${title} ${config.titleDelimiter} ${SEO_NAME}\``，`<title>` 與 `meta[name=title]` 都用 `fullTitle`。
  - `meta[name=author]`、`og:site_name` 改為 `SEO_NAME`。
  - `og:title`、`twitter:title` 改為 `articleDate ? title : fullTitle`。
  - `og:locale` 改為 `ogLocale ?? config.locale.attrs`。
- `BaseLayout.astro`：
  - 改成 `meta: PageMeta`，拿掉 `description = config.description` 這個預設值。
  - 把整個 meta 傳給 `BaseHead`。
  - `<html lang={meta.lang ?? config.locale.lang}>`。
- `ContentLayout.astro`：prop 型別改為 `PageMeta`。
- `CommonPage.astro`：接收 `description`，傳 `meta={{ title, description }}`。

- [ ] **Step 6: 改各頁的 meta 與 /about 內文**

- `index.astro`：`meta={{ title: 'Home', documentTitle: HOME_TITLE, description: HOME_DESC }}`。
- `about/index.astro`：
  - 改成 `<PageLayout title='About' description={ABOUT_DESC} {headings}>`。
  - 第 13 行的 `<p>I'm zzy. This is a place …</p>` 換成三段：`<p>{ABOUT_INTRO}</p>`、`<p>{BIO}。</p>`、`<p>This is a place for notes, ideas and things worth keeping.</p>`。
  - 其餘兩節（Elsewhere、Follow）不動。
- `blog/[...page].astro`：`title: paginatedName('Blog', page?.currentPage)`，`description: BLOG_DESC`。
- 其他頁：
  - `archives`：`title: 'Archives'`、`ARCHIVES_DESC`
  - `tags/index`：`title: 'Tags'`、`TAGS_DESC`
  - `search`：`title: 'Search'`、`SEARCH_DESC`
  - `404`：`title: 'Page not found'`、`NOT_FOUND_DESC`
- `tags/[tag]/[...page].astro`：`title: paginatedName(\`Tag: ${tag}\`, page.currentPage)`，`description: tagDesc(tag)`。
- `BlogPost.astro`：`const { lang, ogLocale } = resolveLanguage(data.language)`，並放進傳給 `PageLayout` 的 meta。

- [ ] **Step 7: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: build 輸出 `Static verification passed`；test 輸出 `# fail 0`。

- [ ] **Step 8: Commit**

```bash
git add package.json tests/seo src/utils src/types src/site.config.ts src/components/BaseHead.astro src/layouts src/pages
git commit -m "Add SEO test harness, search-facing titles, descriptions and zh-Hant-TW language"
```

---

### Task 2: 每篇文章的 og:image 與 article meta

**Files:**
- Create: `src/utils/og-image.mjs`、`src/pages/og/[...id].png.ts`、`scripts/og-image.mjs`、`tests/seo/og.test.mjs`
- Modify: `package.json`、`package-lock.json`、`src/types/index.ts`、`src/site.config.ts`、`src/components/BaseHead.astro:13,56-73`、`src/layouts/BlogPost.astro:17-23`、`tests/seo/expected.mjs`

**Interfaces:**
- Consumes: Task 1 的 `PageMeta`、`SEO_NAME`、`resolveLanguage`；helpers 的 `readPage`、`meta`、`metaAll`、`distFiles`、`pngSize`、`DIST`。
- Produces:
  - `src/utils/og-image.mjs`：`renderOgImage({ label: string, title: string, footer: string }): Promise<Buffer>`，回傳 1200×630 PNG。
  - 文章 og:image 網址固定為 `https://blog.zzy.tw/og/<post.id>.png`（Task 3 的 BlogPosting `image` 會用）。
  - CLI：`node scripts/og-image.mjs --label <s> --title <s> --footer <s> --out <path>`，成功時剛好印一行 `Wrote <out>`（Task 12 用它產生 portal 圖）。
  - `PageMeta` 新增 `ogImageAlt?: string; modifiedDate?: string; tags?: string[]`。
  - `BlogPost.astro` 宣告 `const modifiedDate = (data.updatedDate ?? publishDate).toISOString()`（Task 3 會用到）。
  - `site.config.ts` 與 `expected.mjs` 新增 Copy 的 `postOgAlt(title)`、`GENERIC_OG_ALT`。

- [ ] **Step 1: 在 `expected.mjs` 加入 `postOgAlt`、`GENERIC_OG_ALT`，然後寫失敗測試 `tests/seo/og.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DIST, readPage, meta, metaAll, distFiles, pngSize } from './helpers.mjs'
import { BIO, SEO_NAME, postOgAlt, GENERIC_OG_ALT } from './expected.mjs'
import { renderOgImage } from '../../src/utils/og-image.mjs'

const POST_OG = 'https://blog.zzy.tw/og/markdown-syntax.png'
test('each post gets a generated 1200×630 PNG', async () => {
  assert.deepEqual(pngSize(await readFile(join(DIST, 'og/markdown-syntax.png'))), { width: 1200, height: 630 })
})
test('post pages carry og/twitter image, alt text and article meta', async () => {
  const h = await readPage('/blog/markdown-syntax'), alt = postOgAlt('Markdown 語法指南')
  assert.equal(meta(h, 'og:image'), POST_OG); assert.equal(meta(h, 'twitter:image'), POST_OG)
  assert.equal(meta(h, 'og:image:alt'), alt); assert.equal(meta(h, 'twitter:image:alt'), alt)
  assert.equal(meta(h, 'article:published_time'), '2026-10-24T02:00:00.000Z')
  assert.equal(meta(h, 'article:modified_time'), '2026-10-24T02:00:00.000Z')
  assert.deepEqual(metaAll(h, 'article:tag'), ['markdown', '寫作'])
  assert.equal(meta(h, 'article:author'), SEO_NAME)
})
test('other pages keep the generic social card', async () => {
  for (const r of ['/', '/blog', '/about', '/search']) {
    const h = await readPage(r)
    assert.equal(meta(h, 'og:image'), 'https://blog.zzy.tw/images/social-card.png', r)
    assert.equal(meta(h, 'og:image:alt'), GENERIC_OG_ALT, r)
    assert.equal(meta(h, 'article:published_time'), undefined, r)
  }
})
test('the CJK font is build-time only', async () => {
  assert.ok(!(await distFiles()).some((f) => /\.(ttf|otf)$/i.test(f) && /noto/i.test(f)))
})
test('renderOgImage handles a 60-character title', async () => {
  const png = await renderOgImage({ label: 'blog.zzy.tw', title: '長'.repeat(60), footer: SEO_NAME })
  assert.deepEqual(pngSize(png), { width: 1200, height: 630 })
})
test('og-image CLI writes a PNG and prints one line', async () => {
  const out = join(await mkdtemp(join(tmpdir(), 'og-')), 'og.png')
  const stdout = execFileSync('node', ['scripts/og-image.mjs', '--label', 'zzy.tw', '--title', SEO_NAME, '--footer', BIO, '--out', out], { encoding: 'utf8' })
  assert.equal(stdout, `Wrote ${out}\n`); assert.deepEqual(pngSize(await readFile(out)), { width: 1200, height: 630 })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: `og.test.mjs` FAIL，原因是 `ERR_MODULE_NOT_FOUND`（找不到 `src/utils/og-image.mjs`）。

- [ ] **Step 3: 安裝建置期依賴**

Run: `npm install --save-dev --save-exact satori@0.32.0 @expo-google-fonts/noto-sans-tc@0.4.4`
Expected: devDependencies 出現 `"satori": "0.32.0"` 與 `"@expo-google-fonts/noto-sans-tc": "0.4.4"`。

選 0.32.0 的理由：0.33 之後的版本相依 fflate 0.7.3，有 moderate 安全公告；0.32.0 發佈於 2026-08-20，已在本機實測可正確渲染中文。

- [ ] **Step 4: 實作 `src/utils/og-image.mjs`**

- 字型：用 `createRequire(import.meta.url).resolve()` 載入 `@expo-google-fonts/noto-sans-tc/400Regular/NotoSansTC_400Regular.ttf` 與 `@expo-google-fonts/noto-sans-tc/700Bold/NotoSansTC_700Bold.ttf`，用模組層級的 Promise 快取，兩者都註冊為 `name: 'Noto Sans TC'`。
- 流程：`satori(element, { width: 1200, height: 630, fonts })` 產生 SVG，再 `sharp(Buffer.from(svg)).png().toBuffer()` 轉 PNG。
- 版面（黑白）：
  - 外框：flex column、`justifyContent: 'space-between'`、背景 `#ffffff`、文字 `#0a0a0a`、`padding: '72px 88px'`、`borderTop: '16px solid #0a0a0a'`。
  - `label`：28px、400、`#525252`。
  - `title`：700、`lineHeight: 1.25`；`[...title].length <= 24` 時 72px，否則 56px。
  - `footer`：32px、400，加 `borderTop: '2px solid #0a0a0a'` 與 `paddingTop: 24`。
  - 每個節點都要設 `display: 'flex'`（satori 的要求）。

- [ ] **Step 5: 實作端點、CLI、`BaseHead` 與 `BlogPost`**

- `src/pages/og/[...id].png.ts`：
  - `getStaticPaths` 走 `getBlogCollection()`，每篇回傳 `{ params: { id: post.id }, props: { title: post.data.title } }`。
  - `GET` 回傳 `new Response(new Uint8Array(await renderOgImage({ label: 'blog.zzy.tw', title, footer: SEO_NAME })), { headers: { 'Content-Type': 'image/png' } })`。
  - import 路徑寫 `@/utils/og-image.mjs`。
- `scripts/og-image.mjs`：用 `node:util` 的 `parseArgs` 讀四個必填參數，缺任何一個就 exit 1；寫檔後只印 `Wrote <out>`。
- `BlogPost.astro`：
  - 宣告 Interfaces 中的 `modifiedDate`。
  - `ogImage` 一律為 `` `/og/${id}.png` ``，不再用 heroImage。
  - `ogImageAlt: postOgAlt(title)`、`modifiedDate`、`tags: data.tags` 放進 meta。
- `BaseHead.astro`：
  - `socialImageURL` 改用 `new URL(ogImage ?? config.socialCard, Astro.site)`。
  - 新增 `og:image:alt` 與 `twitter:image:alt`，值為 `ogImageAlt ?? GENERIC_OG_ALT`。
  - 文章額外輸出：`article:author` 改為 `SEO_NAME`；新增 `article:modified_time`；每個 tag 一個 `article:tag`。

- [ ] **Step 6: 確認測試通過，並目視檢查圖片**

Run: `npm run build && npm run test:seo`
Expected: `# fail 0`。

接著用 Read 工具打開 `dist/og/markdown-syntax.png`：應看到 `blog.zzy.tw`、粗體「Markdown 語法指南」、分隔線與 `SEO_NAME`，中文不可以是方框（豆腐字）。

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/utils/og-image.mjs "src/pages/og/[...id].png.ts" scripts/og-image.mjs src/types/index.ts src/site.config.ts src/components/BaseHead.astro src/layouts/BlogPost.astro tests/seo/og.test.mjs tests/seo/expected.mjs
git commit -m "Generate per-post Open Graph images at build time"
```

---

### Task 3: JSON-LD（首頁 WebSite＋Blog、文章 BlogPosting＋BreadcrumbList、/about ProfilePage）

**Files:**
- Create: `src/utils/json-ld.mjs`、`src/utils/structured-data.ts`、`src/components/JsonLd.astro`、`tests/seo/jsonld.test.mjs`
- Modify: `src/types/index.ts`、`src/components/BaseHead.astro`（檔尾 generator 之前）、`src/layouts/CommonPage.astro`、`src/pages/index.astro`、`src/pages/about/index.astro`、`src/layouts/BlogPost.astro`

**Interfaces:**
- Consumes: `PERSON`、`SEO_NAME`、`HOME_TITLE`、`HOME_DESC`、`resolveLanguage`（Task 1）；og 網址格式與 `BlogPost.astro` 裡的 `modifiedDate`（Task 2）。
- Produces:
  - `src/utils/json-ld.mjs`：`serializeJsonLd(value: unknown): string`。先 `JSON.stringify`，再把字元 `<` 換成六個字元的 `\u003c`、`>` 換成 `\u003e`、`&` 換成 `\u0026`、U+2028 換成 `\u2028`、U+2029 換成 `\u2029`（都是反斜線 u 加四位十六進位碼的 JSON 跳脫序列）。
  - `src/utils/structured-data.ts`：
    - `type JsonLdGraph = { '@context': 'https://schema.org'; '@graph': Record<string, unknown>[] }`
    - `homeGraph(): JsonLdGraph`、`profilePageGraph(): JsonLdGraph`
    - `blogPostingGraph(input: { url: string; title: string; description: string; published: string; modified: string; image: string; lang: string; tags: string[] }): JsonLdGraph`；`tags` 為空時省略 `keywords`。
  - `PageMeta` 新增 `jsonLd?: JsonLdGraph`；`CommonPage` 新增 prop `jsonLd?: JsonLdGraph`。

- [ ] **Step 1: 寫失敗測試 `tests/seo/jsonld.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, htmlRoutes, jsonLdGraph, meta } from './helpers.mjs'
import { PERSON, SEO_NAME, HOME_TITLE, HOME_DESC, TITLE_SUFFIX } from './expected.mjs'
import { serializeJsonLd } from '../../src/utils/json-ld.mjs'

const ID = { '@id': 'https://zzy.tw/#person' }, U = 'https://blog.zzy.tw/blog/markdown-syntax'
const node = (h, type) => jsonLdGraph(h).find((n) => n['@type'] === type)
test('home: WebSite + Blog + Person', async () => {
  const h = await readPage('/')
  assert.deepEqual(node(h, 'Person'), PERSON)
  assert.deepEqual(node(h, 'WebSite'), { '@type': 'WebSite', '@id': 'https://blog.zzy.tw/#website', url: 'https://blog.zzy.tw/', name: SEO_NAME, inLanguage: 'zh-Hant-TW', publisher: ID })
  assert.deepEqual(node(h, 'Blog'), { '@type': 'Blog', '@id': 'https://blog.zzy.tw/#blog', url: 'https://blog.zzy.tw/', name: HOME_TITLE, description: HOME_DESC, inLanguage: 'zh-Hant-TW', author: ID, publisher: ID })
})
test('post: BlogPosting + BreadcrumbList + Person', async () => {
  const h = await readPage('/blog/markdown-syntax')
  assert.deepEqual(node(h, 'Person'), PERSON)
  assert.deepEqual(node(h, 'BlogPosting'), { '@type': 'BlogPosting', '@id': `${U}#article`, url: U, headline: 'Markdown 語法指南', description: meta(h, 'description'), datePublished: '2026-10-24T02:00:00.000Z', dateModified: '2026-10-24T02:00:00.000Z', image: 'https://blog.zzy.tw/og/markdown-syntax.png', inLanguage: 'zh-Hant-TW', keywords: ['markdown', '寫作'], mainEntityOfPage: { '@type': 'WebPage', '@id': U }, author: ID, publisher: ID })
  assert.deepEqual(node(h, 'BreadcrumbList'), { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: HOME_TITLE, item: 'https://blog.zzy.tw/' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://blog.zzy.tw/blog' },
    { '@type': 'ListItem', position: 3, name: 'Markdown 語法指南', item: U } ] })
})
test('/about: ProfilePage + Person', async () => {
  const h = await readPage('/about')
  assert.deepEqual(node(h, 'Person'), PERSON)
  assert.deepEqual(node(h, 'ProfilePage'), { '@type': 'ProfilePage', '@id': 'https://blog.zzy.tw/about#profile', url: 'https://blog.zzy.tw/about', name: `About${TITLE_SUFFIX}`, inLanguage: 'zh-Hant-TW', mainEntity: ID })
})
test('every ld+json block on every page parses', async () => {
  for (const r of await htmlRoutes()) { const h = await readPage(r); assert.doesNotThrow(() => jsonLdGraph(h), r) }
})
test('serializeJsonLd cannot break out of the script element', () => {
  const headline = '</script><img src=x onerror=alert(1)> & \u2028'
  const s = serializeJsonLd({ headline })
  assert.doesNotMatch(s, /[<>&\u2028\u2029]/); assert.equal(JSON.parse(s).headline, headline)
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: `jsonld.test.mjs` FAIL，原因是 `ERR_MODULE_NOT_FOUND`（找不到 `src/utils/json-ld.mjs`）。

- [ ] **Step 3: 實作 `json-ld.mjs`、`structured-data.ts`、`JsonLd.astro`**

- 三個 builder 產出的節點要與 Step 1 測試期望的物件完全相同，每個 graph 都包含完整的 `PERSON` 節點。
- `homeGraph` 的 WebSite 用 `SEO_NAME`，Blog 用 `HOME_TITLE`、`HOME_DESC`。
- `profilePageGraph` 的 `name` 是 `` `About ${config.titleDelimiter} ${SEO_NAME}` ``（`titleDelimiter` 在 Task 1 已改為 `'|'`）。
- `JsonLd.astro` 接收 prop `graph: JsonLdGraph`，輸出 `<script is:inline type='application/ld+json' set:html={serializeJsonLd(graph)} />`。

- [ ] **Step 4: 接到頁面**

- `BaseHead`：有 `jsonLd` 時輸出 `<JsonLd graph={jsonLd} />`。
- `index.astro`：meta 加 `jsonLd: homeGraph()`。
- `about/index.astro`：`<PageLayout … jsonLd={profilePageGraph()}>`；`CommonPage` 把 `jsonLd` 放進 meta。
- `BlogPost.astro`：`jsonLd: blogPostingGraph({ url: new URL(\`/blog/${id}\`, Astro.site).href, title, description, published: articleDate, modified: modifiedDate, image: new URL(\`/og/${id}.png\`, Astro.site).href, lang, tags: data.tags })`。
  - `articleDate` 是 `BlogPost.astro:19` 既有的 `publishDate.toISOString()`。
  - `modifiedDate` 是 Task 2 在同一檔宣告的 const。
  - `lang` 來自 Task 1 的 `resolveLanguage`。

- [ ] **Step 5: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: `# fail 0`。（schema.org 驗證器需要網路，所以放在 Task 14 做。）

- [ ] **Step 6: Commit**

```bash
git add src/utils/json-ld.mjs src/utils/structured-data.ts src/components/JsonLd.astro src/components/BaseHead.astro src/types/index.ts src/layouts src/pages/index.astro src/pages/about/index.astro tests/seo/jsonld.test.mjs
git commit -m "Add Person-linked JSON-LD for home, posts and about"
```

---

### Task 4: sitemap（lastmod、排除薄頁）、noindex、RSS

**Files:**
- Create: `src/utils/sitemap-lastmod.mjs`、`tests/seo/sitemap-rss.test.mjs`
- Modify: `package.json`、`package-lock.json`、`astro.config.ts:2-4,117-123`、`src/types/index.ts`、`src/components/BaseHead.astro`、`src/pages/search/index.astro:9`、`src/pages/404.astro`、`src/pages/rss.xml.ts`

**Interfaces:**
- Consumes: helpers 的 `readPage`、`readDist`、`meta`、`htmlRoutes`（Task 1）。
- Produces:
  - `src/utils/sitemap-lastmod.mjs`：
    - `readPostDates(contentDir: string): Promise<Array<{ id: string, modified: Date, tags: string[] }>>`
    - `createLastmodResolver(posts, site: string): (url: string) => string | undefined`
  - `PageMeta` 新增 `robots?: string`。

- [ ] **Step 1: 寫失敗測試 `tests/seo/sitemap-rss.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPage, readDist, meta, htmlRoutes } from './helpers.mjs'
import { readPostDates, createLastmodResolver } from '../../src/utils/sitemap-lastmod.mjs'

const S = 'https://blog.zzy.tw'
test('sitemap lists pages with lastmod and excludes /search and 404', async () => {
  const xml = await readDist('sitemap-0.xml')
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, u]) => ({ loc: u.match(/<loc>(.*?)<\/loc>/)[1], lastmod: u.match(/<lastmod>(.*?)<\/lastmod>/)?.[1] }))
  assert.deepEqual(urls.map((u) => u.loc).sort(), [S, `${S}/about`, `${S}/archives`, `${S}/blog`, `${S}/blog/markdown-syntax`, `${S}/tags`, `${S}/tags/%E5%AF%AB%E4%BD%9C`, `${S}/tags/markdown`].sort())
  for (const u of urls) assert.equal(u.lastmod, '2026-10-24T02:00:00.000Z', u.loc)
  const post = urls.find((u) => u.loc.endsWith('/blog/markdown-syntax'))
  assert.equal(post.lastmod, meta(await readPage('/blog/markdown-syntax'), 'article:modified_time'))
})
test('/search and 404 are noindex, follow; other pages carry no robots meta', async () => {
  for (const r of await htmlRoutes()) {
    const expected = ['/search', '/404'].includes(r) ? 'noindex, follow' : undefined
    assert.equal(meta(await readPage(r), 'robots'), expected, r)
  }
})
test('RSS channel declares language and lastBuildDate', async () => {
  const rss = await readDist('rss.xml')
  assert.match(rss, /<language>zh-TW<\/language>/); assert.match(rss, /<lastBuildDate>Sat, 24 Oct 2026 02:00:00 GMT<\/lastBuildDate>/)
})
test('lastmod resolver handles encoded tags, pagination and empty sites', () => {
  const posts = [{ id: 'a', modified: new Date('2026-01-01T00:00:00Z'), tags: ['寫作'] }, { id: 'b', modified: new Date('2026-02-01T00:00:00Z'), tags: ['c++'] }]
  const at = createLastmodResolver(posts, S)
  assert.equal(at(`${S}/blog/a`), '2026-01-01T00:00:00.000Z')
  assert.equal(at(`${S}/tags/%E5%AF%AB%E4%BD%9C`), '2026-01-01T00:00:00.000Z')
  assert.equal(at(`${S}/tags/c%2B%2B/2`), '2026-02-01T00:00:00.000Z')
  for (const u of [`${S}/`, `${S}/about`, `${S}/blog/2`]) assert.equal(at(u), '2026-02-01T00:00:00.000Z', u)
  assert.equal(createLastmodResolver([], S)(`${S}/about`), undefined)
})
test('readPostDates skips drafts, prefers updatedDate, normalizes ids and tags', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'posts-')); await mkdir(join(dir, 'Foo'))
  await writeFile(join(dir, 'Foo/index.md'), "---\ntitle: x\npublishDate: 2026-01-01\nupdatedDate: 2026-03-01\ntags: [' Markdown ', markdown, 寫作]\n---\nbody")
  await writeFile(join(dir, 'draft.md'), '---\ntitle: y\npublishDate: 2026-02-01\ndraft: true\n---\nbody')
  assert.deepEqual(await readPostDates(dir), [{ id: 'foo', modified: new Date('2026-03-01T00:00:00Z'), tags: ['markdown', '寫作'] }])
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: `sitemap-rss.test.mjs` FAIL，原因是 `ERR_MODULE_NOT_FOUND`（找不到 `src/utils/sitemap-lastmod.mjs`）。

- [ ] **Step 3: 實作 `src/utils/sitemap-lastmod.mjs`**

- `readPostDates`：
  - 遞迴讀取 `.md` 與 `.mdx` 檔，用 `@astrojs/markdown-remark` 的 `parseFrontmatter`（astro.config.ts 已經在用的套件）解析。
  - 跳過 `draft: true`。
  - `id`：有字串型的 `slug` 就用它；否則取相對路徑去副檔名、去掉結尾的 `/index`、轉小寫。
  - `modified = updatedDate ?? publishDate`。
  - tags 照 `src/content.config.ts:17` 正規化：trim、轉小寫、去重。
- `createLastmodResolver`：
  - pathname 以 `/` 切段，每段 `decodeURIComponent`，再去掉結尾斜線。
  - `/blog/<id>` 對到文章就回傳該篇的日期；`/tags/<tag>[/<n>]` 回傳該標籤所有文章中最新的日期；其他 URL（包含對不到文章的 `/blog/<x>`，例如分頁 `/blog/2`）回傳全部文章中最新的日期。
  - 沒有文章時回傳 `undefined`。
  - 回傳值一律用 `toISOString()`。

- [ ] **Step 4: 接上 sitemap、robots meta、RSS**

- 安裝：`npm install --save-exact @astrojs/sitemap@3.7.2`。
- `astro.config.ts`：
  - 用 top-level await 建立 `lastmodFor = createLastmodResolver(await readPostDates(fileURLToPath(new URL('./src/content/blog/', import.meta.url))), 'https://blog.zzy.tw')`。
  - 在 `integrations` 的 `AstroPureIntegration(config)` 之後加 `sitemap({ filter: (page) => !/^\/(search|404)(\/|$)/.test(new URL(page).pathname), serialize(item) { const lastmod = lastmodFor(item.url); if (lastmod) item.lastmod = lastmod; return item } })`。
  - astro-pure（`packages/pure/index.ts:41`）看到使用者已提供 sitemap，就不會再加預設的那個。這點與 top-level await 都已在 2026-10-24 實測可行。
- `BaseHead`：有 `robots` 時輸出 `<meta name='robots' content={robots} />`。
- `search/index.astro` 與 `404.astro` 的 meta 加 `robots: 'noindex, follow'`。
- `rss.xml.ts`：
  - 加 `customData`，值為 `<language>zh-TW</language>` 串上 `<lastBuildDate>${newest.toUTCString()}</lastBuildDate>`。
  - `newest` 是所有文章 `updatedDate ?? publishDate` 中最新的；沒有文章時只輸出 language。

- [ ] **Step 5: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: `# fail 0`；build log 的 `` [@astrojs/sitemap] `sitemap-index.xml` created at `dist` `` 只出現一次。

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json astro.config.ts src/utils/sitemap-lastmod.mjs src/types/index.ts src/components/BaseHead.astro src/pages/search/index.astro src/pages/404.astro src/pages/rss.xml.ts tests/seo/sitemap-rss.test.mjs
git commit -m "Add sitemap lastmod, exclude thin pages, noindex search and 404, enrich RSS"
```

---

### Task 5: 效能與無障礙（KaTeX font-display、forced reflow、checkbox 名稱、label-content-name-mismatch）

**Files:**
- Create: `src/plugins/vite-katex-font-display.ts`、`src/plugins/rehype-task-list-labels.ts`、`tests/seo/perf-a11y.test.mjs`
- Modify: `astro.config.ts:26,74`、`packages/pure/components/pages/BackToTop.astro:30-100`、`packages/pure/components/pages/Copyright.astro:27-30`、`src/pages/blog/[...page].astro:44`、`UPSTREAM.md:11-21`

**Interfaces:**
- Consumes: helpers 的 `readPage`、`distFiles`、`readDist`。
- Produces:
  - `src/plugins/vite-katex-font-display.ts`：`export default function katexFontDisplay(): { name: string; enforce: 'pre'; transform(code: string, id: string): string | undefined }`。
  - `src/plugins/rehype-task-list-labels.ts`：`export default function rehypeTaskListLabels(): (tree: Root) => void`（hast 型別，寫法比照 `src/plugins/rehype-auto-link-headings.ts`）。

- [ ] **Step 1: 寫失敗測試 `tests/seo/perf-a11y.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, distFiles, readDist } from './helpers.mjs'

test('every KaTeX @font-face uses font-display: swap', async () => {
  const blocks = []
  for (const f of (await distFiles()).filter((f) => /^_astro\/.*\.css$/.test(f))) blocks.push(...(await readDist(f)).match(/@font-face\{[^}]*KaTeX_[^}]*\}/g) ?? [])
  assert.ok(blocks.length >= 20)
  for (const b of blocks) { assert.match(b, /font-display:swap/); assert.doesNotMatch(b, /font-display:block/) }
})
test('task-list checkboxes are named after their item text', async () => {
  const h = await readPage('/blog/markdown-syntax')
  const names = [...h.matchAll(/<li class="task-list-item">\s*<input\b([^>]*)>/g)].map(([, a]) => a.match(/aria-label="([^"]*)"/)?.[1])
  assert.deepEqual(names, ['架好部落格', '寫第一篇文章', '持續寫下去'])
})
test('accessible names contain the visible labels', async () => {
  assert.doesNotMatch(await readPage('/blog/markdown-syntax'), /aria-label="Copy article link"/)
  assert.doesNotMatch(await readPage('/blog'), /aria-label="View all blog by years"/)
})
test('BackToTop reads no layout during connectedCallback', async () => {
  const s = (await readPage('/blog/markdown-syntax')).match(/class ScrollBtn[\s\S]*?customElements\.define/)[0]
  const connected = s.slice(s.indexOf('connectedCallback()'), s.indexOf('handleEvent('))
  assert.doesNotMatch(connected, /scrollHeight|offsetTop|clientHeight/); assert.match(s, /measure\(\)/)
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: 這四個測試都 FAIL；KaTeX 那個測試的訊息含 `font-display:block`。

- [ ] **Step 3: 實作兩個 plugin 並註冊**

- `katexFontDisplay`：當 `id` 符合 `/[\\/]katex[\\/]dist[\\/]katex(\.min)?\.css(\?|$)/` 時，回傳 `code.replace(/font-display:\s*block/g, 'font-display:swap')`。KaTeX 原檔自帶 `font-display:block`，只在前面補 swap 會被它覆蓋，已實測確認。
- `astro.config.ts`：在 `defineConfig` 加 `vite: { plugins: [katexFontDisplay()] }`。
- `rehypeTaskListLabels`：
  - 對 class 含 `task-list-item` 的 `li`，找它直接子層的 `input[type=checkbox]`，設 `properties.ariaLabel`。
  - 值取該 `li` 中除了巢狀 `ul`、`ol` 以外的文字，用 `hast-util-to-string` 取，再 trim、壓縮空白。
  - 在 `astro.config.ts:74` 的 `rehypePlugins` 陣列中，放在 `[rehypeKatex, {}]` 之後。

- [ ] **Step 4: 修 forced reflow 與名稱不符**

- `BackToTop.astro`：
  - 新增欄位 `measured = false`，以及方法 `measure()`。`measure()` 要放在 `connectedCallback()` 之前，因為 Step 1 的測試會檢查 `connectedCallback()` 到 `handleEvent(` 之間的文字。它讀取 `articleEl.scrollHeight`、`articleEl.offsetTop`、`document.documentElement.clientHeight`，讀完設 `measured = true`。
  - `connectedCallback` 內刪掉原本那三個同步讀取。
  - scroll listener 改成 `{ passive: true }`；rAF callback 內先 `if (!this.measured) this.measure()`，再 `this.updateScrollPercent()`。
  - 加 `window.addEventListener('resize', () => { this.measured = false }, { passive: true })`。
- `Copyright.astro`：刪除 `aria-label='Copy article link'`。
- `blog/[...page].astro:44`：刪除 `aria-label='View all blog by years'`。
- `UPSTREAM.md` 的本地調整清單加第 10 項：`10. BackToTop 改為捲動時才量測版面（避免 forced reflow）；文章「Copy link」按鈕與 /blog「View all posts by years」連結移除與可見文字不符的 aria-label；Markdown 待辦清單的 checkbox 以項目文字作為可及名稱；KaTeX 字型改用 font-display: swap。`

- [ ] **Step 5: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: `# fail 0`

- [ ] **Step 6: 本機 Lighthouse 驗證**

先在背景執行 `npm run preview`（會在 http://127.0.0.1:4321 提供服務），再跑：

```bash
for p in blog/markdown-syntax blog; do npx --yes lighthouse@13 "http://127.0.0.1:4321/$p" --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility --output=json --output-path="$SCRATCH/lh-${p//\//-}.json"; done
jq -r '.audits | to_entries[] | select(.key|test("^(font-display-insight|forced-reflow-insight|label|label-content-name-mismatch)$")) | "\(.key) \(.value.score) \(.value.scoreDisplayMode)"' "$SCRATCH"/lh-blog*.json
jq -r '.categories.accessibility.score' "$SCRATCH"/lh-blog*.json
```

Expected：
- 每行的 score 都是 `1`，或 mode 是 `notApplicable`。
- 兩個 accessibility 分數都是 `1`。

如果 `forced-reflow-insight` 仍失敗：不要自行嘗試其他修法。停下來回報 controller，附上該 audit 的 `details`（`jq '.audits["forced-reflow-insight"].details' <json>` 的輸出）與 JSON 檔路徑，然後結束這個 task 的實作步驟。不論結果如何，都要停掉背景的 preview。

- [ ] **Step 7: Commit**

```bash
git add src/plugins/vite-katex-font-display.ts src/plugins/rehype-task-list-labels.ts astro.config.ts packages/pure/components/pages/BackToTop.astro packages/pure/components/pages/Copyright.astro "src/pages/blog/[...page].astro" UPSTREAM.md tests/seo/perf-a11y.test.mjs
git commit -m "Fix KaTeX font-display, forced reflow and accessible names"
```

---

### Task 6: 部落格 `_headers`（快取與 workers.dev noindex）＋ CI 離線測試

**Files:**
- Create: `public/_headers`、`tests/seo/headers.test.mjs`
- Modify: `.github/workflows/deploy-cloudflare.yml`（在第 48–49 行的 `Build static site` step 之後插入一個 step）

**Interfaces:**
- Consumes: helpers 的 `readDist`。
- Produces: `dist/_headers`（由 `public/` 複製）；CI step `Test SEO output`。

- [ ] **Step 1: 寫失敗測試 `tests/seo/headers.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readDist } from './helpers.mjs'

test('_headers caches hashed assets and noindexes workers.dev hosts only', async () => {
  const h = await readDist('_headers')
  assert.ok(h.includes('/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n'))
  assert.ok(h.includes('https://:worker.:sub.workers.dev/*\n  X-Robots-Tag: noindex\n'))
  assert.doesNotMatch(h, /^\/\*\s*$/m)
})
test('CI runs the offline SEO tests right after building', async () => {
  const yml = await readFile(new URL('../../.github/workflows/deploy-cloudflare.yml', import.meta.url), 'utf8')
  const build = yml.indexOf('run: npm run build'), seo = yml.indexOf('- name: Test SEO output\n        run: npm run test:seo')
  assert.ok(build > 0 && seo > build)
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: `headers.test.mjs` 兩個測試都 FAIL（第一個是 `ENOENT … dist/_headers`）。

- [ ] **Step 3: 實作**

`public/_headers` 的內容如下。兩個區塊之間空一行，第二行起縮排兩格。HTML 不另設規則，維持 Cloudflare 預設的重新驗證。

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

https://:worker.:sub.workers.dev/*
  X-Robots-Tag: noindex
```

workflow 在 `Build static site` 之後插入下面這個 step，其他行一律不動：

```yaml
      - name: Test SEO output
        run: npm run test:seo
```

`package.json` 的 `build` 與 `deploy:preview` 不改。

- [ ] **Step 4: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: `# fail 0`。

- [ ] **Step 5: Commit**

```bash
git add public/_headers .github/workflows/deploy-cloudflare.yml tests/seo/headers.test.mjs
git commit -m "Cache hashed assets, noindex workers.dev hosts and run SEO tests in CI"
```

---

### Task 7: 部落格 favicon.ico 與 site.webmanifest

**Files:**
- Create: `scripts/make-icons.mjs`、`public/favicon.ico`（產生物）、`public/site.webmanifest`、`tests/seo/icons.test.mjs`
- Modify: `src/components/BaseHead.astro:24-27`

**Interfaces:**
- Consumes: helpers 的 `readDist`、`htmlRoutes`、`readPage`、`links`、`DIST`。
- Produces:
  - `scripts/make-icons.mjs` export `pngsToIco(images: Array<{ size: number, data: Buffer }>): Buffer`。
  - CLI：`node scripts/make-icons.mjs --svg <path> --out-dir <dir> [--apple]`。
    - 寫出 `favicon.ico`（16、32、48，每格存 PNG），印一行 `Wrote <dir>/favicon.ico`。
    - 加 `--apple` 時另外寫 `apple-touch-icon.png`（180×180），再印一行 `Wrote <dir>/apple-touch-icon.png`。
    - 不加 `--apple` 時共印 1 行，加了共印 2 行。（Task 12 會用到。）

- [ ] **Step 1: 寫失敗測試 `tests/seo/icons.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DIST, readDist, htmlRoutes, readPage, links } from './helpers.mjs'
import { pngsToIco } from '../../scripts/make-icons.mjs'

test('pngsToIco writes an ICO directory of PNG entries', () => {
  const ico = pngsToIco([{ size: 16, data: Buffer.from('a') }, { size: 32, data: Buffer.from('bb') }])
  assert.deepEqual([...ico.subarray(0, 6)], [0, 0, 1, 0, 2, 0])
  assert.equal(ico[6], 16); assert.equal(ico[22], 32); assert.equal(ico.readUInt32LE(18), 38)
})
test('dist/favicon.ico holds 16, 32 and 48 px images', async () => {
  const ico = await readFile(join(DIST, 'favicon.ico'))
  assert.equal(ico.readUInt16LE(4), 3); assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48])
})
test('web manifest', async () => {
  assert.deepEqual(JSON.parse(await readDist('site.webmanifest')), { name: 'zzy / Blog', short_name: 'zzy / Blog', lang: 'zh-Hant-TW', start_url: '/', display: 'browser', background_color: '#FCFCFD', theme_color: '#FCFCFD', icons: [{ src: '/images/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] })
})
test('every page links the ICO, SVG icon and manifest', async () => {
  for (const r of await htmlRoutes()) {
    const h = await readPage(r), icons = links(h, 'icon')
    assert.ok(icons.some((l) => l.href === '/favicon.ico' && l.sizes === '32x32'), r)
    assert.ok(icons.some((l) => l.href === '/favicon.svg'), r)
    assert.equal(links(h, 'manifest')[0]?.href, '/site.webmanifest', r)
  }
})
```

（manifest 的 `name` 是安裝後在裝置上顯示的視覺站名，所以用 `zzy / Blog`，不用 `SEO_NAME`。）

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: `icons.test.mjs` FAIL，原因是 `ERR_MODULE_NOT_FOUND`（找不到 `scripts/make-icons.mjs`）。

- [ ] **Step 3: 實作 `scripts/make-icons.mjs`，並產生 `public/favicon.ico`**

- ICO 格式：
  - 6 bytes 檔頭：`0, type=1, count`。
  - 每張圖一筆 16 bytes 目錄項：width、height（256 寫 0）、0、0、planes=1、bpp=32、資料長度、資料起點 offset。
  - 目錄之後依序放各張 PNG。
- PNG 用 `sharp(svg, { density: 384 }).resize(size, size).png()` 產生。

Run: `node scripts/make-icons.mjs --svg public/favicon.svg --out-dir public`
Expected: 只印一行 `Wrote public/favicon.ico`。

- [ ] **Step 4: 寫 `public/site.webmanifest`，改 `BaseHead`**

- `site.webmanifest`：內容等於 Step 1 測試期望的物件，用兩格縮排。
- `BaseHead` 的 icon 區塊改成：
  - `<link rel='icon' href='/favicon.ico' sizes='32x32' />`
  - 保留原本 svg 的 `rel='icon'`
  - 刪除 `rel='shortcut icon'`
  - 保留 apple-touch-icon
  - 新增 `<link rel='manifest' href='/site.webmanifest' />`

- [ ] **Step 5: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: `# fail 0`

- [ ] **Step 6: Commit**

```bash
git add scripts/make-icons.mjs public/favicon.ico public/site.webmanifest src/components/BaseHead.astro tests/seo/icons.test.mjs
git commit -m "Add favicon.ico and web manifest"
```

---

### Task 8: 建立兩個 Cloudflare Web Analytics site（RUM）

**Files:**
- Create: `STATE`

**Interfaces:**
- Consumes: 無。
- Produces: `STATE` 中的 `BLOG_RUM_SITE_TAG`、`BLOG_RUM_TOKEN`、`PORTAL_RUM_SITE_TAG`、`PORTAL_RUM_TOKEN`。
  - `*_TOKEN` 是 beacon 用的 token（Task 9、11、12、14 會用）。
  - `*_SITE_TAG` 是 API 與 GraphQL 篩選用的識別碼（Task 15 會用）。

- [ ] **Step 1: 建立 `STATE`**

```
# SEO & Analytics — execution state (public values only; one KEY=value per line)
BLOG_RUM_SITE_TAG=
BLOG_RUM_TOKEN=
PORTAL_RUM_SITE_TAG=
PORTAL_RUM_TOKEN=
PORTAL_BACKUP_DIR=
WWW_DNS_ORIGINAL=CNAME www.zzy.tw -> zzy.tw proxied=true ttl=1 id=ec5d0397d06d521d1fc35215cc6143ff
WWW_DNS_CHANGED=no
WWW_REDIRECT_RULESET_ID=
WWW_REDIRECT_RULE_ID=
CRAWLER_HINTS=
VISUAL_BASELINE_DIR=
PREVIEW_404_NOINDEX=
STAGE1=
STAGE2=
GSC_TXT_RECORD_ID=
```

- [ ] **Step 2: 冪等檢查**

MCP execute 呼叫 `GET /accounts/{ACCOUNT}/rum/site_info/list`。
Expected: `result` 是空陣列（2026-10-24 實測為 0 筆）。若已經有 host 為 `blog.zzy.tw` 或 `zzy.tw` 的 site，就沿用那一筆，不要重建。

- [ ] **Step 3: 建立兩個 site（§6.7-1 已授權）**

- Endpoint：`POST /accounts/{ACCOUNT}/rum/site_info`。
- 呼叫兩次，body 分別是 `{"host":"blog.zzy.tw","auto_install":false}` 與 `{"host":"zzy.tw","auto_install":false}`。
- 預期回應：`result` 含 `site_tag`、`site_token`、`snippet`。`snippet` 是一段 `<script … data-cf-beacon='{"token": "<32 hex>"}'>`。
- 取值：beacon token 一律取 `snippet` 裡的 token，並確認它等於 `site_token`（依 API schema，`site_tag` 是識別碼，`site_token` 才是 token）。兩者不同時以 snippet 為準，並在 `STATE` 末尾加一行 `NOTE=` 說明。
- 失敗時（非 2xx）：不要重試第二次。把錯誤訊息原文回報 controller，然後停下。

- [ ] **Step 4: 寫入 `STATE`，再驗證一次**

把四個值填進 `STATE`，再呼叫一次 Step 2 的 GET。
Expected: 2 筆，host 分別是 `blog.zzy.tw` 與 `zzy.tw`，都是 `auto_install: false`。

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-10-24-seo-analytics-state.md
git commit -m "Record Cloudflare Web Analytics site tokens"
```

---

### Task 9: 部落格 beacon、verify-static 第三方白名單、UPSTREAM 例外

**Files:**
- Create: `src/components/AnalyticsBeacon.astro`、`tests/seo/beacon.test.mjs`
- Modify: `src/site.config.ts`、`src/layouts/BaseLayout.astro:49-51`、`scripts/verify-static.mjs:87-95,106-137`、`UPSTREAM.md`、`tests/seo/expected.mjs`

**Interfaces:**
- Consumes: `STATE` 的 `BLOG_RUM_TOKEN`（Task 8）；helpers 的 `htmlRoutes`、`readPage`、`scripts`、`decode`。
- Produces:
  - `src/site.config.ts`：`CF_WEB_ANALYTICS_TOKEN`。
  - `scripts/verify-static.mjs` 新增 export `isAllowedExternalScript(src: string): boolean`。
  - `tests/seo/expected.mjs` 新增 `BLOG_RUM_TOKEN`。

- [ ] **Step 1: 寫失敗測試**

在 `expected.mjs` 加 `export const BLOG_RUM_TOKEN = '<STATE 中 BLOG_RUM_TOKEN 的值>'`，然後寫 `tests/seo/beacon.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { htmlRoutes, readPage, scripts, decode } from './helpers.mjs'
import { BLOG_RUM_TOKEN } from './expected.mjs'
import { isAllowedExternalScript } from '../../scripts/verify-static.mjs'

test('every page loads exactly one deferred Web Analytics beacon', async () => {
  for (const r of await htmlRoutes()) {
    const b = scripts(await readPage(r)).filter((s) => s.attrs.src === 'https://static.cloudflareinsights.com/beacon.min.js')
    assert.equal(b.length, 1, r); assert.ok('defer' in b[0].attrs, r)
    assert.deepEqual(JSON.parse(decode(b[0].attrs['data-cf-beacon'])), { token: BLOG_RUM_TOKEN }, r)
  }
})
test('only same-origin scripts and the Cloudflare beacon are allowed', () => {
  for (const ok of ['/_astro/a.js', 'https://blog.zzy.tw/_astro/a.js', 'https://static.cloudflareinsights.com/beacon.min.js']) assert.equal(isAllowedExternalScript(ok), true, ok)
  for (const bad of ['https://www.googletagmanager.com/gtag/js', 'https://static.cloudflareinsights.com/other.js', 'https://cdn.jsdelivr.net/npm/x']) assert.equal(isAllowedExternalScript(bad), false, bad)
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: `beacon.test.mjs` 整個檔 FAIL，訊息是 `SyntaxError: The requested module '../../scripts/verify-static.mjs' does not provide an export named 'isAllowedExternalScript'`。

- [ ] **Step 3: 實作**

- `site.config.ts`：`export const CF_WEB_ANALYTICS_TOKEN = '<BLOG_RUM_TOKEN>'`（site token 是公開值，§6.5）。
- `AnalyticsBeacon.astro`：`<script is:inline defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon={JSON.stringify({ token: CF_WEB_ANALYTICS_TOKEN })}></script>`。
- `BaseLayout.astro`：把 `<AnalyticsBeacon />` 放在 `</body>` 前最後的位置（`<style define:vars>` 之後）。
- `verify-static.mjs`：
  - `isAllowedExternalScript`：用 `new URL(src, SITE)` 解析；origin 等於 `SITE`，或完整網址等於 `https://static.cloudflareinsights.com/beacon.min.js` 時回傳 true，其餘回傳 false。
  - `checkLocalScriptReference` 在 `if (url.origin !== SITE) return` 之前加 `requireCheck(isAllowedExternalScript(url.href), \`${label}: third-party script ${url.href} is not allowed\`)`。
  - HTML 迴圈中，`rel` 含 `stylesheet`、`preload` 或 `modulepreload` 的 `<link>`，若 href 是外部 origin，就 `failures.push`。
- `UPSTREAM.md` 在清單後加一段：`Cloudflare Web Analytics 例外：每頁在 </body> 前以 defer 載入 https://static.cloudflareinsights.com/beacon.min.js（token 為公開值）。這是唯一允許的第三方執行期請求；scripts/verify-static.mjs 只放行這一個網址，其他外部 script 與外部樣式表都會讓建置失敗。`

- [ ] **Step 4: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: `Static verification passed`；`# fail 0`。

- [ ] **Step 5: Commit**

```bash
git add src/components/AnalyticsBeacon.astro src/layouts/BaseLayout.astro src/site.config.ts scripts/verify-static.mjs UPSTREAM.md tests/seo/beacon.test.mjs tests/seo/expected.mjs
git commit -m "Add Cloudflare Web Analytics beacon and allowlist it in static verification"
```

---

### Task 10: 〈Markdown 語法指南〉微調（§6.4）

**Files:**
- Create: `tests/seo/content.test.mjs`
- Modify: `src/content/blog/markdown-syntax/index.md:15,217`

**Interfaces:**
- Consumes: helpers 的 `readPage`、`stripTags`。
- Produces: 無。

- [ ] **Step 1: 寫失敗測試 `tests/seo/content.test.mjs`**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readPage, stripTags } from './helpers.mjs'

test('article names Markdown in its first heading and mentions LaTeX syntax', async () => {
  const h = await readPage('/blog/markdown-syntax')
  const h2 = [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(([, x]) => stripTags(x).replace(/#$/, '').trim())
  assert.ok(h2.includes('Markdown 基本語法')); assert.ok(!h2.includes('基本語法'))
  assert.ok(stripTags(h).includes('公式本身用 LaTeX 語法來寫'))
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `npm run build && npm run test:seo`
Expected: FAIL，斷言落在 `h2.includes('Markdown 基本語法')`。

- [ ] **Step 3: 改文章（只改這兩處）**

- 第 15 行：`## 基本語法` 改成 `## Markdown 基本語法`。
- 第 217 行的第一句改成：`數學式不是標準 Markdown 的一部分，是這個部落格透過 remark-math 和 KaTeX 另外支援的，公式本身用 LaTeX 語法來寫。`；後半句維持原樣。
- 不要加 `updatedDate`。

- [ ] **Step 4: 確認測試通過**

Run: `npm run build && npm run test:seo`
Expected: `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/markdown-syntax/index.md tests/seo/content.test.mjs
git commit -m "Name Markdown and LaTeX explicitly in the Markdown guide"
```

---

### Task 11: portal 備份、head、靜態連結、bio、JSON-LD、無障礙、beacon

**Files:**
- Create: `PORTAL/tests/html-helpers.mjs`、`PORTAL/tests/seo.test.mjs`、備份目錄 `PORTAL/.backups/portal-dist-<YYYYMMDD-HHMMSS>/`
- Modify: `PORTAL/dist/index.html:2-16,32,45-47,57`、`PORTAL/dist/app.js:27-39`、`PORTAL/dist/style.css`（檔尾附加）、`PORTAL/package.json`（`test`）、`STATE`

**Interfaces:**
- Consumes: `STATE` 的 `PORTAL_RUM_TOKEN`（Task 8）；Copy 的 `BIO`、`SEO_NAME`、`PORTAL_DESC`、`PORTAL_OG_ALT`、`PERSON`。
- Produces:
  - `PORTAL/tests/html-helpers.mjs`：`attrs`、`decode`、`meta`、`links`、`scripts`、`jsonLdGraph`、`stripTags`、`pngSize`，語意同 `BLOG/tests/seo/helpers.mjs`（可直接複製那幾個函式）。
  - `PORTAL/tests/seo.test.mjs` 檔頭的常數 `BIO`、`SEO_NAME`、`PORTAL_DESC`、`PORTAL_OG_ALT`、`PERSON`（值照 Copy）、`PORTAL_RUM_TOKEN`（值照 `STATE`），以及 `read`、`bin` 兩個讀檔函式。Task 12 會沿用。
  - CSS class `.visually-hidden`。
  - portal 的 og:image 網址固定為 `https://zzy.tw/og.png`（檔案由 Task 12 產生）。

- [ ] **Step 1: 備份整個 `PORTAL/dist/`（§6.7-3）**

```bash
cd /Users/kevin/Desktop/github/blog && BK=".backups/portal-dist-$(date +%Y%m%d-%H%M%S)" && mkdir -p .backups && cp -Rp dist "$BK" && diff -r dist "$BK" && echo "$BK"
```

Expected: `diff` 沒有輸出，最後印出備份路徑。把 `PORTAL_BACKUP_DIR=/Users/kevin/Desktop/github/blog/<印出的路徑>` 寫進 `STATE`。

- [ ] **Step 2: 寫失敗測試 `PORTAL/tests/seo.test.mjs`**

同時把 `PORTAL/package.json` 的 `test` 改成 `node --test 'tests/*.test.mjs'`。

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { meta, links, scripts, jsonLdGraph, stripTags, decode, pngSize } from './html-helpers.mjs'

// Copy 區塊的值（逐字照抄）與 STATE 的 token
const BIO = '…', SEO_NAME = '…', PORTAL_DESC = '…', PORTAL_OG_ALT = '…', PERSON = { /* … */ }
const PORTAL_RUM_TOKEN = '…'
const read = (f) => readFile(new URL(`../dist/${f}`, import.meta.url), 'utf8')
const bin = (f) => readFile(new URL(`../dist/${f}`, import.meta.url))
const ID = { '@id': 'https://zzy.tw/#person' }
const HINT = '<span class="visually-hidden"> (opens in a new tab)</span>'

test('head: title, description, canonical, Open Graph and Twitter card', async () => {
  const h = await read('index.html')
  assert.equal(h.match(/<title>([^<]*)<\/title>/)[1], SEO_NAME); assert.equal(links(h, 'canonical')[0].href, 'https://zzy.tw/')
  const expect = { description: PORTAL_DESC, 'og:type': 'website', 'og:site_name': SEO_NAME, 'og:title': SEO_NAME, 'og:description': PORTAL_DESC, 'og:url': 'https://zzy.tw/', 'og:locale': 'en_US', 'og:image': 'https://zzy.tw/og.png', 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': PORTAL_OG_ALT, 'twitter:card': 'summary_large_image', 'twitter:title': SEO_NAME, 'twitter:description': PORTAL_DESC, 'twitter:image': 'https://zzy.tw/og.png', 'twitter:image:alt': PORTAL_OG_ALT }
  for (const [k, v] of Object.entries(expect)) assert.equal(meta(h, k), v, k)
})
test('static HTML links to the blog and GitHub without JavaScript', async () => {
  const h = await read('index.html')
  for (const href of ['https://blog.zzy.tw/', 'https://github.com/kevinjone25']) {
    const a = h.match(new RegExp(`<a\\b[^>]*href="${href}"[^>]*>([\\s\\S]*?)</a>`))
    assert.ok(a, href); assert.doesNotMatch(a[0], /aria-label=/); assert.ok(a[1].endsWith(HINT), href)
  }
})
test('static directory mirrors config.js', async () => {
  const ctx = { window: {} }; vm.runInNewContext(await read('config.js'), ctx)
  const h = await read('index.html')
  ctx.window.ZZY_CONFIG.links.forEach((l, i) => {
    const card = h.match(new RegExp(`<(a|article)\\b[^>]*data-link-index="${i}"[\\s\\S]*?</\\1>`))[0]
    assert.ok(card.includes(`<span class="destination-title">${l.title}</span>`), l.title)
    assert.ok(decode(card).includes(`<span class="destination-subtitle">${l.subtitle}</span>`), l.title)
    if (l.url) assert.ok(card.startsWith('<a') && card.includes(`href="${l.url}"`), l.title)
    else assert.ok(card.includes(`aria-label="${l.title}, coming soon"`) && card.includes('Coming soon'), l.title)
  })
})
test('hero shows the bio in Traditional Chinese', async () => {
  const p = (await read('index.html')).match(/<p class="hero-description"([^>]*)>([\s\S]*?)<\/p>/)
  assert.match(p[1], /lang="zh-Hant-TW"/); assert.equal(stripTags(p[2]), BIO)
})
test('JSON-LD: WebSite + Person', async () => {
  const g = jsonLdGraph(await read('index.html'))
  assert.deepEqual(g.find((n) => n['@type'] === 'Person'), PERSON)
  assert.deepEqual(g.find((n) => n['@type'] === 'WebSite'), { '@type': 'WebSite', '@id': 'https://zzy.tw/#website', url: 'https://zzy.tw/', name: SEO_NAME, inLanguage: 'en', publisher: ID })
})
test('beacon', async () => {
  const b = scripts(await read('index.html')).filter((s) => s.attrs.src === 'https://static.cloudflareinsights.com/beacon.min.js')
  assert.equal(b.length, 1); assert.ok('defer' in b[0].attrs)
  assert.deepEqual(JSON.parse(decode(b[0].attrs['data-cf-beacon'])), { token: PORTAL_RUM_TOKEN })
})
test('app.js keeps link names in sync with visible text', async () => {
  const js = await read('app.js')
  assert.doesNotMatch(js, /\(opens in a new tab\)`\)/); assert.match(js, /visually-hidden/)
})
```

- [ ] **Step 3: 確認測試失敗**

Run: `cd /Users/kevin/Desktop/github/blog && npm test`
Expected: 原有的 `link-utils` 3 個測試通過；`seo.test.mjs` 的 7 個測試都 FAIL。

- [ ] **Step 4: 改 `index.html` 的 head（第 2–16 行）**

- `<html lang="en">` 不變。charset、viewport、`theme-color #232222`，以及 `./favicon.svg` 的 icon、`./style.css`、`./config.js`、`./app.js` 這幾行維持原樣與原順序。
- 刪除舊的 description、og:title、og:description、og:type 與 `<title>`，改成以下欄位：

| 欄位 | 值 |
|---|---|
| `<title>` | `SEO_NAME` |
| `meta[name=description]` | `PORTAL_DESC` |
| `link[rel=canonical]` | `https://zzy.tw/` |
| `og:type` | `website` |
| `og:site_name`、`og:title` | `SEO_NAME` |
| `og:description` | `PORTAL_DESC` |
| `og:url` | `https://zzy.tw/` |
| `og:locale` | `en_US` |
| `og:image` | `https://zzy.tw/og.png` |
| `og:image:width`、`og:image:height` | `1200`、`630` |
| `og:image:alt` | `PORTAL_OG_ALT` |
| `twitter:card` | `summary_large_image` |
| `twitter:title` | `SEO_NAME` |
| `twitter:description` | `PORTAL_DESC` |
| `twitter:image` | `https://zzy.tw/og.png` |
| `twitter:image:alt` | `PORTAL_OG_ALT` |
| `script[type=application/ld+json]` | 一行 JSON：`{"@context":"https://schema.org","@graph":[<WebSite>,<PERSON>]}`，WebSite 與 Step 2 測試期望的物件相同，放在 `config.js` 那行之前 |

- OG 欄位用 `property=`，Twitter 欄位用 `name=`。

- [ ] **Step 5: 改 body、`app.js`、`style.css`**

- 第 32 行換成 `<p class="hero-description" lang="zh-Hant-TW">…</p>`。內容是把 `BIO` 在第一個全形逗號之後切成兩半：`前半<br><span>後半</span>`，對應原本的兩行版面，`stripTags` 後要等於 `BIO`。
- `app.js`：
  - 刪除第 31 行的 `card.setAttribute('aria-label', ...)`。
  - 在第 39 行設定 subtitle 之後，只對有 `url` 的卡片附加 `<span class="visually-hidden"> (opens in a new tab)</span>`：用 `createElement`、`className`、`textContent` 建立，再 `card.append`。
  - 沒有 url 的卡片維持原本的 `aria-label`。
- `#destination-grid`：刪除 `<noscript>`，改放四張卡片的靜態 markup。內容要與修改後的 `app.js` 對 `config.js` 四筆資料渲染出的 DOM 完全相同，包括 class、`data-link-index`、`target`、`rel`、icon SVG、`aria-hidden` 的編號，以及 `&amp;` 轉義。`app.js` 仍會 `replaceChildren` 重繪，結果相同。
- 在 `</body>` 前加 `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"<PORTAL_RUM_TOKEN>"}'></script>`。
- `style.css` 檔尾附加：`.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }`。

- [ ] **Step 6: 確認測試通過**

Run: `cd /Users/kevin/Desktop/github/blog && npm run check && npm test`
Expected: `node --check` 沒有輸出；`# fail 0`。

- [ ] **Step 7: 記錄進度**

在 `STATE` 末尾加 `PORTAL_TASK11=done`，然後在 `BLOG` 執行：`git add docs/superpowers/plans/2026-10-24-seo-analytics-state.md && git commit -m "Record portal backup location"`。

---

### Task 12: portal 的 `_headers`、sitemap、robots、404、圖示、manifest、og:image

**Files:**
- Create: `PORTAL/dist/_headers`、`PORTAL/dist/sitemap.xml`、`PORTAL/dist/404.html`、`PORTAL/dist/favicon.ico`、`PORTAL/dist/apple-touch-icon.png`、`PORTAL/dist/site.webmanifest`、`PORTAL/dist/og.png`
- Modify: `PORTAL/dist/robots.txt`、`PORTAL/dist/index.html`（head 的 icon 區）、`PORTAL/tests/seo.test.mjs`（附加測試）

**Interfaces:**
- Consumes: `BLOG/scripts/og-image.mjs`（Task 2，印 1 行）、`BLOG/scripts/make-icons.mjs`（Task 7，加 `--apple` 時印 2 行）；Task 11 測試檔頭的常數與函式；Copy 的 `PORTAL_404_DESC`、`PORTAL_404_COPY`。
- Produces: 無。

- [ ] **Step 1: 在 `PORTAL/tests/seo.test.mjs` 附加失敗測試**

先在檔頭常數區加上 `PORTAL_404_DESC`（值照 Copy），再附加：

```js
test('_headers: workers.dev noindex and image caching only', async () => {
  const h = await read('_headers')
  assert.ok(h.includes('https://:worker.:sub.workers.dev/*\n  X-Robots-Tag: noindex\n'))
  for (const f of ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/og.png']) assert.ok(h.includes(`${f}\n  Cache-Control: public, max-age=86400\n`), f)
  assert.doesNotMatch(h, /^\/\*\s*$/m); assert.doesNotMatch(h, /\.(css|js)\s*$/m)
})
test('sitemap and robots', async () => {
  assert.match(await read('sitemap.xml'), /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n  <url><loc>https:\/\/zzy\.tw\/<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod><\/url>\n<\/urlset>\n$/)
  assert.equal(await read('robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://zzy.tw/sitemap.xml\n')
})
test('404 page has content, is noindex and only uses absolute asset paths', async () => {
  const h = await read('404.html')
  assert.equal(h.match(/<title>([^<]*)<\/title>/)[1], `Page not found | ${SEO_NAME}`)
  assert.equal(meta(h, 'description'), PORTAL_404_DESC); assert.equal(meta(h, 'robots'), 'noindex')
  assert.match(h, /href="\/style\.css"/); assert.doesNotMatch(h, /(?:href|src)="\.\//)
  assert.match(h, /href="https:\/\/zzy\.tw\/"/); assert.match(h, /href="https:\/\/blog\.zzy\.tw\/"/)
  assert.match(stripTags(h), /A small corner of the internet\./); assert.doesNotMatch(h, /taipei-time/)
  assert.equal(scripts(h).filter((s) => s.attrs.src === 'https://static.cloudflareinsights.com/beacon.min.js').length, 1)
})
test('icons, manifest and og image', async () => {
  const ico = await bin('favicon.ico'); assert.equal(ico.readUInt16LE(4), 3)
  assert.deepEqual(pngSize(await bin('apple-touch-icon.png')), { width: 180, height: 180 })
  assert.deepEqual(pngSize(await bin('og.png')), { width: 1200, height: 630 })
  assert.deepEqual(JSON.parse(await read('site.webmanifest')), { name: 'zzy.tw', short_name: 'zzy', start_url: '/', display: 'browser', background_color: '#232222', theme_color: '#232222', icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }] })
  const h = await read('index.html')
  assert.ok(links(h, 'icon').some((l) => l.href === '/favicon.ico' && l.sizes === '32x32'))
  assert.equal(links(h, 'apple-touch-icon')[0]?.href, '/apple-touch-icon.png'); assert.equal(links(h, 'manifest')[0]?.href, '/site.webmanifest')
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `cd /Users/kevin/Desktop/github/blog && npm test`
Expected: 4 個新測試 FAIL（例如 `ENOENT: … _headers`）；Task 11 的測試維持通過。

- [ ] **Step 3: 用部落格的 CLI 產生圖檔**

先把 shell 變數 `SEO_NAME`、`BIO` 設成 Copy 的值，然後執行：

```bash
cd /Users/kevin/Desktop/github/blog/sites/blog
node scripts/og-image.mjs --label zzy.tw --title "$SEO_NAME" --footer "$BIO" --out /Users/kevin/Desktop/github/blog/dist/og.png
node scripts/make-icons.mjs --svg /Users/kevin/Desktop/github/blog/dist/favicon.svg --out-dir /Users/kevin/Desktop/github/blog/dist --apple
```
Expected: 共印 3 行 `Wrote …`：og-image 1 行，make-icons 2 行。用 Read 工具打開 `og.png`，確認站名與 bio 清楚可讀，沒有豆腐字。

- [ ] **Step 4: 寫入文字檔**

- `_headers`：先寫 `https://:worker.:sub.workers.dev/*` → `X-Robots-Tag: noindex`，然後 `/favicon.ico`、`/favicon.svg`、`/apple-touch-icon.png`、`/og.png` 各一個區塊，都是 `Cache-Control: public, max-age=86400`。區塊之間空一行，header 行縮排兩格。
  - 理由：這些圖檔沒有內容雜湊，快取 1 天即可。CSS 與 JS 也沒有雜湊，而且 `index.html` 的靜態 markup 要與 `app.js` 同步，所以維持 Cloudflare 預設的重新驗證，不另設規則。
- `sitemap.xml`：照 Step 1 的 regex 格式寫一個 `<url>`，`lastmod` 用執行當天的日期（`TZ=Asia/Taipei date +%F`）。
- `robots.txt`：內容等於 Step 1 期望的字串。
- `site.webmanifest`：內容等於 Step 1 期望的物件，用兩格縮排。manifest `name` 用視覺站名 `zzy.tw`。
- `404.html`：
  - 完整 HTML 文件，`<html lang="en">`。
  - head 有 charset、viewport、`theme-color #232222`、`<title>Page not found | <SEO_NAME></title>`、description（`PORTAL_404_DESC`）、`<meta name="robots" content="noindex">`、`<link rel="icon" href="/favicon.ico" sizes="32x32">`、`<link rel="icon" href="/favicon.svg" type="image/svg+xml">`、`<link rel="stylesheet" href="/style.css">`。
  - body 沿用 index.html 的 `page-shell` 與 `site-header` 結構（`home-mark` 的 href 改成 `https://zzy.tw/`），不放 `config.js`、`app.js`、canvas 與時鐘。
  - main 只放 `<section class="hero"><div class="hero-copy">`，內容照 `PORTAL_404_COPY`：`eyebrow mono` 的 eyebrow、`<h1>`、`hero-description` 段落（第二行用 `<span>`），以及兩個 `explore-link mono` 連結。
  - footer：`<footer class="site-footer">` 只放 `PORTAL/dist/index.html:52` 的 `footer-left` 整行，不放 `footer-right`。
  - `</body>` 前放與 index.html 相同的 beacon。
- `index.html`：在 `<link rel="icon" href="./favicon.svg" …>` 之前插入 `<link rel="icon" href="/favicon.ico" sizes="32x32">`、`<link rel="apple-touch-icon" href="/apple-touch-icon.png">`、`<link rel="manifest" href="/site.webmanifest">`。

- [ ] **Step 5: 確認測試通過**

Run: `cd /Users/kevin/Desktop/github/blog && npm run check && npm test && npx --yes wrangler@4.151.3 deploy --dry-run --env preview; echo "exit=$?"`
Expected: `# fail 0`；最後一行是 `exit=0`。

---

### Task 13: Cloudflare：`www.zzy.tw` 301 轉址與 Crawler Hints

**Files:**
- Modify: `STATE`

**Interfaces:**
- Consumes: `STATE` 的 `WWW_DNS_ORIGINAL`（Task 8 預先寫入）。
- Produces: `STATE` 的 `WWW_REDIRECT_RULESET_ID`、`WWW_REDIRECT_RULE_ID`、`WWW_DNS_CHANGED`、`CRAWLER_HINTS`。

- [ ] **Step 1: 確認現況**

Run: `curl -s -o /dev/null -w '%{http_code}\n' https://www.zzy.tw/abc`
Expected: `522`。若已經是 `301`，代表規則已存在：直接跳到 Step 3 驗證。

- [ ] **Step 2: 新增 Single Redirect 規則（§6.7-1 已授權）**

- 先 `GET /zones/{Z}/rulesets/phases/http_request_dynamic_redirect/entrypoint`。2026-10-24 查到的是 404，代表 entrypoint 不存在。
- 規則內容：
  - `description`：`www.zzy.tw to apex, 301, keep path and query`
  - `expression`：`(http.host eq "www.zzy.tw")`
  - `action`：`redirect`；`enabled`：`true`
  - `action_parameters.from_value`：`status_code: 301`、`preserve_query_string: true`、`target_url.expression: concat("https://zzy.tw", http.request.uri.path)`
- 寫入方式：
  - GET 回 404：`PUT /zones/{Z}/rulesets/phases/http_request_dynamic_redirect/entrypoint`，body `{ "rules": [<規則>] }`。
  - GET 回 200：`POST /zones/{Z}/rulesets/{entrypoint id}/rules`，body 是 `<規則>`，以追加的方式加入，不覆寫既有規則。
- 預期回應：`result` 是整個 ruleset。把 `result.id` 與「description 相符的那條規則的 `id`」寫進 `STATE`。
- 失敗時（非 2xx）：不要重試第二次。把錯誤訊息原文回報 controller，然後停下。

- [ ] **Step 3: 驗證轉址（最多等 5 分鐘生效）**

```bash
curl -sI https://www.zzy.tw/abc | grep -iE '^(HTTP|location)'
curl -sI 'https://www.zzy.tw/abc?x=1' | grep -i '^location'
curl -sIL http://www.zzy.tw/abc | grep -iE '^(HTTP|location)'
```

Expected：
- 第一條：`HTTP/2 301` 與 `location: https://zzy.tw/abc`。
- 第二條：`location: https://zzy.tw/abc?x=1`。
- 第三條：最後落在 `https://zzy.tw/abc`。
- 每 30 秒重試一次，5 分鐘內必須看到 301。

- [ ] **Step 4: 只有 Step 3 失敗時才做：DNS 備援（§6.7-1）**

- `PUT /zones/{Z}/dns_records/{WWW_RECORD}`，body `{ "type": "AAAA", "name": "www.zzy.tw", "content": "100::", "proxied": true, "ttl": 1, "comment": "Redirect-only placeholder; was CNAME www.zzy.tw -> zzy.tw proxied" }`。
- `STATE` 設 `WWW_DNS_CHANGED=yes`，然後重做 Step 3。
- 還原用的 body：`{ "type": "CNAME", "name": "www.zzy.tw", "content": "zzy.tw", "proxied": true, "ttl": 1 }`。
- zone 內其他記錄一律不動。若改完仍然失敗，停下來，把兩次的 curl 輸出回報 controller。

- [ ] **Step 5: 開啟 Crawler Hints（§6.6）**

- Endpoint：`PUT /zones/{Z}/flags/products/cache/changes`，body `{ "feature": "crawlhints_enabled", "value": true }`。
- 驗證：`GET /zones/{Z}/flags` 的 `result.cache.crawlhints_enabled` 應為 `true`。
- 背景：這個 GET 已在 2026-10-24 確認可用（當時值為 `false`）；PUT 端點是推論出來的，不在公開的 OpenAPI 中。
- 結果處理：
  - 成功：設 `CRAWLER_HINTS=enabled-by-api`。
  - PUT 非 2xx：只試這一次。停下來請 Kevin 到 https://dash.cloudflare.com/dc6a1a24f6283359bb4fed063050d736/zzy.tw/caching/configuration 開啟 Crawler Hints，再用同一個 GET 確認為 `true`，然後設 `CRAWLER_HINTS=enabled-by-kevin`。

- [ ] **Step 6: Commit `STATE`**

```bash
git add docs/superpowers/plans/2026-10-24-seo-analytics-state.md && git commit -m "Record www redirect and Crawler Hints state"
```

---

### Task 14: 第一階段驗收（preview）

**Files:**
- Create: `scripts/visual-snapshot.mjs`、`scripts/seo-audit.mjs`、`scripts/lighthouse-batch.mjs`、`scripts/validate-jsonld.mjs`
- Modify: `STATE`

**Interfaces:**
- Consumes: Task 1–13 的成果；`STATE` 的 `BLOG_RUM_TOKEN`、`PORTAL_RUM_TOKEN`；Copy 的 `PERSON`、`SEO_NAME`。
- Produces（Task 15 會用）：
  - `node scripts/visual-snapshot.mjs --out <dir> <name>=<url>...`：每個 URL 拍 4 張，檔名 `<name>-<1440|390>-<light|dark>.png`。
  - `node scripts/visual-snapshot.mjs --compare <beforeDir> <afterDir>`：每張圖印一行 `<file> same-size=<bool> diff=<0–1>`。
  - `node scripts/seo-audit.mjs --blog-origin <url> --portal-origin <url> --blog-token <t> --portal-token <t> [--preview] [--skip-404-noindex]`：每頁印一行 `PASS|FAIL <url> <失敗項>`，最後印總結；有任何 FAIL 時 exit 1。
  - `node scripts/lighthouse-batch.mjs --out <dir> <url>...`：每個 URL 印一行 `<url> mobile P/A/BP/SEO desktop P/A/BP/SEO fails=<audit ids>`。
  - `node scripts/validate-jsonld.mjs <html-file-or-url>...`：每個目標印一行 `<target> objects=<n> errors=<n> types=<A,B>`；有任何 `errors>0` 或 `objects=0` 時 exit 1。

- [ ] **Step 1: 寫 `scripts/visual-snapshot.mjs`，在 push 之前拍「改動前」基準**

- 做法上的決定：
  - 不加依賴，用 Node 內建的 `WebSocket` 走 Chrome DevTools Protocol，驅動 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` 的 `--headless=new`，每次使用全新的 user-data-dir。
  - 亮暗模式用 CDP 的 `Emulation.setEmulatedMedia` 模擬 `prefers-color-scheme`。不要用 `--force-dark-mode`，實測它不會改變 prefers-color-scheme。
  - 視窗：1440×900（桌面）與 390×844（`mobile: true`），`deviceScaleFactor` 為 1。
  - 等到 load 事件之後再等 1500 ms，截整頁（`captureBeyondViewport`）。
  - 本機已用 Chrome 155 實測可行。
- `--compare` 模式：用 sharp 轉成 raw RGBA；尺寸相同時，算出任一通道差值大於 16 的像素比例；尺寸不同時印 `same-size=false`。

```bash
P=https://zzy-blog-preview.zzy-portal.workers.dev; OUT=/Users/kevin/Desktop/github/blog/.backups/seo-visual/before
node scripts/visual-snapshot.mjs --out $OUT blog-home=$P/ blog-list=$P/blog blog-about=$P/about blog-post=$P/blog/markdown-syntax portal-home=https://zzy.tw/
```

Expected: 產生 20 張 PNG。在 `STATE` 寫 `VISUAL_BASELINE_DIR=$OUT`。這一步必須在 Step 6 的 push 之前完成：此時 preview 仍是舊版，portal 正式站也還沒改。

- [ ] **Step 2: 寫 `scripts/seo-audit.mjs`，並先證明它抓得到舊版的問題**

照設計 §7「爬蟲逐頁」、sitemap／robots、portal 不執行 JS 這幾項逐一實作（受測頁照 §7 定義），另外加上以下特殊處理：

- 抓 preview 時：sitemap 列的是正式網址，要把 origin 換成 `--blog-origin`、`--portal-origin` 再抓；og:image 也一樣換 origin。canonical 的期望值仍是正式網址（首頁分別是 `https://blog.zzy.tw/`、`https://zzy.tw/`）。
- 404 探測頁固定用 `/seo-audit-missing-page`，兩站各一頁。預期狀態碼 404，並跳過 canonical、og:image、JSON-LD 與 title 唯一性的檢查。
- 每頁都要恰好一個 beacon，token 等於對應站的 `--*-token`。
- JSON-LD 型別：部落格 `/` 要有 WebSite＋Blog＋Person，`/about` 要有 ProfilePage＋Person，文章要有 BlogPosting＋BreadcrumbList＋Person，portal `/` 要有 WebSite＋Person。所有 Person 節點都要與 Copy 的 `PERSON` 深度相等。
- `lang` 與 `og:locale` 成對：部落格 `zh-Hant-TW`↔`zh_TW`，或 `en`↔`en_US`；portal 必須是 `en`。
- `--preview`：兩個 origin 的每個回應都必須帶 `x-robots-tag: noindex`。加 `--skip-404-noindex` 時，404 探測頁不檢查這一項。不加 `--preview` 時，任何回應都不能有 `x-robots-tag`。
- 不需要測 www 轉址；Task 13、15 會用 curl 驗。

Run（舊版）：`node scripts/seo-audit.mjs --blog-origin https://zzy-blog-preview.zzy-portal.workers.dev --portal-origin https://zzy.tw --blog-token <BLOG_RUM_TOKEN> --portal-token <PORTAL_RUM_TOKEN>`
Expected: exit 1。每一頁至少有 title 與 beacon 兩項 FAIL，部落格首頁另有 JSON-LD FAIL。

- [ ] **Step 3: 寫 `scripts/lighthouse-batch.mjs` 與 `scripts/validate-jsonld.mjs`**

- `lighthouse-batch`：
  - 每個 URL 跑 `npx --yes lighthouse@13 <url> --quiet --chrome-flags="--headless=new" --output=json`，mobile 一次、加 `--preset=desktop` 一次，JSON 寫到 `--out`。
  - `fails` 列出 `score<1`、而且 mode 不是 `notApplicable`、`informative`、`manual` 的 audit。
  - Performance 低於門檻（mobile 95、desktop 100）時，該模式再補跑 2 次，取中位數。
- `validate-jsonld`：
  - 參數若是 URL 就 `fetch`，否則讀檔。
  - 以表單欄位 `html` POST 到 `https://validator.schema.org/validate`。
  - 回應要先去掉第一行 `)]}'` 再 parse，讀 `numObjects`、`totalNumErrors`、`tripleGroups[].type`（2026-10-24 已實測回應格式）。

- [ ] **Step 4: 本機全綠**

Run: `cd /Users/kevin/Desktop/github/blog/sites/blog && npm run build && npm run test:seo && node scripts/validate-jsonld.mjs dist/index.html dist/about/index.html dist/blog/markdown-syntax/index.html && cd /Users/kevin/Desktop/github/blog && npm test`
Expected: 兩邊測試都是 `# fail 0`；validate-jsonld 三行都是 `errors=0`；`git -C /Users/kevin/Desktop/github/blog/sites/blog status --short` 只列出這個 task 新增的四支腳本。

- [ ] **Step 5: Commit 腳本**

```bash
git add scripts/visual-snapshot.mjs scripts/seo-audit.mjs scripts/lighthouse-batch.mjs scripts/validate-jsonld.mjs docs/superpowers/plans/2026-10-24-seo-analytics-state.md
git commit -m "Add acceptance tooling"
```

- [ ] **Step 6: push 部落格（§6.7-2 已授權），等 preview 更新**

Run: `git -C /Users/kevin/Desktop/github/blog/sites/blog push origin main`

然後在背景執行，或用 Monitor 工具執行：

```bash
until curl -s https://zzy-blog-preview.zzy-portal.workers.dev/ | grep -q 'application/ld+json'; do sleep 20; done
```

上限 15 分鐘。逾時就停下來，請 Kevin 到 GitHub Actions 查看「Deploy Cloudflare」這次執行的錯誤（本機沒有 `gh`）。

- [ ] **Step 7: 部署 portal preview，實測 404 是否帶 noindex，再跑爬蟲與 schema 驗證**

```bash
cd /Users/kevin/Desktop/github/blog && npm run deploy:preview
for o in https://zzy-blog-preview.zzy-portal.workers.dev https://zzy-portal-preview.zzy-portal.workers.dev; do curl -sI "$o/seo-audit-missing-page" | grep -iE '^(HTTP|x-robots-tag)'; done
```

- 兩個 404 回應都帶 `x-robots-tag: noindex`：`STATE` 寫 `PREVIEW_404_NOINDEX=present`，下面的 seo-audit 不加 `--skip-404-noindex`。
- 任一個沒帶：寫 `PREVIEW_404_NOINDEX=absent`，seo-audit 加上 `--skip-404-noindex`，並在 `STAGE1` 註明「`_headers` 規則對 404 回應不生效」。

```bash
cd /Users/kevin/Desktop/github/blog/sites/blog
node scripts/seo-audit.mjs --blog-origin https://zzy-blog-preview.zzy-portal.workers.dev --portal-origin https://zzy-portal-preview.zzy-portal.workers.dev --blog-token <BLOG_RUM_TOKEN> --portal-token <PORTAL_RUM_TOKEN> --preview [--skip-404-noindex]
node scripts/validate-jsonld.mjs https://zzy-blog-preview.zzy-portal.workers.dev/ https://zzy-blog-preview.zzy-portal.workers.dev/about https://zzy-blog-preview.zzy-portal.workers.dev/blog/markdown-syntax https://zzy-portal-preview.zzy-portal.workers.dev/
```

Expected: seo-audit 12 頁全部 `PASS`、exit 0；validate-jsonld 四行都是 `errors=0`。

- [ ] **Step 8: Lighthouse（受測頁共 12 頁）**

```bash
B=https://zzy-blog-preview.zzy-portal.workers.dev; Q=https://zzy-portal-preview.zzy-portal.workers.dev
node scripts/lighthouse-batch.mjs --out "$SCRATCH/lh-stage1" $B/ $B/about $B/archives $B/blog $B/blog/markdown-syntax $B/tags $B/tags/%E5%AF%AB%E4%BD%9C $B/tags/markdown $B/search $B/seo-audit-missing-page $Q/ $Q/seo-audit-missing-page
```

通過條件：
- 每頁 A=100、BP=100、desktop P=100、mobile P≥95。
- SEO 的 `fails` 只允許以下預期項目（§7 分數例外）：
  - 所有 preview 頁（兩站）的 `is-crawlable`；
  - 404 頁的 `http-status-code`。
- BP 若唯一的失敗項是 `errors-in-console`，而且來源只有 `cloudflareinsights.com`，就記錄下來，留待 Task 15 在正式網域複測。
- 其他任何未達標的項目：不要在這個 task 裡修。把頁面、分數、失敗的 audit id、JSON 路徑寫進 `STATE` 的 `STAGE1=FAIL …`，回報 controller。

- [ ] **Step 9: 外觀對照**

```bash
P=https://zzy-blog-preview.zzy-portal.workers.dev; OUT=/Users/kevin/Desktop/github/blog/.backups/seo-visual/after
node scripts/visual-snapshot.mjs --out $OUT blog-home=$P/ blog-list=$P/blog blog-about=$P/about blog-post=$P/blog/markdown-syntax portal-home=https://zzy-portal-preview.zzy-portal.workers.dev/
node scripts/visual-snapshot.mjs --compare /Users/kevin/Desktop/github/blog/.backups/seo-visual/before $OUT
```

對 `diff>0` 的每一對圖，用 Read 工具並排檢視。允許的差異只有：
- portal hero 第二段文字（英文換成 bio）；
- portal 星系 canvas 與 TAIPEI 時鐘（本來就是動態內容）；
- /about 開頭的 `ABOUT_INTRO` 與 bio 段落，以及因此往下推移的內容；
- 文章的「Markdown 基本語法」小標與 LaTeX 那一句，以及因此造成的推移。

其他任何版面、顏色、字型或間距的差異都判定為 FAIL。

- [ ] **Step 10: 記錄並 commit**

在 `STATE` 寫 `STAGE1=PASS <日期> seo-audit 12/12, lighthouse <摘要>, visual ok`（或對應的 FAIL 內容），然後：

```bash
git add docs/superpowers/plans/2026-10-24-seo-analytics-state.md && git commit -m "Record preview stage results" && git push origin main
```

---

### Task 15: 第二階段（正式站）

**Files:**
- Modify: `STATE`

**Interfaces:**
- Consumes: Task 14 的腳本與 `STAGE1=PASS`；`STATE` 的 RUM site tag 與 token。
- Produces: `STATE` 的 `STAGE2`。

- [ ] **Step 1: 請 Kevin dispatch 部落格正式站（停下來等回覆）**

請 Kevin 到 GitHub → Actions → Deploy Cloudflare → Run workflow，選 `main` 並設 `target=production`。他回覆完成後：

Run: `curl -s https://blog.zzy.tw/ | grep -c 'application/ld+json'`
Expected: 大於等於 1（舊版首頁沒有 JSON-LD，所以這代表新版已上線）。

- [ ] **Step 2: 請示 Kevin 是否部署 portal 正式站（停下來等明確同意）**

告訴 Kevin：portal 沒有 git，備份在 `STATE` 的 `PORTAL_BACKUP_DIR`，preview 驗收結果是 `STAGE1` 的內容。取得同意之後才執行：

Run: `cd /Users/kevin/Desktop/github/blog && npm run deploy`
Expected: wrangler 成功；`curl -s https://zzy.tw/ | grep -c 'href="https://blog.zzy.tw/"'` 大於等於 1。

- [ ] **Step 3: 網域層檢查**

```bash
curl -sI https://www.zzy.tw/abc | grep -iE '^(HTTP|location)'
curl -s https://zzy.tw/robots.txt; curl -s https://blog.zzy.tw/robots.txt
A=$(curl -s https://blog.zzy.tw/ | grep -o '/_astro/[^"]*\.css' | head -1); curl -sI "https://blog.zzy.tw$A" | grep -i '^cache-control'
curl -sI https://zzy.tw/og.png | grep -i '^cache-control'
for u in https://blog.zzy.tw/ https://zzy.tw/; do curl -sI "$u" | grep -iE '^(cache-control|x-robots-tag)'; done
for u in https://zzy-blog-preview.zzy-portal.workers.dev/ https://zzy-portal-preview.zzy-portal.workers.dev/ https://zzy-portal.zzy-portal.workers.dev/; do curl -sI "$u" | grep -i '^x-robots-tag'; done
```

Expected：
- 第一條：`301` 與 `location: https://zzy.tw/abc`。
- 兩個 robots.txt 都含各自的 `Sitemap:` 行。
- `/_astro` 資源：`cache-control: public, max-age=31536000, immutable`。
- `og.png`：`cache-control: public, max-age=86400`。
- 兩個正式網域的首頁：`cache-control: public, max-age=0, must-revalidate`，而且沒有 `x-robots-tag`。
- 三個 workers.dev 網址：都是 `x-robots-tag: noindex`。

- [ ] **Step 4: 對正式網址跑爬蟲、schema 驗證與 Lighthouse**

```bash
cd /Users/kevin/Desktop/github/blog/sites/blog
node scripts/seo-audit.mjs --blog-origin https://blog.zzy.tw --portal-origin https://zzy.tw --blog-token <BLOG_RUM_TOKEN> --portal-token <PORTAL_RUM_TOKEN>
node scripts/validate-jsonld.mjs https://blog.zzy.tw/ https://blog.zzy.tw/about https://blog.zzy.tw/blog/markdown-syntax https://zzy.tw/
```

Expected: seo-audit 12/12 PASS（不加 `--preview`）；validate-jsonld 全部 `errors=0`。

然後對 Task 14 Step 8 同樣的 12 個路徑（換成正式網域）跑 `lighthouse-batch`，輸出到 `$SCRATCH/lh-stage2`。

通過條件：
- 同 Task 14 Step 8，但一般頁不再有 `is-crawlable` 例外，所以 SEO 必須等於 100。
- `/search` 與 404 頁仍允許 `is-crawlable` 失敗，404 頁仍允許 `http-status-code` 失敗。
- mobile Performance 低於 95 時，依 §7 的分數例外處理：把頁面、分數、扣分 audit、已試過的修法寫進 `STATE`，交由 Kevin 決定，不擋其他項目。

- [ ] **Step 5: Web Analytics**

- MCP 呼叫 `GET /accounts/{ACCOUNT}/rum/site_info/list`。Expected: 2 筆。
- 請 Kevin 用瀏覽器在兩站各開幾頁。10 分鐘後用 MCP 呼叫 `POST /graphql`，body 是 `{ "query": "…" }`，query 為：

  `viewer.accounts(filter: {accountTag: "<ACCOUNT>"}).rumPageloadEventsAdaptiveGroups(limit: 10, filter: {date_geq: "<今天>", siteTag_in: ["<BLOG_RUM_SITE_TAG>", "<PORTAL_RUM_SITE_TAG>"]}) { count dimensions { siteTag } }`

  Expected: 兩個 siteTag 的 `count` 都大於 0。
- GraphQL 呼叫失敗時：改請 Kevin 到 Cloudflare dashboard → Web Analytics 確認兩個 site 都有瀏覽數，並記錄他的回覆。

- [ ] **Step 6: 記錄並 commit**

在 `STATE` 寫 `STAGE2=PASS <日期> …`（附上例外說明），然後：

```bash
git add docs/superpowers/plans/2026-10-24-seo-analytics-state.md && git commit -m "Record production stage results" && git push origin main
```

---

### Task 16: Search Console DNS TXT 與搜尋引擎登錄（獨立的最後階段）

**Files:**
- Modify: `STATE`

**Interfaces:**
- Consumes: Kevin 提供的 TXT 值（格式 `google-site-verification=…`）。
- Produces: `STATE` 的 `GSC_TXT_RECORD_ID`。

- [ ] **Step 1: 等 Kevin 提供 TXT 值**

請 Kevin 在 Google Search Console 新增「網域」資源 `zzy.tw`，選 DNS 驗證，把 TXT 值貼給你。沒拿到就不要繼續；這一步不擋其他 task。

- [ ] **Step 2: 新增 TXT 記錄（§6.7-1 已授權）**

`POST /zones/{Z}/dns_records`，body `{ "type": "TXT", "name": "zzy.tw", "content": "<Kevin 提供的值>", "ttl": 1, "comment": "Google Search Console verification" }`。

- 預期回應：`result.id`。把它寫成 `GSC_TXT_RECORD_ID`。
- 失敗時：不重試，回報錯誤原文。

- [ ] **Step 3: 驗證 DNS**

Run: `dig +short TXT zzy.tw @1.1.1.1`
Expected: 輸出中有 Kevin 提供的那個值（含引號）。

- [ ] **Step 4: 請 Kevin 完成帳號端的操作**

請 Kevin：
- 在 Search Console 按「驗證」；
- 提交 `https://zzy.tw/sitemap.xml` 與 `https://blog.zzy.tw/sitemap-index.xml`；
- 到 Bing Webmaster Tools 選「從 Google Search Console 匯入」。

他回覆完成後，在 `STATE` 加 `GSC=verified, sitemaps submitted; BING=imported`，然後 commit 並 push（訊息 `Record search engine registration`）。

---

## 執行備註

1. RUM API 的回應同時有 `site_tag`（識別碼）與 `site_token`（beacon token），所以 beacon 用的是 `snippet` 裡的 token（Task 8）。
2. Crawler Hints 的寫入端點是推論出來的，只試一次，失敗就交給 Kevin 在 dashboard 操作（Task 13）。
3. `_headers` 的主機名規則對 404 回應是否生效，文件沒有說明，由 Task 14 Step 7 實測後決定 seo-audit 的檢查範圍。

## 設計條目 → task 對照

| 設計條目 | Task |
|---|---|
| §2 站名 `SEO_NAME`、摘要文案、/about 開頭句 | Copy 區塊；1、11 |
| §6.1 搜尋用站名、視覺站名不改 | 1（title、og:site_name）、3（WebSite.name）、11 |
| §6.1 Person（alternateName ccy、zzy）、`@id` 互指、不放 image／jobTitle | 1（常數）、3、11 |
| §6.1 Person 常數放 `site.config.ts`；portal 寫死同一份 | 1、11（兩邊測試都斷言 Copy 的 `PERSON`） |
| §6.2 portal title、og:title、description、og:description | 11 |
| §6.2 靜態 `<a href>` 連到部落格與 GitHub | 11 |
| §6.2 bio 取代 `.hero-description`、`lang="zh-Hant-TW"`、`<html lang="en">` | 11 |
| §6.2 canonical、OG（1200×630 og:image＋alt）、Twitter card | 11、12（og.png） |
| §6.2 og:image 用部落格產生器；favicon.ico、apple-touch-icon 由 favicon.svg 轉檔 | 2、7（工具）、12 |
| §6.2 JSON-LD WebSite＋Person | 11 |
| §6.2 sitemap.xml、robots Sitemap 行、404.html、site.webmanifest | 12 |
| §6.2 `www` → 301 → apex（保留路徑） | 13 |
| §6.3 標題三種格式 | 1 |
| §6.3 描述（首頁、/about、文章、其他頁；CommonPage 接 description） | 1 |
| §6.3 /about 開頭句與 bio、原有三段保留 | 1 |
| §6.3 語言（zh-Hant-TW／zh_TW、frontmatter language 對應） | 1 |
| §6.3 JSON-LD 首頁、文章（含 BreadcrumbList 無結尾斜線）、/about | 3 |
| §6.3 文章 og:image（標題＋`SEO_NAME`、黑白、中文）、og:image:alt、article:* | 2 |
| §6.3 sitemap lastmod、排除 /search 與 404、/search noindex、標籤頁保留 | 4 |
| §6.3 RSS language、lastBuildDate | 4 |
| §6.3 KaTeX font-display、forced reflow、checkbox 名稱、label-content-name-mismatch | 5 |
| §6.3 `public/_headers`（`/_astro/*` immutable、HTML 重新驗證） | 6 |
| §6.3 preview 不被索引：兩站 `_headers` 的 workers.dev 規則；404 實測 | 6、12、14（Step 7） |
| §6.3 canonical、sitemap、站內連結無結尾斜線 | 1（測試）、3、4 |
| §6.3 favicon.ico、site.webmanifest | 7 |
| §6.4 「Markdown 基本語法」、LaTeX 語法句 | 10 |
| §6.5 兩個 RUM site（auto_install false） | 8 |
| §6.5 兩站每頁手動 beacon、不用自動注入 | 9、11、12（404） |
| §6.5 verify-static 只放行 cloudflareinsights、UPSTREAM 記錄例外 | 9 |
| §6.6 Search Console DNS TXT、提交 sitemap、Bing 匯入 | 16 |
| §6.6 Crawler Hints | 13 |
| §6.7-1 Cloudflare 變更（RUM、轉址＋DNS 備援、Crawler Hints、TXT） | 8、13、16 |
| §6.7-2 部落格 push → preview；正式站由 Kevin dispatch | 14、15 |
| §6.7-3 portal 先備份、正式部署前確認 | 11、15 |
| §7 Lighthouse 門檻與分數例外 | 5（本機）、14、15 |
| §7 爬蟲逐頁（title 含 `SEO_NAME`、description、canonical、lang、og:image、JSON-LD） | 1–4（離線）、14、15（線上） |
| §7 schema.org 驗證器 | 14、15 |
| §7 portal 不執行 JS 也有部落格連結 | 11、14 |
| §7 `curl -I https://www.zzy.tw/abc` → 301 | 13、15 |
| §7 兩站 sitemap 200、列在 robots、帶 lastmod、不含 /search | 4、12、14、15 |
| §7 每頁 beacon、RUM 2 筆、dashboard 出現瀏覽數 | 8、9、11、12、14、15 |
| §7 外觀無退化（1440／390、亮／暗） | 14 |
| §7 `npm run build` 通過、CI preview 部署成功（含離線 `test:seo`） | 每個部落格 task、6（CI）、14 |
