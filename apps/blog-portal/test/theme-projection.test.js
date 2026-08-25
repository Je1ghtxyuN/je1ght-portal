const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { projectThemeConfig } = require('../lib/portal/theme-projection')

const projectRoot = path.resolve(__dirname, '..')

function createInput() {
  return {
    themeConfig: {
      nav: { display_title: true },
      avatar: { effect: true },
      footer: { owner: {}, custom_text: '' },
      subtitle: { enable: true, sub: [] },
      search: { placeholder: 'Search...' },
      inject: {
        head: ['<link rel="stylesheet" href="/css/portal-custom.css?v=BUILD_VER">'],
        bottom: [
          '<script src="/js/portal-hero.js?v=BUILD_VER" defer></script>',
          '<script src="/js/portal-music-player.js?v=BUILD_VER" defer></script>',
        ],
      },
    },
    profile: {
      owner: { display_name: 'Je1ghtxyuN' },
      subtitle: 'Build quietly.',
      icon_path: '/shared-assets/images/icon.png',
      avatar_path: '/shared-assets/images/profile.jpg',
      hero_background_path: '/shared-assets/images/background.jpg',
      site_started_year: 2025,
      site_started_date: '2025-06-25',
      footer_note: 'Made with care. ',
      social_links: [
        {
          icon: 'fab fa-github',
          url: 'https://github.com/Je1ghtxyuN',
          label: 'GitHub',
          color: '#2d9cdb',
        },
      ],
    },
    navigation: {
      items: [
        { label: 'Home', path: '/', icon: 'fas fa-house' },
        { label: 'About', path: '/about/', icon: 'fas fa-id-card' },
      ],
    },
    buildVersion: 'test-sha',
    portalI18nConfig: { defaultLocale: 'en' },
    searchPlaceholder: 'Search the portal',
  }
}

test('projects profile and navigation into Butterfly config', () => {
  const input = createInput()

  const result = projectThemeConfig(input)

  assert.equal(result.author, 'Je1ghtxyuN')
  assert.equal(result.favicon, '/shared-assets/images/site-favicon.png')
  assert.equal(result.nav.logo, '/shared-assets/images/icon.png')
  assert.equal(result.avatar.img, '/shared-assets/images/profile.jpg')
  assert.equal(result.index_img, '/shared-assets/images/background.jpg')
  assert.equal(result.menu.Home, '/ || fas fa-house')
  assert.equal(result.social['fab fa-github'], "https://github.com/Je1ghtxyuN || GitHub || '#2d9cdb'")
  assert.equal(result.search.placeholder, 'Search the portal')
})

test('injects a resolved build version and locale bootstrap', () => {
  const result = projectThemeConfig(createInput())
  const injected = [...result.inject.head, ...result.inject.bottom].join('\n')

  assert.match(injected, /v=test-sha/)
  assert.match(injected, /id="portal-i18n-config"/)
  assert.doesNotMatch(injected, /BUILD_VER/)
})

test('loads locale core and theme adapter before the music panel', () => {
  const result = projectThemeConfig(createInput())
  const bottom = result.inject.bottom.join('\n')
  const coreIndex = bottom.indexOf('/js/portal-locale-core.js')
  const runtimeIndex = bottom.indexOf('/js/portal-site-runtime.js')
  const adapterIndex = bottom.indexOf('/js/adapters/butterfly-adapter.js')
  const musicIndex = bottom.indexOf('/js/portal-music-player.js')

  assert.ok(coreIndex >= 0)
  assert.ok(runtimeIndex > coreIndex)
  assert.ok(adapterIndex > runtimeIndex)
  assert.ok(musicIndex > adapterIndex)
  assert.equal(bottom.match(/\/js\/portal-music-player\.js/g)?.length, 1)
})

test('does not inject runtime favicon mutation', () => {
  const result = projectThemeConfig(createInput())
  const injected = [...result.inject.head, ...result.inject.bottom].join('\n')

  assert.doesNotMatch(injected, /setInterval|nudgeTitle|history\.pushState/)
})

test('does not mutate input configuration', () => {
  const input = createInput()
  const original = structuredClone(input)

  projectThemeConfig(input)

  assert.deepEqual(input, original)
})

test('Butterfly projection has an explicit adapter with a compatible export', () => {
  const legacy = require('../lib/portal/theme-projection')
  const adapter = require('../lib/portal/adapters/butterfly-theme-projection')

  assert.equal(
    legacy.projectThemeConfig,
    adapter.projectButterflyThemeConfig,
  )

  const rendererFiles = [
    'lib/portal/create-renderer.js',
    'lib/portal/render/home.js',
    'lib/portal/render/about.js',
    'lib/portal/render/contact.js',
  ]
    .map((file) => fs.readFileSync(path.join(projectRoot, file), 'utf8'))
    .join('\n')

  assert.doesNotMatch(
    rendererFiles,
    /butterfly-theme-projection|theme-projection/,
  )
})
