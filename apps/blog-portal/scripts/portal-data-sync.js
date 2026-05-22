const {
  defaultLocale,
  getDefaultLocaleText,
  localeBasePath,
  siteIdentity,
  supportedLocales,
} = require('./portal-shared-config')

hexo.extend.filter.register('before_generate', () => {
  const data = hexo.locals.get('data') || {}
  const profile = data.site_profile || {}
  const navigation = data.navigation || {}
  const themeConfig = hexo.theme.config || {}
  const portalI18nConfig = JSON.stringify({
    defaultLocale,
    storageKey: 'site-locale',
    localeBasePath,
    supportedLocales,
    navMap: {
      '/': 'portal.nav.home',
      '/blog/': 'portal.nav.blog',
      '/archives/': 'portal.nav.archives',
      '/categories/': 'portal.nav.categories',
      '/portfolio/': 'portal.nav.portfolio',
      '/contact/': 'portal.nav.contact',
      '/about/': 'portal.nav.about',
      '/link/': 'portal.nav.friends',
    },
  })

  const ensureInjectEntry = (entries = [], nextEntry) => {
    const filteredEntries = entries.filter((entry) => entry !== nextEntry)
    filteredEntries.push(nextEntry)
    return filteredEntries
  }

  if (profile.owner && profile.owner.display_name) {
    hexo.config.author = profile.owner.display_name
  }

  if (profile.subtitle) {
    hexo.config.subtitle = profile.subtitle
  }

  themeConfig.nav = themeConfig.nav || {}
  themeConfig.avatar = themeConfig.avatar || {}
  themeConfig.footer = themeConfig.footer || {}
  themeConfig.footer.owner = themeConfig.footer.owner || {}
  themeConfig.subtitle = themeConfig.subtitle || {}
  themeConfig.inject = themeConfig.inject || {}
  themeConfig.search = themeConfig.search || {}
  themeConfig.search.local_search = themeConfig.search.local_search || {}

  if (profile.icon_path) {
    themeConfig.favicon = profile.icon_path
    themeConfig.nav.logo = profile.icon_path
  }

  if (profile.avatar_path) {
    themeConfig.avatar.img = profile.avatar_path
  }

  if (profile.hero_background_path) {
    themeConfig.default_top_img = profile.hero_background_path
    themeConfig.index_img = profile.hero_background_path
    themeConfig.archive_img = profile.hero_background_path
    themeConfig.tag_img = profile.hero_background_path
    themeConfig.category_img = profile.hero_background_path
  }

  if (profile.subtitle) {
    themeConfig.subtitle.sub = [profile.subtitle]
  }

  if (profile.site_started_year) {
    themeConfig.footer.owner.since = profile.site_started_year
  }

  if (profile.footer_note) {
    const startedRaw = profile.site_started_date || '2025-06-25'
    const startedDate = startedRaw instanceof Date
      ? startedRaw.toISOString().slice(0, 10)
      : String(startedRaw).slice(0, 10)
    themeConfig.footer.custom_text = profile.footer_note + '<span id="site-running-time" data-site-started="' + startedDate + '"></span>'
  }

  if (Array.isArray(navigation.items) && navigation.items.length) {
    const syncedMenu = {}
    navigation.items.forEach((item) => {
      if (!item || !item.label || !item.path) return
      syncedMenu[item.label] = `${item.path} || ${item.icon || 'fas fa-link'}`
    })
    themeConfig.menu = syncedMenu
  }

  if (Array.isArray(profile.social_links) && profile.social_links.length) {
    const syncedSocial = {}
    profile.social_links.forEach((item) => {
      if (!item || !item.icon || !item.url || !item.label) return
      syncedSocial[item.icon] = `${item.url} || ${item.label} || '${item.color || '#4a7dbe'}'`
    })
    themeConfig.social = syncedSocial
  }

  themeConfig.search.placeholder = getDefaultLocaleText(
    'portal.searchPlaceholder',
    themeConfig.search.placeholder || 'Search articles, pages, and project notes...',
  )

  const headInject = Array.isArray(themeConfig.inject.head)
    ? themeConfig.inject.head.slice()
    : []
  const bottomInject = Array.isArray(themeConfig.inject.bottom)
    ? themeConfig.inject.bottom.slice()
    : []

  themeConfig.inject.head = ensureInjectEntry(
    headInject,
    '<link rel="stylesheet" href="/css/portal-custom.css">',
  )
  themeConfig.inject.bottom = ensureInjectEntry(
    ensureInjectEntry(
      bottomInject,
      `<script id="portal-i18n-config" type="application/json">${portalI18nConfig}</script>`,
    ),
    '<script src="/js/portal-i18n.js?v=BUILD_VER" defer></script>',
  )

  hexo.theme.config = themeConfig
})
