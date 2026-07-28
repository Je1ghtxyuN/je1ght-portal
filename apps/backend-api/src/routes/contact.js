import { createHash } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db/client.js'

const messageSchema = z.object({
  company: z.string().max(200).optional().default(''),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(20).max(5000),
  name: z.string().trim().min(1).max(100),
  topic: z.string().trim().min(1).max(160),
})

function clientAddress(c) {
  const forwarded = c.req.header('x-forwarded-for')
  return forwarded?.split(',')[0].trim() || c.req.header('x-real-ip') || 'unknown'
}

function createMemoryRateLimiter({ maxRequests, windowMs }) {
  const buckets = new Map()
  return {
    accept(key, now = Date.now()) {
      const current = buckets.get(key)
      if (!current || now - current.startedAt >= windowMs) {
        buckets.set(key, { count: 1, startedAt: now })
        return true
      }
      current.count += 1
      return current.count <= maxRequests
    },
  }
}

export function createContactRoutes({
  maxRequests = 5,
  repository = {
    create(data) {
      return prisma.contactMessage.create({ data })
    },
  },
  windowMs = 15 * 60 * 1000,
} = {}) {
  const contact = new Hono()
  const limiter = createMemoryRateLimiter({ maxRequests, windowMs })

  contact.post('/', async (c) => {
    let body
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Please check the form fields and try again.' }, 400)
    }
    if (parsed.data.company) return c.body(null, 204)

    const address = clientAddress(c)
    const ipHash = createHash('sha256').update(address).digest('hex')
    if (!limiter.accept(ipHash)) {
      return c.json({ error: 'Too many messages. Please try again later.' }, 429)
    }

    const { company: _honeypot, ...message } = parsed.data
    const saved = await repository.create({ ...message, ipHash })
    return c.json({ id: saved.id, ok: true }, 201)
  })

  return contact
}

export const contact = createContactRoutes()
