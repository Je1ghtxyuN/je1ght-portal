const { statSync } = require('node:fs')

hexo.extend.filter.register('before_post_render', function (data) {
  // Only fill date for posts missing it (page posts have their own dates)
  if (!data.date || data.date.valueOf() === 0) {
    if (data.source) {
      try {
        const stats = statSync(data.source)
        data.date = stats.mtime
      } catch {
        // file not found (e.g. draft in db.json cache), leave date as-is
      }
    }
  }
  return data
})
