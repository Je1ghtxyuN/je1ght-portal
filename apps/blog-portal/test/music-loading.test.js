const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const projectRoot = path.resolve(__dirname, '..')

test('music dependencies are not injected during initial page load', () => {
  const themeConfig = fs.readFileSync(path.join(projectRoot, '_config.butterfly.yml'), 'utf8')
  const playerScript = fs.readFileSync(
    path.join(projectRoot, 'source/js/portal-music-player.js'),
    'utf8',
  )

  assert.match(themeConfig, /aplayerInject:\s*\n\s+enable:\s+false/)
  assert.doesNotMatch(themeConfig, /<div class="aplayer/)
  assert.doesNotMatch(themeConfig, /loadMeting\(\)/)
  assert.match(playerScript, /musicBtn\.addEventListener\('click'/)
  assert.match(playerScript, /loadScript/)
  assert.match(playerScript, /Meting\.min\.js/)
})
