# Formspree and Admin Recovery Design

## Goal

Restore the owner's email-first Formspree contact workflow and make the
self-hosted Admin login reliable and visually consistent with the portal.

## Confirmed diagnosis

- `https://je1ght.top/admin/` returns the Admin HTML successfully.
- `/auth/session` returns the expected unauthenticated 401.
- `/auth/login` reaches MySQL and returns the expected 401 for diagnostic fake
  credentials, so the API and database path are alive.
- `/admin/style.css` and `/admin/app.js` return nginx 404 pages.
- The generic nginx `.css` and `.js` regular-expression locations take
  precedence over `location /admin/`, so Admin assets never reach Hono.
- Without `app.js`, the form is not intercepted and cannot call `/auth/login`;
  without `style.css`, the page appears unstyled.

## Contact behavior

`SiteProfile.contact.formspree_endpoint` remains Admin-editable and is preserved
in the versioned profile snapshot. The contact renderer posts directly to that
configured HTTPS Formspree endpoint using ordinary HTML form submission. The
temporary Hono contact route, `ContactMessage` model/migration, and contact
fetch client are removed because they conflict with the requested email-first
workflow.

If the endpoint is missing, the form is rendered unavailable rather than
silently submitting to an unrelated hard-coded service. The checked-in snapshot
retains the owner's existing endpoint so clean builds remain functional.

## Admin routing and UI

nginx uses `location ^~ /admin/` so every Admin HTML, CSS, and JS request is
proxied to Hono before generic asset regexes are considered. No password reset
or credential disclosure is required.

The Admin remains framework-free. The login surface gains a branded split card,
site identity, concise explanation, accessible labels, autocomplete attributes,
a submitting state, and clear API/network errors. Dashboard CRUD behavior is
unchanged.

## Configuration ownership

The MySQL `SiteProfile` is canonical for Admin-managed profile content.
`site_profile.yml` is a build snapshot. `portal-data-sync.js` projects only
Butterfly shell values; focused renderers read the snapshot for page content.
Navigation remains repository-owned. A documented field map will distinguish
Admin-owned, repository-owned, and derived values.

## Verification

- regression test for nginx Admin asset precedence;
- Admin markup test for Formspree field and accessible login structure;
- snapshot round-trip test preserving the endpoint;
- renderer test for configured Formspree action and missing-endpoint behavior;
- portal clean build and generated-output validation;
- backend tests and Prisma validation;
- local Admin desktop/mobile visual check.
