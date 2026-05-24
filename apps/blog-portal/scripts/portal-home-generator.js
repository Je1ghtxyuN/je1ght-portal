const createPortalRenderer = require('./portal-renderer')

const portalRenderer = createPortalRenderer(hexo)

hexo.extend.generator.register('portal_home_page', function portalHomePage(locals) {
  return {
    path: 'index.html',
    layout: ['page', 'post', 'index'],
    data: {
      title: 'Home',
      type: 'portal-home',
      top_img: '/shared-assets/images/background.jpg',
      aside: false,
      comments: false,
      description: 'Building a calm, long-term personal platform.',
      content: portalRenderer.renderHome({ siteLocals: locals }),
    },
  }
})
