import type { APIRoute } from 'astro'
import rss from '@astrojs/rss'
import { getBlogCollection, sortMDByDate } from 'astro-pure/server'
import config from 'virtual:config'

// Rendered once at build time, including when no posts have been published.
export const GET: APIRoute = async ({ site }) => rss({
  title: config.title,
  description: config.description,
  site: site!,
  trailingSlash: false,
  stylesheet: '/scripts/pretty-feed-v3.xsl',
  items: sortMDByDate(await getBlogCollection()).map(post => ({
    title: post.data.title,
    description: post.data.description,
    pubDate: post.data.publishDate,
    link: `/blog/${post.id}`,
    categories: post.data.tags
  }))
})
