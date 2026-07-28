const adapter = require('./adapters/butterfly-theme-projection')

module.exports = {
  ...adapter,
  projectThemeConfig: adapter.projectButterflyThemeConfig,
}
