import assert from 'node:assert/strict'
import test from 'node:test'
import { Hono } from 'hono'

import { createContactRoutes } from '../src/routes/contact.js'

function setup(options = {}) {
  const saved = []
  const repository = {
    async create(data) {
      saved.push(data)
      return { id: 'message-1' }
    },
  }
  const app = new Hono()
  app.route('/contact', createContactRoutes({ repository, ...options }))
  return { app, saved }
}

test('accepts and normalizes a valid contact message', async () => {
  const { app, saved } = setup()
  const response = await app.request('/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body: JSON.stringify({
      email: ' person@example.com ',
      message: ' A useful message with enough context. ',
      name: ' Person ',
      topic: ' Hello ',
    }),
  })

  assert.equal(response.status, 201)
  assert.deepEqual(saved[0], {
    email: 'person@example.com',
    ipHash: saved[0].ipHash,
    message: 'A useful message with enough context.',
    name: 'Person',
    topic: 'Hello',
  })
  assert.match(saved[0].ipHash, /^[a-f0-9]{64}$/)
})

test('rejects invalid payloads and honeypot submissions', async () => {
  const { app, saved } = setup()
  const invalid = await app.request('/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'bad', message: 'short', name: '', topic: '' }),
  })
  const bot = await app.request('/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      company: 'spam',
      email: 'bot@example.com',
      message: 'This is long enough but should be ignored.',
      name: 'Bot',
      topic: 'Spam',
    }),
  })

  assert.equal(invalid.status, 400)
  assert.equal(bot.status, 204)
  assert.equal(saved.length, 0)
})

test('rate limits repeated submissions from the same address', async () => {
  const { app } = setup({ maxRequests: 2, windowMs: 60_000 })
  const request = () =>
    app.request('/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.20' },
      body: JSON.stringify({
        email: 'person@example.com',
        message: 'A useful message with enough context.',
        name: 'Person',
        topic: 'Hello',
      }),
    })

  assert.equal((await request()).status, 201)
  assert.equal((await request()).status, 201)
  assert.equal((await request()).status, 429)
})
