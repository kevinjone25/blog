import type { SiteMeta } from 'astro-pure/types'

export interface PageMeta extends SiteMeta {
  description: string
  documentTitle?: string
  lang?: string
  ogLocale?: string
  ogImageAlt?: string
  modifiedDate?: string
  tags?: string[]
}
