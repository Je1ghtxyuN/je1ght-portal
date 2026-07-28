// Compatibility entry point for Hexo scripts. Rendering responsibilities live
// in lib/portal/render so each page can be tested and maintained independently.
module.exports = require('../lib/portal/create-renderer')
