const { url_for: urlFor } = require('hexo-util')
const { latestPosts, portalData } = require('./render/data')
const renderAbout = require('./render/about')
const renderContact = require('./render/contact')
const renderHome = require('./render/home')
const renderPortfolio = require('./render/portfolio')

module.exports = function createPortalRenderer(hexo) {
  const internalUrl = urlFor.bind(hexo)
  const context = {
    data: (locals) => portalData(hexo, locals),
    external: (value = '') => /^(?:https?:)?\/\//.test(value) || value.startsWith('mailto:'),
    hexo,
    href(value = '') {
      if (!value) return '#'
      return context.external(value) ? value : internalUrl(value)
    },
    latestPosts: (locals) => latestPosts(hexo, locals),
  }

  return {
    renderAbout: (options) => renderAbout(context, options),
    renderContact: (options) => renderContact(context, options),
    renderHome: (options) => renderHome(context, options),
    renderPortfolio: (options) => renderPortfolio(context, options),
  }
}
