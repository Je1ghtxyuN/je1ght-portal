import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { errorHandler } from './middleware/errorHandler.js'
import { authMiddleware } from './middleware/auth.js'
import { health } from './routes/health.js'
import { auth } from './routes/auth.js'
import { protectedRoutes } from './routes/protected.js'
import { blog } from './routes/blog.js'
import { portfolio } from './routes/portfolio.js'
import { siteProfile } from './routes/site-profile.js'
import { rebuild } from './routes/rebuild.js'
import { assets } from './routes/assets.js'
import { contact } from './routes/contact.js'

export function createApp() {
  const app = new Hono()

  app.use('*', logger())
  app.use('*', cors({
    origin: ['http://localhost:4000'],
    credentials: true,
  }))
  app.use('*', errorHandler())
  app.use('*', authMiddleware())

  // Admin UI static files — no cache to avoid stale JS/CSS after deploy
  app.use('/admin/*', async (c, next) => {
    await next()
    c.res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  })
  app.use('/admin/*', serveStatic({ root: './public' }))

  app.route('/', health)
  app.route('/auth', auth)
  app.route('/protected', protectedRoutes)
  app.route('/blog', blog)
  app.route('/portfolio', portfolio)
  app.route('/site-profile', siteProfile)
  app.route('/admin/rebuild', rebuild)
  app.route('/assets', assets)
  app.route('/contact', contact)

  app.notFound((c) => c.json({ error: 'Not found' }, 404))

  return app
}
