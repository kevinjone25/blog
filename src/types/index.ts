import type { SiteMeta } from 'astro-pure/types'
import type { JsonLdGraph } from '@/utils/structured-data'

export interface PageMeta extends SiteMeta {
  description: string
  jsonLd?: JsonLdGraph
  documentTitle?: string
  lang?: string
  ogLocale?: string
  ogImageAlt?: string
  modifiedDate?: string
  tags?: string[]
  robots?: string
}
