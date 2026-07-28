function clone(value) {
  return structuredClone(value || {})
}

function faviconPathFor(iconPath) {
  if (!iconPath) return ''
  return iconPath.replace(/(?:^|\/)icon\.png(?:\?.*)?$/, (match) => match.replace(/icon\.png(?:\?.*)?$/, 'site-favicon.png'))
}

function formatDate(value, fallback) {
  const raw = value || fallback
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  return String(raw).slice(0, 10)
}

function replaceBuildVersion(entry, buildVersion) {
  return String(entry).replaceAll('BUILD_VER', encodeURIComponent(buildVersion))
}

function appendUnique(entries, entry, stableNeedle) {
  const filtered = entries.filter((item) => !String(item).includes(stableNeedle))
  filtered.push(entry)
  return filtered
}

function projectThemeConfig({
  themeConfig,
  profile = {},
  navigation = {},
  portfolio = {},
  buildVersion = 'dev',
  portalI18nConfig = {},
  searchPlaceholder = 'Search articles, pages, and project notes...',
}) {
  const projected = clone(themeConfig)
  projected.nav = projected.nav || {}
  projected.avatar = projected.avatar || {}
  projected.footer = projected.footer || {}
  projected.footer.owner = projected.footer.owner || {}
  projected.subtitle = projected.subtitle || {}
  projected.search = projected.search || {}
  projected.inject = projected.inject || {}

  if (profile.owner?.display_name) projected.author = profile.owner.display_name
  if (profile.subtitle) {
    projected.subtitle.sub = [profile.subtitle]
    projected.site_subtitle = profile.subtitle
  }

  if (profile.icon_path) {
    projected.favicon = faviconPathFor(profile.icon_path)
    projected.nav.logo = profile.icon_path
  }
  if (profile.avatar_path) projected.avatar.img = profile.avatar_path
  if (profile.hero_background_path) {
    for (const key of ['default_top_img', 'index_img', 'archive_img', 'tag_img', 'category_img']) {
      projected[key] = profile.hero_background_path
    }
  }
  if (profile.site_started_year) projected.footer.owner.since = profile.site_started_year
  if (profile.footer_note || profile.site_started_date) {
    const startedDate = formatDate(profile.site_started_date, '2025-06-25')
    projected.footer.custom_text = `${profile.footer_note || ''}<span id="site-running-time" data-site-started="${startedDate}"></span>`
  }

  if (Array.isArray(navigation.items) && navigation.items.length) {
    projected.menu = {}
    const hasPortfolio = Array.isArray(portfolio.cards) && portfolio.cards.length > 0
    for (const item of navigation.items) {
      if (!item?.label || !item?.path) continue
      if (item.path === '/portfolio/' && !hasPortfolio) continue
      projected.menu[item.label] = `${item.path} || ${item.icon || 'fas fa-link'}`
    }
  }

  if (Array.isArray(profile.social_links) && profile.social_links.length) {
    projected.social = {}
    for (const item of profile.social_links) {
      if (!item?.icon || !item?.url || !item?.label) continue
      projected.social[item.icon] = `${item.url} || ${item.label} || '${item.color || '#4a7dbe'}'`
    }
  }

  projected.search.placeholder = searchPlaceholder

  let head = Array.isArray(projected.inject.head) ? projected.inject.head.slice() : []
  let bottom = Array.isArray(projected.inject.bottom) ? projected.inject.bottom.slice() : []
  head = head.map((entry) => replaceBuildVersion(entry, buildVersion))
  bottom = bottom.map((entry) => replaceBuildVersion(entry, buildVersion))

  const serializedI18n = JSON.stringify(portalI18nConfig).replaceAll('<', '\\u003c')
  bottom = appendUnique(
    bottom,
    `<script id="portal-i18n-config" type="application/json">${serializedI18n}</script>`,
    'id="portal-i18n-config"',
  )
  bottom = appendUnique(
    bottom,
    `<script src="/js/portal-i18n.js?v=${encodeURIComponent(buildVersion)}" defer></script>`,
    '/js/portal-i18n.js',
  )
  bottom = appendUnique(
    bottom,
    `<script src="/js/portal-contact.js?v=${encodeURIComponent(buildVersion)}" defer></script>`,
    '/js/portal-contact.js',
  )

  projected.inject.head = head
  projected.inject.bottom = bottom
  return projected
}

module.exports = {
  projectThemeConfig,
}
