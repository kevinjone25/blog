# SEO 強化與 Cloudflare Web Analytics 設計

日期：2026-10-24
範圍：portal（https://zzy.tw）與部落格（https://blog.zzy.tw）

## 1. 意圖

Kevin 希望：

- 搜「zzy」時，portal 與部落格出現在搜尋結果最上面，結果顯示名字「Kevin」與他的 bio。
- 搜主題（例：「LaTeX 語法」）時，出現他寫的對應文章。
- 能看到兩個站的流量（Cloudflare Web Analytics）。

排名本身取決於內容、外部連結與時間，不在本專案能控制的範圍。本專案的目標是讓兩站在技術上「無可挑剔」：搜尋引擎能發現、讀懂、正確歸屬到 Kevin 這個人，分享時呈現漂亮，速度與無障礙分數頂滿。

## 2. 使用者已決定的事

- 兩個站都做（portal 這次納入範圍，不再「維持原狀」）。
- 搜尋結果呈現的名字：**Kevin**；bio：**人生就像瑞士捲，有的人在瑞士，有的人在卷**（使用者原文「人生就像瑞士捲 有的人在瑞士 有的人在卷」；全形逗號為我補上，「卷」照原文保留）。
- Kevin 的本名代號是 **ccy**；網域 zzy.tw 是當初打錯，但 zzy 也要能被搜到。給搜尋引擎看的名字寫 **Kevin (ccy / zzy)**；頁面上看得到的站名（「zzy / Blog」、portal 的 zzy）維持不改。
- 摘要文案（bio 21 字不足 50 字，所以後面接一句說明）：
  - portal：「人生就像瑞士捲，有的人在瑞士，有的人在卷。這裡是 Kevin（ccy / zzy）的個人入口，通往部落格與 GitHub。」
  - 部落格首頁：「人生就像瑞士捲，有的人在瑞士，有的人在卷。Kevin（ccy / zzy）的部落格：筆記、想法，和值得留下的東西。」
- /about 開頭加一句「I'm Kevin, also known as ccy and zzy.」與 bio，原有三段文字保留。
- portal 上的 bio 取代 hero 底下那句「A few links. A universe of possibilities.」；主標題「Stay curious. Keep exploring.」保留英文。
- 對外帳號只有 GitHub（`kevinjone25`），沒有 LinkedIn、X 等其他帳號。
- 兩站都開 Cloudflare Web Analytics。
- 稽核工具：不裝 Screaming Frog，改用 Lighthouse＋自寫爬蟲；Front Matter CMS 的內容 SEO 規則（title ≤60、description 50–160、關鍵字出現在 title／description／slug／首段／小標）用腳本照做。

## 3. 目標、非目標、反目標

**目標（全部可檢查，見第 7 節）**

1. 品牌實體：兩站都宣告同一個 Person（Kevin，別名 zzy，bio，GitHub），並互相連結。
2. 可發現性：兩站都有正確的 sitemap、robots.txt；Google Search Console 與 Bing Webmaster Tools 驗證並提交 sitemap。
3. 每頁可讀懂：唯一 title、合格 description、自我 canonical、正確 `lang`、完整 Open Graph／Twitter card、對應的 JSON-LD。
4. 分數：所有受測頁 Lighthouse SEO、Best Practices、Accessibility 皆 100；Performance desktop 100、mobile ≥95。
5. Web Analytics：兩站每頁都送出 beacon，Cloudflare dashboard 看得到瀏覽數。

**非目標**

- 保證任何關鍵字的排名。
- 外部連結建設、付費 SEO 工具。
- 改變剛對齊 Pure demo 的版面外觀（只在既有位置調文字，例如 meta、about 內文）。
- HSTS、SSL 模式、TLS 版本等與 SEO 無直接關係的 Cloudflare 安全設定。

**反目標（就算「能用」也算失敗）**

- 外觀與 Pure demo 的一致性被破壞。
- 加入 Cloudflare Web Analytics 以外的任何第三方執行期請求（如 Google Analytics、字型 CDN）。
- 為了 SEO 硬塞關鍵字，讓文章讀起來不自然。
- 公開 Email（沿用 `UPSTREAM.md` 原則）。
- 弄壞現有部署流程（push main → preview；手動 dispatch → production）。
- 動到 zone 內其他主機名（mountain.zzy.tw、hci、laptop 等）。

## 4. 現況（2026-10-24 稽核摘要）

Lighthouse（P/A/BP/SEO）：

| 頁面 | Mobile | Desktop |
|---|---|---|
| zzy.tw/ | 98/100/100/100 | 100/100/100/100 |
| blog / | 98/100/100/100 | 100/100/100/100 |
| blog /blog | 95/100/100/100 | 100/100/100/100 |
| blog /blog/markdown-syntax | 87/94/100/100 | 100/94/100/100 |
| blog /about | 98/100/100/100 | 100/100/100/100 |

文章頁扣分來源：KaTeX 字型缺 `font-display`、forced reflow、任務清單 disabled checkbox 缺 label；多頁有 `label-content-name-mismatch`。

主要缺口（依影響排序；位置以 2026-10-24 的程式碼為準）：

1. portal 靜態 HTML 沒有連到部落格（連結全由 JS 產生），且缺 canonical、og:image、og:url、Twitter card、JSON-LD — portal `dist/index.html:4-14`、`dist/app.js:23-47`、`dist/config.js:4`
2. portal 沒有 sitemap.xml（404），robots.txt 沒有 Sitemap 行 — portal `dist/robots.txt`
3. 兩站都沒有 JSON-LD — 部落格 `src/components/BaseHead.astro`（約 :86）、`src/layouts/BlogPost.astro:23`
4. `www.zzy.tw` 回 522（DNS 有 proxied CNAME，但沒有轉址規則）
5. 部落格 sitemap 沒有 lastmod，且收錄 /search 等薄頁 — sitemap 由 `packages/pure/index.ts:42` 的預設 `sitemap()` 產生
6. 文章 og:image 一律是通用的 `social-card.png`；缺 og:image:alt、article:modified_time、article:tag — `BaseHead.astro:13, 56-66`、`BlogPost.astro:18`
7. `<html lang="en-US">`、og:locale=en_US，但內容是中文 — `src/layouts/BaseLayout.astro:24`、`src/site.config.ts:8-12`、`BaseHead.astro:55`
8. 標題與描述偏弱：首頁 title 是「Home • zzy / Blog」；/about 用站台預設描述 — `src/pages/index.astro:11`、`src/layouts/CommonPage.astro:10`、portal `dist/index.html:7-10`
9. 站上沒有任何 LaTeX 內容（全文「LaTeX」出現 0 次）
10. 沒有 manifest、沒有 /favicon.ico；portal 沒有 apple-touch-icon
11. 結尾斜線轉址是 307（Workers Static Assets 的 `html_handling` 行為）
12. 所有資源 `cache-control: max-age=0, must-revalidate`，沒有 `_headers`；portal 404 回空白內容（`wrangler.jsonc` 設了 404-page，但 `dist` 沒有 `404.html`）

已確認沒問題的：Cloudflare 沒有封鎖爬蟲（Bot Fight Mode 關、AI 爬蟲封鎖關、managed robots.txt 關、無自訂 WAF 規則）；Always Use HTTPS 開；兩站都沒有 `x-robots-tag`；部落格 robots.txt 有 Sitemap 行；文章 title、description、slug 符合 Front Matter 規則。

## 5. 限制

- **部落格**：Astro 6.4.8＋Pure 1.4.9（`file:packages/pure`，已有本地修改），`output: 'static'`，Cloudflare Workers Static Assets（Worker `zzy-blog`、`zzy-blog-preview`）。repo 是 `~/Desktop/github/blog/sites/blog`（GitHub `kevinjone25/blog`，private）。CI：push main → preview；Actions 手動 dispatch `target=production` → blog.zzy.tw（指令是 `deploy --env=`）。`npm run build` 會跑 `astro check`、`astro build` 和 `scripts/verify-static.mjs`。
- **portal**：手寫靜態站，原始碼即 `~/Desktop/github/blog/dist/`（無建置步驟），**不是 git repo**、也沒有接 GitHub CI。部署方式是在 `~/Desktop/github/blog` 執行本機 wrangler（`npm run deploy`；preview 用 `npm run deploy:preview`）。部落格 repo 位於 portal 資料夾內的 `sites/blog`，兩者互不影響。
- **Cloudflare**：帳號 `dc6a1a24f6283359bb4fed063050d736`，zone `zzy.tw`（Free 方案）。這個 session 可透過 Cloudflare MCP 操作 API。
- 主題與內容原則見部落格 `UPSTREAM.md`：靜態輸出、沒有評論與計數、沒有第三方執行期請求（本專案為 Cloudflare Web Analytics 開一個例外，需寫回 `UPSTREAM.md`）。
- 不新增任何「瀏覽器端」的第三方依賴。建置期依賴可以加，但要最小化。

## 6. 設計

### 6.1 品牌實體（兩站共用）

- 站名（給搜尋引擎看的）統一為 **Kevin (ccy / zzy)**。頁面上的視覺站名（部落格頁首的「zzy / Blog」）不改。
- Person 實體，以 portal 為正本：
  - `@id: https://zzy.tw/#person`、`name: Kevin`、`alternateName: ["ccy", "zzy"]`
  - `description:` bio、`url: https://zzy.tw/`
  - `sameAs: ["https://github.com/kevinjone25", "https://blog.zzy.tw/"]`
- 部落格所有 JSON-LD 的 `author`／`publisher` 都以 `@id` 指向同一個 Person。
- Person 不放 `image`、`jobTitle` 這類使用者沒提供的資料（我的判斷）。
- 資料來源（我的判斷）：
  - 部落格的 Person 常數集中放在 `src/site.config.ts`。
  - portal 沒有建置步驟，只能在 HTML 裡寫死同一份；兩邊的值要一致。

### 6.2 portal（zzy.tw）

- `<title>`、`og:title`：`Kevin (ccy / zzy)`。meta description、`og:description`：第 2 節的 portal 摘要文案。
- 靜態 HTML 內要有真正的 `<a href>` 連到 https://blog.zzy.tw/ 與 GitHub。JS 可以在此之上做加強，但不能是唯一來源。
- bio 以可見文字取代 hero 底下那句英文（`.hero-description`），版面不變。
- 語言（我的判斷）：portal 主要內容是英文，`<html lang="en">` 維持；bio 那個元素加 `lang="zh-Hant-TW"`。
- 補齊 canonical、Open Graph（含 1200×630 PNG og:image 與 og:image:alt）、Twitter card（summary_large_image）。
- 圖檔（我的判斷）：
  - portal 的 og:image 用部落格那套 og:image 產生器產生一次，內容放「Kevin (ccy / zzy)」與 bio，產出的 PNG 直接放進 `dist/`。
  - `favicon.ico`、`apple-touch-icon.png` 由現有的 `favicon.svg` 轉檔。
  - portal 不引入建置步驟。
- JSON-LD：`WebSite`（name: Kevin (ccy / zzy)）＋`Person`（6.1）。
- 新增 `sitemap.xml`；`robots.txt` 加 Sitemap 行；新增 `404.html`（有內容，回 404）；補 `favicon.ico`、`apple-touch-icon.png`、`site.webmanifest`。
- `www.zzy.tw` → 301 → `https://zzy.tw/`：用 Cloudflare Single Redirect 規則，保留路徑。

### 6.3 部落格（blog.zzy.tw）

- **標題**：
  - 首頁 `Kevin (ccy / zzy) 的部落格`
  - 列表與一般頁 `<頁名> | Kevin (ccy / zzy)`
  - 文章 `<文章標題> | Kevin (ccy / zzy)`
- **描述**：首頁用第 2 節的部落格首頁摘要文案；/about 以 bio 開頭、後接一句介紹（實際文案由計畫定死，至少 50 字）；文章用 frontmatter `description`；其他頁各寫一句。讓 `CommonPage` 能接收 `description`，/about 不再落回站台預設。
- **/about 內文**：開頭加「I'm Kevin, also known as ccy and zzy.」與 bio（使用者已同意），原有三段保留。
- **語言**：站台預設 `lang="zh-Hant-TW"`、`og:locale=zh_TW`；文章依 frontmatter `language` 對應（`中文` → `zh-Hant-TW`，英文 → `en`；沒填就用站台預設）。介面上的英文標籤不翻譯。
- **JSON-LD**：
  - 首頁：`WebSite`＋`Blog`（author → Person）
  - 文章：`BlogPosting`（headline、description、datePublished、dateModified、image、inLanguage、keywords＝tags、mainEntityOfPage、author）＋`BreadcrumbList`（`https://blog.zzy.tw/` › `https://blog.zzy.tw/blog` › 文章網址，一律無結尾斜線）
  - /about：`ProfilePage`（mainEntity → Person）
- **og:image**：每篇文章在建置時自動產生 1200×630 PNG。圖上放文章標題與「Kevin (ccy / zzy)」，黑白配色呼應主題，需支援中文字。列表等頁沿用通用圖。補 og:image:alt、article:published_time、article:modified_time、article:tag。
- **sitemap**：
  - 每個 URL 帶 lastmod（文章用 updatedDate／publishDate）
  - 排除 /search 與 404，/search 加 `noindex, follow`
  - 標籤頁保留（文章變多後是主題聚合頁）
- **RSS**：補 `language`、`lastBuildDate`。
- **效能與無障礙**：
  - KaTeX 字型加 `font-display: swap`；處理 forced reflow
  - 任務清單 checkbox 補可及名稱
  - 修 `label-content-name-mismatch`
  - 新增 `public/_headers`：`/_astro/*` 帶 hash 的資源給 `public, max-age=31536000, immutable`，HTML 維持重新驗證
- **內部連結**：canonical、sitemap 與站內連結一律用無結尾斜線的正式網址，避免觸發 307。
- **補站名資產**：`favicon.ico`、`site.webmanifest`（apple-touch-icon 已有）。
- **preview 不被索引**（我的判斷）：
  - 部落格與 portal 的 `_headers` 各加一條以主機名比對的規則：`https://:worker.:sub.workers.dev/*` → `X-Robots-Tag: noindex`。Cloudflare 文件明確支援這種寫法。
  - 只有 workers.dev 網址會套用，正式網域不受影響，也不必修改 CI 或建置。
  - 這條規則對 404 回應是否生效，文件沒寫，驗收時實測。

### 6.4 既有文章微調（〈Markdown 語法指南〉）

- 小標「基本語法」改為「Markdown 基本語法」。
- 數學式段落點明這是 LaTeX 語法，例如「用 LaTeX 語法寫數學式」，讓「LaTeX」自然出現。
- 不為關鍵字改寫其他段落。

### 6.5 Cloudflare Web Analytics

- 兩個 hostname 各建一個 RUM site（`POST /accounts/{account_id}/rum/site_info`，`{"host": "<hostname>", "auto_install": false}`），數據分開看。
- 兩站每頁 `</body>` 前放手動 beacon：`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"<site_tag>"}'></script>`。site_tag 是公開值，可以寫進原始碼。
- 不用自動注入：官方文件沒說明自動注入對 Workers 回應是否有效，而且自動注入會作用到整個 zone 的其他子網域。
- `verify-static.mjs` 的第三方檢查若會擋下這支 script，就只對 `static.cloudflareinsights.com` 放行。`UPSTREAM.md` 記下這個例外。

### 6.6 搜尋引擎登錄（需要 Kevin 操作帳號）

- Google Search Console：建立 `zzy.tw` 的「網域」資源（一次涵蓋兩站），以 DNS TXT 驗證。Kevin 把 TXT 值給我，我透過 Cloudflare API 加入記錄。驗證後提交兩站 sitemap。
- Bing Webmaster Tools：從 Search Console 匯入。
- 開啟 Cloudflare Crawler Hints（免費，透過 IndexNow 通知 Bing 等內容更新）。

### 6.7 會對外生效的變更清單（核准本文件即授權）

1. Cloudflare：
   - 建立 2 個 Web Analytics site。
   - 新增 `www.zzy.tw` 的 Single Redirect 規則。若規則因 DNS 目標無效而沒生效，只准把 `www` 這一筆記錄改成 proxied 的 `AAAA 100::`（轉址專用的佔位記錄），並先記下原值以便還原。zone 內其他記錄一律不動。
   - 開啟 Crawler Hints。
   - 新增 Search Console 驗證用的 DNS TXT 記錄。這是獨立的最後階段，要等 Kevin 提供 TXT 值，不擋其他工作。
2. 部落格：commit 並 push 到 main（自動上 preview）；正式站由 Kevin 在 Actions 手動 dispatch。
3. portal：preview 驗證後，以本機 wrangler 部署正式站。portal 正式部署前我會再跟 Kevin 確認一次，因為它沒有 CI 與 git 版本可回溯。portal 修改前會先備份整個 `dist/`。

## 7. 驗收方式

用改善前相同的方法（Lighthouse＋爬蟲）重跑，逐條核對。

**受測頁**：兩站 sitemap 列出的所有 HTML 頁，加上部落格的 /search 與兩站的 404 頁（目前約 12 頁）。

**分兩階段驗收**（我的判斷）：
1. **preview 階段**：頁面層的項目（title、description、canonical、lang、OG、JSON-LD、beacon、Lighthouse、外觀對照）在 preview 驗。
2. **正式站階段**：Kevin 部署部落格正式站、我部署 portal 正式站之後，再驗網域層的項目（www 轉址、正式網域的 robots／sitemap、`_headers`、RUM dashboard、對正式網址的 Lighthouse）。

**分數例外**：
- 若某頁經合理努力仍達不到 mobile Performance ≥95，不擋整個專案。報告寫明該頁分數、扣分原因與已嘗試的修法，交由 Kevin 決定。
- 標了 noindex 的頁（/search、404）拿不到 Lighthouse SEO 100，屬預期例外。
- preview 全站帶 noindex，所以 SEO 100 只在正式站階段驗。

逐條核對項目：

- 第 3 節目標 4 的分數門檻，每頁 mobile 與 desktop 都達標（例外依上述規則回報）。
- 爬蟲逐頁：title 唯一且含「Kevin (ccy / zzy)」、description 50–160 字、canonical 指向自己、`lang` 正確、og:image 是 1200×630 PNG、JSON-LD 為合法 JSON，且型別與欄位符合 6.2／6.3。
- 用 schema.org 驗證器或等效工具驗 JSON-LD 無錯誤。
- portal 在**不執行 JS** 時，HTML 內含 `<a href="https://blog.zzy.tw/">`。
- `curl -I https://www.zzy.tw/abc` → 301 → `https://zzy.tw/abc`。
- 兩站 sitemap 回 200、列在 robots.txt、URL 帶 lastmod；部落格 sitemap 不含 /search。
- 兩站所有頁面 HTML 都含 beacon；Cloudflare RUM site list 有 2 筆；Kevin 實際造訪後 dashboard 出現瀏覽數。
- 外觀無退化：/、/blog、/about、文章頁與 Pure demo 的對照（1440／390、亮／暗）跟改動前一致，只有文字與 meta 不同。
- `npm run build` 通過；CI 的 preview 部署成功。

## 8. 交給實作者決定的部分

- og:image 的產生方式與工具（例如建置期的 satori＋resvg，或其他能渲染中文的方案）、中文字型的選擇與子集化。字型必須是可再散布授權，只在建置期使用，不送到瀏覽器。
- JSON-LD 的注入位置與元件拆法。
- 「其他頁各寫一句」描述的實際文案（英文或中文皆可，與頁面語言一致）。
- forced reflow 的具體修法。
- 是否需要調整 `verify-static.mjs`，以及調整範圍。
