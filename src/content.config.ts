// Modified for zzy: a single static blog collection with no comment configuration.
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => z.object({
    title: z.string().max(60),
    description: z.string().max(160),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.object({
      src: image(), alt: z.string().optional(), inferSize: z.boolean().optional(),
      width: z.number().optional(), height: z.number().optional(), color: z.string().optional()
    }).optional(),
    tags: z.array(z.string().trim().min(1)).default([]).transform(tags => [...new Set(tags.map(tag => tag.toLowerCase()))]),
    language: z.string().optional(),
    draft: z.boolean().default(false),
    pin: z.boolean().optional()
  })
})
export const collections = { blog }
