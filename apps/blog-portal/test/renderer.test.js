const assert = require('node:assert/strict')
const test = require('node:test')

const createPortalRenderer = require('../lib/portal/create-renderer')
const { projectThemeConfig } = require('../lib/portal/theme-projection')

function createHexo(data = {}, posts = []) {
  return {
    config: {
      author: 'Jeight',
      root: '/',
      title: 'Jeight Portal',
      url: 'https://example.com',
    },
    locals: {
      get(name) {
        if (name === 'data') return data
        if (name === 'posts') return posts
        return null
      },
    },
  }
}

test('about renderer escapes profile content', () => {
  const renderer = createPortalRenderer(
    createHexo({
      site_profile: {
        about: { intro_title: 'About' },
        intro: { long: '<script>alert("unsafe")</script>' },
      },
    }),
  )

  const html = renderer.renderAbout()

  assert.doesNotMatch(html, /<script>alert/)
  assert.match(html, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt;/)
})

test('home renderer sorts posts newest first with a stable tie break', () => {
  const renderer = createPortalRenderer(
    createHexo(
      {},
      [
        { title: 'Older', path: 'older/', date: '2025-01-01' },
        { title: 'Zulu', path: 'zulu/', date: '2026-01-01' },
        { title: 'Alpha', path: 'alpha/', date: '2026-01-01' },
      ],
    ),
  )

  const html = renderer.renderHome()

  assert.ok(html.indexOf('Alpha') < html.indexOf('Zulu'))
  assert.ok(html.indexOf('Zulu') < html.indexOf('Older'))
})

test('empty portfolio is omitted from home shortcuts and preview', () => {
  const renderer = createPortalRenderer(
    createHexo({
      navigation: {
        home_shortcuts: {
          items: [
            { label: 'Portfolio', path: '/portfolio/' },
            { label: 'Contact', path: '/contact/' },
          ],
        },
      },
      portfolio: { cards: [] },
    }),
  )

  const html = renderer.renderHome()

  assert.doesNotMatch(html, /\/portfolio\//)
  assert.doesNotMatch(html, /portal-card-grid--projects/)
  assert.match(html, /\/contact\//)
})

test('theme projection omits empty portfolio from the primary menu', () => {
  const navigation = {
    items: [
      { label: 'Home', path: '/', icon: 'fas fa-home' },
      { label: 'Portfolio', path: '/portfolio/', icon: 'fas fa-briefcase' },
    ],
  }

  const withoutProjects = projectThemeConfig({
    themeConfig: {},
    navigation,
    portfolio: { cards: [] },
  })
  const withProjects = projectThemeConfig({
    themeConfig: {},
    navigation,
    portfolio: { cards: [{ title: 'Project' }] },
  })

  assert.deepEqual(Object.keys(withoutProjects.menu), ['Home'])
  assert.deepEqual(Object.keys(withProjects.menu), ['Home', 'Portfolio'])
})

test('contact renderer posts directly to the configured Formspree endpoint', () => {
  const renderer = createPortalRenderer(
    createHexo({
      site_profile: {
        contact: {
          email: 'person@example.com',
          formspree_endpoint: 'https://formspree.io/f/example',
        },
      },
    }),
  )

  const html = renderer.renderContact()

  assert.match(html, /action="https:\/\/formspree\.io\/f\/example"/)
  assert.match(html, /method="post"/)
  assert.doesNotMatch(html, /action="\/api\/contact"/)
})

test('contact renderer does not invent a submission target when Formspree is missing', () => {
  const renderer = createPortalRenderer(
    createHexo({
      site_profile: { contact: { email: 'person@example.com' } },
    }),
  )

  const html = renderer.renderContact()

  assert.match(html, /portal-contact-unavailable/)
  assert.doesNotMatch(html, /<form\b/)
  assert.doesNotMatch(html, /formspree\.io|\/api\/contact/)
})
