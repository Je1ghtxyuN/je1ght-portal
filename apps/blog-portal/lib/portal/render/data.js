const CONFIG = Object.freeze({
  HOMEPAGE_POST_LIMIT: 3,
  PORTFOLIO_PREVIEW_LIMIT: 3,
  DEFAULT_IMAGE_PATH: '/shared-assets/images/background.jpg',
})

function array(value) {
  return Array.isArray(value) ? value : []
}

function collection(value) {
  if (!value) return []
  if (typeof value.toArray === 'function') return value.toArray()
  if (Array.isArray(value.data)) return value.data.slice()
  if (value.data && typeof value.data[Symbol.iterator] === 'function') return Array.from(value.data)
  return array(value).slice()
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function portalData(hexo, siteLocals) {
  const data = siteLocals?.data || hexo.locals.get('data') || {}
  return {
    navigation: data.navigation || {},
    portfolio: data.portfolio || {},
    profile: data.site_profile || {},
  }
}

function latestPosts(hexo, siteLocals, limit = CONFIG.HOMEPAGE_POST_LIMIT) {
  const source = siteLocals?.posts || hexo.locals.get('posts')
  return collection(source)
    .filter(Boolean)
    .sort((left, right) => {
      const byDate = new Date(right.date || 0) - new Date(left.date || 0)
      if (byDate) return byDate
      const leftKey = text(left.path || left.slug || left.title || left._id)
      const rightKey = text(right.path || right.slug || right.title || right._id)
      return leftKey.localeCompare(rightKey)
    })
    .slice(0, limit)
}

module.exports = { CONFIG, array, latestPosts, portalData, text }
