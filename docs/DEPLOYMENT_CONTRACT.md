# Deployment Contract

Last updated: 2026-07-28

## Public routing

```text
je1ght.top/          -> portal-nginx -> apps/blog-portal/public
je1ght.top/api/*     -> portal-nginx -> backend-api:3001/*
je1ght.top/admin/*   -> portal-nginx -> backend-api:3001/admin/*
je1ght.top/waline/*  -> portal-nginx -> waline
study.je1ght.top     -> independent Study Room repository
```

Cloudflare provides public DNS, TLS, and proxying. nginx is the origin router.
The Study Room is deliberately outside this repository.

## Build contract

Every portal build uses `npm run build`, which cleans Hexo state and generates
the custom homepage consistently. `PORTAL_BUILD_VERSION` is injected in memory;
there is no post-build text replacement or generator renaming.

`npm run validate` rejects unresolved version placeholders, placeholder domains,
malformed language values, duplicate IDs, and broken internal links/assets.
The configured Formspree endpoint is intentional and is covered by renderer
tests.

The backend image generates Prisma Client during build. Container startup runs
`prisma migrate deploy` before starting Hono, so committed migrations must be
safe for production data.

## Configuration control points

- `packages/shared-config/site-identity.json`
- `apps/blog-portal/_config.yml`
- `apps/blog-portal/_config.butterfly.yml`
- `apps/blog-portal/lib/portal/theme-projection.js`
- `apps/blog-portal/scripts/portal-data-sync.js`
- `infra/nginx/default.conf`
- `infra/docker-compose.yml`

See `docs/MAINTENANCE.md` and `docs/CONTENT_MAP.md` for ownership rules.
