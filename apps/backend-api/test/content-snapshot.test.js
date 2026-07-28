import test from 'node:test'
import assert from 'node:assert/strict'
import yaml from 'js-yaml'
import {
  serializePortfolio,
  serializeSiteProfile,
} from '../src/services/content-snapshot.js'

test('site profile snapshot round-trips nested and special values', () => {
  const profile = {
    owner: {
      display_name: 'Je1ghtxyuN',
      description: 'Code: anime # games',
    },
    intro: {
      long: 'First line\nSecond "quoted" line',
      short: null,
    },
    hero_phrases: ['Build, test, refine', '安静地构建'],
    social_links: [
      {
        label: 'GitHub',
        url: 'https://github.com/Je1ghtxyuN',
        color: '#2d9cdb',
      },
    ],
    empty: [],
  }

  const serialized = serializeSiteProfile(profile)

  assert.equal(serialized.match(/# managed-by-backend-api/g)?.length, 1)
  assert.deepEqual(yaml.load(serialized), profile)
})

test('site profile snapshot drops deprecated third-party form endpoints', () => {
  const serialized = serializeSiteProfile({
    contact: {
      email: 'person@example.com',
      formspree_endpoint: 'https://formspree.io/f/example',
    },
  })

  assert.deepEqual(yaml.load(serialized), {
    contact: { email: 'person@example.com' },
  })
})

test('portfolio snapshot normalizes database items', () => {
  const serialized = serializePortfolio([
    {
      slug: 'study-room',
      title: 'Study Room',
      year: '2026',
      status: null,
      summary: 'Focus: music, scenes, and tasks',
      coverImage: null,
      gallery: ['one.png'],
      techStack: ['React', 'Hono'],
      tags: ['Focus'],
      links: { demo: 'https://study.je1ght.top' },
    },
  ])

  const parsed = yaml.load(serialized)

  assert.equal(serialized.match(/# managed-by-backend-api/g)?.length, 1)
  assert.equal(parsed.cards[0].cover_image, '/shared-assets/images/background.jpg')
  assert.equal(parsed.cards[0].status, '')
  assert.deepEqual(parsed.cards[0].tech_stack, ['React', 'Hono'])
  assert.deepEqual(parsed.cards[0].links, { demo: 'https://study.je1ght.top' })
})

test('portfolio snapshot remains valid when no items exist', () => {
  const parsed = yaml.load(serializePortfolio([]))

  assert.equal(parsed.section.title, 'Portfolio')
  assert.deepEqual(parsed.cards, [])
})
