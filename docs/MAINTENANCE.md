# Website Maintenance Guide

This is the operational guide for the Hexo/Butterfly portal and its Hono API.
Historical design notes under `docs/superpowers/` explain past decisions but are
not current operating instructions.

## Daily commands

```bash
# Portal: tests, clean build, generated-output validation
cd apps/blog-portal
npm run check

# API: route and snapshot tests, then schema validation
cd apps/backend-api
npm test
DATABASE_URL='mysql://user:pass@localhost:3306/db' npx prisma validate
```

`npm run build` always cleans Hexo's cache before generation. Set
`PORTAL_BUILD_VERSION` to a Git SHA for deploys; local builds default to `dev`.
Do not edit generated `public/` files.

## Where to make changes

| Change | Canonical location |
| --- | --- |
| URL, permalink, Hexo generation | `apps/blog-portal/_config.yml` |
| Butterfly behavior | `apps/blog-portal/_config.butterfly.yml` |
| Profile copy and brand paths | MySQL `SiteProfile`, exported to `source/_data/site_profile.yml` |
| Portfolio projects | MySQL `PortfolioItem`, exported to `source/_data/portfolio.yml` |
| Navigation and homepage shortcuts | `source/_data/navigation.yml` |
| Manual posts and drafts | `source/_posts/`, `source/_drafts/` |
| Renderer behavior | `lib/portal/render/` |
| Theme projection | `lib/portal/theme-projection.js` |
| Visual tokens and layers | `source/css/portal/` |
| Browser behavior | `source/js/portal-*.js` |
| Contact API | `apps/backend-api/src/routes/contact.js` |

Profile fields projected into Butterfly are intentionally blank in
`_config.butterfly.yml`. Editing those blank placeholders does not work because
`portal-data-sync.js` derives their values during generation.

## Content snapshots

Database-owned content is versioned so a clean checkout builds without a live
database. Snapshot operations are explicit:

```bash
scripts/content-snapshot.sh pull
scripts/content-snapshot.sh import-profile
```

Review snapshot diffs before committing. Normal deployment does not perform a
bidirectional `_data` synchronization.

When `portfolio.yml` has no cards, the main menu, homepage shortcut, and
homepage preview automatically omit Portfolio. Add real items through Admin,
export the snapshot, and rebuild to restore those surfaces.

## Contact messages

The public form posts JSON to `/api/contact`, which nginx proxies to the Hono
`/contact` route. The server validates length and email format, ignores the
honeypot field, rate-limits by hashed client address, and stores messages in
`ContactMessage`. Docker startup runs `prisma migrate deploy` before the API.

## Optional integrations

Music is nonessential. APlayer, Meting, and the remote playlist are loaded only
after the music button is clicked. The site shell must remain usable if those
services fail.

Waline is a separate container routed at `/waline`; it is not part of the portal
API or the contact-message table.

## Dependency audit note

The backend production dependency audit is clean after upgrading Hono,
`@hono/node-server`, js-yaml, and sharp. The portal audit still reports one
unfixed denial-of-service advisory propagated as six findings through
Butterfly → `hexo-renderer-stylus` → Stylus → glob/minimatch →
`brace-expansion`. This chain runs only while compiling trusted repository
styles; portal deployment serves the generated static files and does not ship
the Node build dependencies. Recheck it when Butterfly or its Stylus renderer
updates; do not force an incompatible transitive override.

## Release checklist

1. Run portal and backend checks above.
2. Run `bash -n scripts/deploy.sh scripts/content-snapshot.sh`.
3. Confirm `git diff --check` is clean.
4. Review database migrations and ensure Docker startup still runs
   `prisma migrate deploy`.
5. Inspect homepage, an article, About, Contact, search, dark/light mode, and
   mobile navigation.
6. Push a review branch before production deployment.
