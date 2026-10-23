import type { Config, IntegrationUserConfig, ThemeUserConfig } from 'astro-pure/types'

// Modified from Astro Theme Pure for zzy's static, comment-free blog.
export const theme: ThemeUserConfig = {
  title: 'zzy / Blog',
  author: 'zzy',
  description: 'Notes, stories and small discoveries.',
  favicon: '/favicon.svg',
  socialCard: '/images/social-card.png',
  locale: {
    lang: 'en-US',
    attrs: 'en_US',
    dateLocale: 'en-US',
    dateOptions: { day: 'numeric', month: 'short', year: 'numeric' }
  },
  logo: { src: '/images/avatar.svg', alt: 'zzy' },
  titleDelimiter: '•',
  prerender: true,
  head: [],
  customCss: [],
  header: {
    menu: [
      { title: 'Blog', link: '/blog' },
      { title: 'Archive', link: '/archives' },
      { title: 'Tags', link: '/tags' },
      { title: 'About', link: '/about' }
    ]
  },
  footer: {
    year: `© ${new Date().getFullYear()} `,
    links: [],
    credits: true,
    social: [
      { icon: 'github', label: 'GitHub', href: 'https://github.com/kevinjone25' },
      { icon: 'rss', label: 'RSS', href: '/rss.xml' }
    ]
  },
  content: {
    externalLinks: { content: '', properties: { rel: 'noopener noreferrer' } },
    blogPageSize: 8,
    share: []
  }
}

export const integ: IntegrationUserConfig = {
  links: { logbook: [], applyTip: [], cacheAvatar: false },
  pagefind: true,
  typography: {
    class: 'prose text-base',
    blockquoteStyle: 'italic',
    inlineCodeBlockStyle: 'modern'
  },
  mediumZoom: {
    enable: true,
    selector: '.prose .zoomable',
    options: { className: 'zoomable' }
  }
}

export default { ...theme, integ } satisfies Config
