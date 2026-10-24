import type { APIRoute } from 'astro'
import { getBlogCollection } from 'astro-pure/server'
import { SEO_NAME } from '@/site-config'
import { renderOgImage } from '@/utils/og-image.mjs'

export const prerender = true

export async function getStaticPaths() {
  const posts = await getBlogCollection()
  return posts.map((post) => ({ params: { id: post.id }, props: { title: post.data.title } }))
}

export const GET: APIRoute = async ({ props }) =>
  new Response(
    new Uint8Array(await renderOgImage({ label: 'blog.zzy.tw', title: props.title, footer: SEO_NAME })),
    { headers: { 'Content-Type': 'image/png' } }
  )
