import { fileURLToPath } from 'node:url'
import { readPosts } from '../../src/utils/sitemap-lastmod.mjs'
import { resolveLanguage } from '../../src/utils/lang.mjs'

export const CONTENT_DIR = fileURLToPath(new URL('../../src/content/blog/', import.meta.url))
export const iso = (d) => new Date(d).toISOString()

// Expectations are derived from src/content/blog, so adding or editing a post never needs a test edit.
export async function loadPosts(dir = CONTENT_DIR) {
  const posts = (await readPosts(dir)).map(({ id, frontmatter: f }) => {
    const published = iso(f.publishDate), modified = iso(f.updatedDate ?? f.publishDate)
    const tags = [...new Set((f.tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
    return { id, route: `/blog/${id}`, title: String(f.title), published, modified, tags, language: resolveLanguage(f.language) }
  })
  return posts
}
export const postByRoute = (posts) => new Map(posts.map((p) => [p.route, p]))
export const newestModified = (posts) => new Date(Math.max(...posts.map((p) => Date.parse(p.modified))))
