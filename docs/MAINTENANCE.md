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
| Butterfly build projection | `lib/portal/adapters/butterfly-theme-projection.js` |
| Visual tokens and layers | `source/css/portal/` |
| Theme-independent locale behavior | `source/js/portal-locale-core.js` |
| Butterfly DOM/PJAX bridge | `source/js/adapters/butterfly-adapter.js` |
| Theme-independent music behavior | `source/js/portal-music-player.js` |
| Public interface translations | `packages/shared-assets/locales/portal-ui/` |
| Contact form destination | Admin → Site Profile → `contact.formspree_endpoint` |
| Admin UI | `apps/backend-api/public/admin/` |
| Origin routes | `infra/nginx/default.conf` |

Profile fields projected into Butterfly are intentionally blank in
`_config.butterfly.yml`. Editing those blank placeholders does not work because
`portal-data-sync.js` derives their values during generation.

## Interface language versus authored content

The `portal-ui` catalogs contain only interface chrome: navigation, page and
section labels, form labels and placeholders, search, empty states, accessible
control names, and music wrapper states. All four catalogs must have identical
nonempty keys; `test/locale-catalog.test.js` enforces the contract.

Articles, titles, profile text, skills, experience, project descriptions,
categories, tags, contact availability notes, and the homepage subtitle are
authored content. The runtime locale switch never rewrites them. Add future
content translations as explicit language-specific Hexo source files or
routes, not as entries in `portal-ui`.

## Replacing Butterfly

The public portal is split across theme-independent components and two
Butterfly adapters. To use another Hexo theme:

1. replace `source/js/adapters/butterfly-adapter.js` with an adapter for the new
   theme's navigation, search, PJAX, and control mount points;
2. replace `lib/portal/adapters/butterfly-theme-projection.js` with the new
   theme's build-time configuration projection;
3. add the new theme configuration file and update the Hexo `theme` setting;
4. keep the renderer, `portal-ui` catalogs, locale core, music controller,
   content snapshots, and Formspree renderer unchanged.

If a theme adapter cannot find its preferred toolbar mount, the current browser
adapter creates a generic `[data-portal-toolbar]` fallback so language and music
remain usable.

Admin profile changes are stored in MySQL immediately but do not alter the
already-generated public HTML. Click **Rebuild Portal** after saving. That
rebuild exports the profile and portfolio snapshots, then runs Hexo. Use
`scripts/content-snapshot.sh pull` afterward and commit the reviewed YAML diff
to keep GitHub aligned with production.

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

## Contact form

The public form uses ordinary HTML POST directly to the HTTPS Formspree endpoint
stored in `SiteProfile.contact.formspree_endpoint`; Formspree forwards the
message to the email configured in its account. The checked-in YAML value is a
rebuild snapshot, not a competing source. If the endpoint is blank or invalid,
the renderer shows an email fallback and does not invent a submission target.

## Admin routing

Production uses the 1Panel OpenResty configuration at
`infra/nginx/je1ght.top.conf`; `infra/nginx/default.conf` is the standalone
Compose/nginx reference configuration. The `/admin/` location must use `^~`.
Without it, nginx's later generic
`.css` and `.js` regex locations win and look for Admin assets in the portal
static root. The result is an unstyled page with no login JavaScript even while
`/auth/login` itself remains healthy. A backend regression test protects this
precedence rule.

`scripts/deploy.sh` recreates only `backend-api` and `waline`, validates the
complete OpenResty configuration, and reloads it without stopping the public
edge. Do not reintroduce a Compose nginx service on port 80 while 1Panel owns
that port.

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
