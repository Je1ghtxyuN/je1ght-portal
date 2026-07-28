const {
  defaultLocale,
  getDefaultLocaleText,
  localeBasePath,
  siteIdentity,
  supportedLocales,
} = require('./portal-shared-config')
const fs = require('fs')
const path = require('path')

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
  })

  const ensureInjectEntry = (entries = [], nextEntry) => {
    const filteredEntries = entries.filter((entry) => entry !== nextEntry)
    filteredEntries.push(nextEntry)
    return filteredEntries
  }

  const getCacheBreakingFaviconPath = (iconPath) => (
    iconPath ? iconPath.replace(/icon\.png(?:\?.*)?$/, 'site-favicon.png') : iconPath
  )

  const faviconRuntimeRefreshScript = [
    '<script>',
    '(function(){',
    "var iconPath='/shared-assets/images/safari-tab-icon.png';",
    'var refreshCount=0;',
    'function buildHref(){return iconPath+"?runtime="+Date.now()+"-"+Math.random().toString(36).slice(2);}',
    'function removeIcons(){document.querySelectorAll("link[rel*=icon]").forEach(function(link){link.parentNode&&link.parentNode.removeChild(link);});}',
    'function addIcon(rel,sizes,href){var link=document.createElement("link");link.rel=rel;link.type="image/png";if(sizes)link.sizes=sizes;link.href=href;document.head.appendChild(link);}',
    'function nudgeTitle(){var title=document.title;if(!title)return;document.title=title+"\\u200b";window.setTimeout(function(){if(document.title===title+"\\u200b")document.title=title;},80);}',
    'function refreshFavicon(){if(!document.head)return;var href=buildHref();removeIcons();addIcon("icon","192x192",href);addIcon("icon","64x64",href);addIcon("shortcut icon","32x32",href);addIcon("apple-touch-icon","180x180",href);nudgeTitle();}',
    'function scheduleRefresh(){window.setTimeout(refreshFavicon,0);window.setTimeout(refreshFavicon,250);window.setTimeout(refreshFavicon,1000);}',
    'var pushState=history.pushState;history.pushState=function(){var result=pushState.apply(this,arguments);scheduleRefresh();return result;};',
    'var replaceState=history.replaceState;history.replaceState=function(){var result=replaceState.apply(this,arguments);scheduleRefresh();return result;};',
    '["DOMContentLoaded","pageshow","popstate","hashchange","pjax:send","pjax:complete","pjax:success","pjax:end"].forEach(function(eventName){window.addEventListener(eventName,scheduleRefresh,true);document.addEventListener(eventName,scheduleRefresh,true);});',
    'scheduleRefresh();',
    'var timer=window.setInterval(function(){refreshCount+=1;refreshFavicon();if(refreshCount>=8)window.clearInterval(timer);},1500);',
    '})();',
    '</script>',
  ].join('')

  const syncCacheBreakingFavicon = (iconPath, faviconPath) => {
    if (!iconPath || !faviconPath || iconPath === faviconPath) return
    const iconSourcePath = path.join(hexo.source_dir, iconPath.replace(/^\//, ''))
    const faviconSourcePath = path.join(hexo.source_dir, faviconPath.replace(/^\//, ''))
    if (!fs.existsSync(iconSourcePath)) return
    fs.mkdirSync(path.dirname(faviconSourcePath), { recursive: true })
    fs.copyFileSync(iconSourcePath, faviconSourcePath)
    fs.copyFileSync(iconSourcePath, path.join(hexo.source_dir, 'logo.png'))
    fs.copyFileSync(iconSourcePath, path.join(hexo.source_dir, 'shared-assets/images/safari-tab-icon.png'))
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
    const faviconPath = getCacheBreakingFaviconPath(profile.icon_path)
    syncCacheBreakingFavicon(profile.icon_path, faviconPath)
    themeConfig.favicon = faviconPath
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

  if (profile.icon_path) {
    const faviconPath = getCacheBreakingFaviconPath(profile.icon_path)
    headInject.unshift(
      faviconRuntimeRefreshScript,
      '<link rel="icon" type="image/png" sizes="192x192" href="/shared-assets/images/safari-tab-icon.png">',
      '<link rel="icon" type="image/png" sizes="64x64" href="/shared-assets/images/safari-tab-icon.png">',
      `<link rel="apple-touch-icon" sizes="180x180" href="${faviconPath}">`,
      `<link rel="icon" type="image/png" sizes="32x32" href="${faviconPath}">`,
      `<link rel="icon" type="image/png" sizes="16x16" href="${faviconPath}">`,
    )
  }

  // portal-custom.css is injected via _config.butterfly.yml inject.head with BUILD_VER
  themeConfig.inject.head = headInject
  themeConfig.inject.bottom = ensureInjectEntry(
    ensureInjectEntry(
      bottomInject,
      `<script id="portal-i18n-config" type="application/json">${portalI18nConfig}</script>`,
    ),
    '<script src="/js/portal-i18n.js?v=BUILD_VER" defer></script>',
  )

  hexo.theme.config = themeConfig
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
