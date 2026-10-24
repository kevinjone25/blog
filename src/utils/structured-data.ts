import config from 'virtual:config'
import { HOME_DESC, HOME_TITLE, PERSON, SEO_NAME } from '@/site-config'
import { DEFAULT_LANGUAGE } from '@/utils/lang.mjs'

export type JsonLdGraph = { '@context': 'https://schema.org'; '@graph': Record<string, unknown>[] }

const ORIGIN = 'https://blog.zzy.tw'
const PERSON_REF = { '@id': PERSON['@id'] }
const graph = (nodes: Record<string, unknown>[]): JsonLdGraph => ({
  '@context': 'https://schema.org',
  '@graph': [{ ...PERSON, alternateName: [...PERSON.alternateName], sameAs: [...PERSON.sameAs] }, ...nodes]
})

export const homeGraph = (): JsonLdGraph =>
  graph([
    { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: SEO_NAME, inLanguage: DEFAULT_LANGUAGE.lang, publisher: PERSON_REF },
    { '@type': 'Blog', '@id': `${ORIGIN}/#blog`, url: `${ORIGIN}/`, name: HOME_TITLE, description: HOME_DESC, inLanguage: DEFAULT_LANGUAGE.lang, author: PERSON_REF, publisher: PERSON_REF }
  ])

export const profilePageGraph = (): JsonLdGraph =>
  graph([
    { '@type': 'ProfilePage', '@id': `${ORIGIN}/about#profile`, url: `${ORIGIN}/about`, name: `About ${config.titleDelimiter} ${SEO_NAME}`, inLanguage: DEFAULT_LANGUAGE.lang, mainEntity: PERSON_REF }
  ])

export const blogPostingGraph = (input: {
  url: string
  title: string
  description: string
  published: string
  modified: string
  image: string
  lang: string
  tags: string[]
}): JsonLdGraph =>
  graph([
    {
      '@type': 'BlogPosting',
      '@id': `${input.url}#article`,
      url: input.url,
      headline: input.title,
      description: input.description,
      datePublished: input.published,
      dateModified: input.modified,
      image: input.image,
      inLanguage: input.lang,
      ...(input.tags.length ? { keywords: input.tags } : {}),
      mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
      author: PERSON_REF,
      publisher: PERSON_REF
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: HOME_TITLE, item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${ORIGIN}/blog` },
        { '@type': 'ListItem', position: 3, name: input.title, item: input.url }
      ]
    }
  ])
