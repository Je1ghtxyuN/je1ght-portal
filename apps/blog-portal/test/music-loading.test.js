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

test('music wrapper uses the locale API and theme adapter without hardcoded states', () => {
  const playerScript = fs.readFileSync(
    path.join(projectRoot, 'source/js/portal-music-player.js'),
    'utf8',
  )

  assert.match(playerScript, /PortalLocale\.t/)
  assert.match(playerScript, /PortalLocale\.subscribe/)
  assert.match(playerScript, /PortalButterflyAdapter\.resolveToolbar/)
  assert.match(playerScript, /window\.PortalMusicPlayer/)
  assert.doesNotMatch(
    playerScript,
    /title = 'Open music player'|Music loads after|Loading music|temporarily unavailable\./,
  )
  assert.match(playerScript, /music\.initial/)
  assert.match(playerScript, /music\.loading/)
  assert.match(playerScript, /music\.unavailable/)
})
