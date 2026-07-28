const assert = require('node:assert/strict')
const test = require('node:test')

const createPortalRenderer = require('../lib/portal/create-renderer')

function createHexo(data = {}) {
  return {
    config: { author: 'Je1ght', root: '/', title: 'Portal' },
    locals: {
      get(name) {
        if (name === 'data') return data
        if (name === 'posts') return []
        return null
      },
    },
  }
}

test('interface labels have UI keys and authored profile text does not', () => {
  const renderer = createPortalRenderer(
    createHexo({
      site_profile: {
        intro: { long: 'OWNER AUTHORED INTRODUCTION' },
        about: { skills: ['OWNER AUTHORED SKILL'] },
      },
    }),
  )
  const html = renderer.renderAbout()

  assert.match(html, /data-ui-key="about\.title"/)
  assert.match(html, /data-ui-key="about\.skillsTitle"/)
  assert.doesNotMatch(
    html,
    /data-ui-[^>]*>[^<]*OWNER AUTHORED (INTRODUCTION|SKILL)/,
  )
})

test('contact form labels and placeholders are semantic UI text', () => {
  const renderer = createPortalRenderer(
    createHexo({
      site_profile: {
        contact: {
          email: 'owner@example.com',
          formspree_endpoint: 'https://formspree.io/f/example',
        },
      },
    }),
  )
  const html = renderer.renderContact()

  assert.match(html, /data-ui-key="contact\.name"/)
  assert.match(html, /data-ui-placeholder="contact\.namePlaceholder"/)
  assert.match(html, /action="https:\/\/formspree\.io\/f\/example"/)
})

test('renderer does not emit decorative owner copy', () => {
  const renderer = createPortalRenderer(createHexo())
  const html = [
    renderer.renderHome(),
    renderer.renderAbout(),
    renderer.renderContact(),
    renderer.renderPortfolio(),
  ].join('\n')

  assert.doesNotMatch(
    html,
    /Directory|Journal|Profile|Say hello|Selected work|Code, Anime|VR, HCI/,
  )
})
