# zzy / Blog

以 [Pure](https://github.com/cworld1/astro-theme-pure) 建立的 Astro 純靜態部落格，目標網域為 **https://blog.zzy.tw/**。目前不放示範文章，內容之後再加。

2026-10-23 已發布至 **https://blog.zzy.tw/**；預覽環境為 https://zzy-blog-preview.zzy-portal.workers.dev/ 。正式站 DNS、HTTPS、必要頁面、主要 CSS／JavaScript／自託管字型及 Pagefind 靜態資產均已驗證。RSS 為合法的空 feed，示範文章與測試文章均未發布。

評論、評論計數、瀏覽計數與 Waline 服務均已移除；文章、RSS、sitemap 與 Pagefind 搜尋索引在建置時產生。搜尋會在瀏覽器讀取本站的靜態索引，不需要資料庫或執行時 API。前端必要的選單、主題、搜尋和圖片互動仍可使用 JavaScript。

## 本機開發

建議 Node.js 24；至少需要符合此專案 Astro 版本要求的 Node.js 22.19.0。

```sh
npm ci
npm run dev
```

本地預設網址為 http://localhost:4321 。修改站名、描述、選單與 GitHub 連結可編輯 `src/site.config.ts`。主題的本地原始碼在 `packages/pure/`，來源與授權見 [UPSTREAM.md](./UPSTREAM.md)。

## 新增文章

在 `src/content/blog/` 新增 Markdown 或 MDX，例如 `hello-world.md`：

```md
---
title: 'Hello world'
description: 'A short description of this post.'
publishDate: 2026-10-23
tags: ['notes']
draft: false
---

Your article starts here.
```

`title`、`description`、`publishDate` 必填；`tags` 與 `draft` 可省略。標題最多 60 字元，描述最多 160 字元。可先設定 `draft: true` 保存未發布文章。檔名用作文章路徑，例如 `/blog/hello-world`；文章中不需要加評論設定。

圖片可以放在文章同層目錄並使用相對路徑。需要 MDX 元件時使用 `.mdx` 副檔名。尚無文章時，首頁、文章列表、標籤與封存頁顯示空白狀態，RSS 保持合法的空 feed。

## 建置與發布

以下指令必須在這個目錄 `sites/blog/` 執行，與入口站的部署分開：

```sh
npm run build
npm run preview
```

`build` 先重新產生 Astro 的內容快取，再執行 Astro 檢查、靜態建置與 `scripts/verify-static.mjs`；刪除最後一篇文章後也能正確回到空站。驗證涵蓋必要靜態頁、RSS／sitemap、正式網域的 canonical、搜尋索引、評論元件與伺服器產物殘留，以及未修改的上游示範文章。此驗證不取代瀏覽器或線上檢查。

本次另以不發布的暫時文章確認中文、MDX 元件、KaTeX、程式碼高亮、文章目錄、標籤、RSS、靜態搜尋及草稿排除，驗證後已移除。空站在 Chrome 的 320、390、768、1440px 版面、手機選單、鍵盤操作、明暗模式與減少動態效果均通過，沒有第三方執行時請求或 JavaScript 錯誤。

先發布獨立預覽環境：

```sh
npm run deploy:preview
```

確認後發布正式環境：

```sh
npm run deploy
```

部署使用固定版本 Wrangler `4.151.3`。首次操作需要現有 Cloudflare 登入或 API token；不要把憑證寫入專案。

| 環境 | Worker | 網域範圍 |
| --- | --- | --- |
| Preview | `zzy-blog-preview` | `workers.dev`，不綁正式網域 |
| Production | `zzy-blog` | `blog.zzy.tw` |

Wrangler 只上傳 `dist/`，沒有 Worker 程式入口、SSR adapter、KV 或資料庫綁定。不明路徑使用靜態 404 頁；`html_handling: 'drop-trailing-slash'` 與 Astro 的 canonical 格式一致。[Cloudflare HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/)

此配置不會部署或改動 `zzy.tw` 入口網站；本次已確認入口站內容與原版本一致。日後每次部署仍需另外驗證正式網址、憑證和內容，不能只以設定檔存在判斷發布成功。
