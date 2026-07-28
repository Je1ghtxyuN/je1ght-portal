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
  const portfolio = data.portfolio || {}
  const portalI18nConfig = {
    defaultLocale,
    storageKey: 'site-locale',
    localeBasePath,
    supportedLocales,
    navMap: {
      '/': 'nav.home',
      '/archives/': 'nav.archives',
      '/categories/': 'nav.categories',
      '/portfolio/': 'portfolio.title',
      '/contact/': 'nav.contact',
      '/about/': 'nav.about',
      '/link/': 'nav.friends',
    },
    sidebarTextMap: {
      'Recent Posts': 'sidebar.recentPosts',
      Contents: 'sidebar.contents',
      Announcement: 'sidebar.announcement',
      'Post Series': 'sidebar.postSeries',
      Tags: 'sidebar.tags',
      Categories: 'sidebar.categories',
      Archives: 'sidebar.archives',
      'Website Info': 'sidebar.websiteInfo',
      'About This Site': 'sidebar.aboutThisSite',
      Search: 'nav.search',
      Articles: 'sidebar.articles',
    },
  }

  const projected = projectThemeConfig({
    themeConfig: hexo.theme.config || {},
    profile,
    navigation,
    portfolio,
    buildVersion: process.env.PORTAL_BUILD_VERSION || 'dev',
    portalI18nConfig,
    searchPlaceholder: getDefaultLocaleText(
      'search.placeholder',
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
