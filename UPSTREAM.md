# Pure 上游與本地調整

此部落格使用實際的 [Astro Theme Pure](https://github.com/cworld1/astro-theme-pure)，保留其頁首、頁尾、版面、排版、文章目錄及靜態搜尋元件。

- 上游 commit：`4ecd4762e1e750daf7a51978092d7cea8e14c0d6`
- 模板版本：`4.1.6`
- 隨附 `astro-pure` 套件版本：`1.4.9`
- 授權：[Apache-2.0](./LICENSE)。原始授權與必要來源聲明保留；本地修改不代表上游原版行為。
- 使用 `file:packages/pure` 引用隨專案保留的主題原始碼，讓本地的靜態化與服務移除調整確實生效。

本地調整：

1. 產出模式固定為 `output: 'static'`，移除 Vercel adapter 與伺服器輸出。
2. 移除評論介面、Waline 用戶端、評論計數、瀏覽計數及其設定、掛載與服務依賴。
3. 移除示範文章、文件、履歷、朋友連結與其他主題展示內容；使用者尚未加入文章，首頁與清單提供空白狀態。
4. 使用 `zzy` 的站名、GitHub 與 `blog.zzy.tw` 的正式網址；不公開 Email。
5. 移除隨機語錄、第三方即時統計與不需要的遠端預覽元件。搜尋、RSS、sitemap 和文章頁均由建置產生。
6. 由獨立的 Cloudflare Workers Static Assets 專案託管 `dist/`；只綁定 `blog.zzy.tw`，不改入口站 `zzy.tw` 的設定。網址採無結尾斜線格式。
7. 字型在建置時取得並隨靜態產物自託管；圖片放大改為本機打包的 MediumZoom，移除 npm CDN 依賴。
8. 修正手機折疊導覽的焦點與 ARIA、明暗模式與系統偏好的同步，以及 Pagefind 結果回傳／初始化；保留 Pure 本身的互動方式。
9. 正式建置前清理產生的內容狀態，避免移除最後一篇文章後仍讀取舊快取。
10. BackToTop 改為捲動時才量測版面（避免 forced reflow）；文章「Copy link」按鈕與 /blog「View all posts by years」連結移除與可見文字不符的 aria-label；Markdown 待辦清單的 checkbox 以項目文字作為可及名稱；KaTeX 字型改用 font-display: swap。

Cloudflare Web Analytics 例外：每頁在 </body> 前以 defer 載入 https://static.cloudflareinsights.com/beacon.min.js（token 為公開值）。這是唯一允許的第三方執行期請求；scripts/verify-static.mjs 只放行這一個網址，其他外部 script 與外部樣式表都會讓建置失敗。

這份檔案記錄來源與改動範圍。部署成功與否應以實際 Wrangler 結果及線上驗證為準。
