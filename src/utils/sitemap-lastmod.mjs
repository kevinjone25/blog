import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { parseFrontmatter } from '@astrojs/markdown-remark'

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(file)))
    else if (entry.isFile() && /\.mdx?$/.test(entry.name)) out.push(file)
  }
  return out.sort()
}

export async function readPostDates(contentDir) {
  const posts = []
  for (const file of await walk(contentDir)) {
    const { frontmatter } = parseFrontmatter(await readFile(file, 'utf8'))
    if (frontmatter.draft === true) continue
    const rel = relative(contentDir, file).split(sep).join('/').replace(/\.mdx?$/, '').replace(/\/index$/, '')
    const id = typeof frontmatter.slug === 'string' ? frontmatter.slug : rel.toLowerCase()
    const modified = new Date(frontmatter.updatedDate ?? frontmatter.publishDate)
    const tags = [...new Set((frontmatter.tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
    posts.push({ id, modified, tags })
  }
  return posts
}

export function createLastmodResolver(posts, site) {
  const newest = (list) => list.length ? new Date(Math.max(...list.map((p) => p.modified.getTime()))).toISOString() : undefined
  const safeDecode = (s) => { try { return decodeURIComponent(s) } catch { return s } }
  const overall = newest(posts)
  return (url) => {
    const parts = new URL(url, site).pathname.split('/').filter(Boolean).map(safeDecode)
    if (parts[0] === 'blog' && parts.length === 2) {
      const post = posts.find((p) => p.id === parts[1])
      if (post) return post.modified.toISOString()
    }
    if (parts[0] === 'tags' && parts.length >= 2) {
      const tagged = newest(posts.filter((p) => p.tags.includes(parts[1])))
      if (tagged) return tagged
    }
    return overall
  }
}
