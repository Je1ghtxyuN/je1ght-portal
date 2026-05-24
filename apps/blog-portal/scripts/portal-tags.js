const createPortalRenderer = require('./portal-renderer')

const portalRenderer = createPortalRenderer(hexo)

hexo.extend.tag.register('portal_portfolio', () => portalRenderer.renderPortfolio())
hexo.extend.tag.register('portal_about', () => portalRenderer.renderAbout())
hexo.extend.tag.register('portal_contact', () => portalRenderer.renderContact())

module.exports = portalRenderer
