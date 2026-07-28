const {
  defaultLocale,
  getDefaultLocaleText,
  localeBasePath,
  supportedLocales,
} = require('./portal-shared-config')
const { projectThemeConfig } = require('../lib/portal/theme-projection')

hexo.extend.filter.register('before_generate', () => {
  const data = hexo.locals.get('data') || {}
  const profile = data.site_profile || {}
  const navigation = data.navigation || {}
  const portalI18nConfig = {
    defaultLocale,
    storageKey: 'site-locale',
    localeBasePath,
    supportedLocales,
    navMap: {
      '/': 'portal.nav.home',
      '/archives/': 'portal.nav.archives',
      '/categories/': 'portal.nav.categories',
      '/portfolio/': 'portal.nav.portfolio',
      '/contact/': 'portal.nav.contact',
      '/about/': 'portal.nav.about',
      '/link/': 'portal.nav.friends',
    },
    sidebarTextMap: {
      'Recent Posts': 'portal.sidebar.recentPosts',
      Contents: 'portal.sidebar.contents',
      Announcement: 'portal.sidebar.announcement',
      'Post Series': 'portal.sidebar.postSeries',
      Tags: 'portal.sidebar.tags',
      Categories: 'portal.sidebar.categories',
      Archives: 'portal.sidebar.archives',
      'Website Info': 'portal.sidebar.websiteInfo',
      'About This Site': 'portal.sidebar.aboutThisSite',
      Search: 'portal.sidebar.search',
      Articles: 'portal.sidebar.articles',
    },
  }

  const projected = projectThemeConfig({
    themeConfig: hexo.theme.config || {},
    profile,
    navigation,
    buildVersion: process.env.PORTAL_BUILD_VERSION || 'dev',
    portalI18nConfig,
    searchPlaceholder: getDefaultLocaleText(
      'portal.searchPlaceholder',
      'Search articles, pages, and project notes...',
    ),
  })

  if (projected.author) hexo.config.author = projected.author
  if (projected.site_subtitle) hexo.config.subtitle = projected.site_subtitle
  delete projected.author
  delete projected.site_subtitle
  hexo.theme.config = projected
})

// Disable comments on auto-generated listing pages (tags, categories, archives)
hexo.extend.filter.register('before_generate', () => {
  const pages = hexo.locals.get('pages')
  if (!pages || !pages.each) return
  pages.each((page) => {
    if (page.type === 'tags' || page.type === 'categories' || page.layout === 'archive') {
      page.comments = false
    }
  })
})
