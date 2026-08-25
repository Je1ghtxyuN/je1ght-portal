# Formspree and Admin Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore direct-to-email Formspree contact submission and fix the Admin login asset routing and presentation.

**Architecture:** Keep profile data in MySQL with a versioned YAML snapshot, use direct HTML Formspree submission, and remove the temporary self-hosted message path. Fix nginx routing at the origin boundary, then improve the existing framework-free Admin login without changing dashboard CRUD.

**Tech Stack:** Hexo 7, Butterfly 5, Hono, Prisma/MySQL, nginx, Node test runner, HTML/CSS/vanilla JavaScript

## Global Constraints

- Do not reset, print, or transmit real Admin credentials.
- Keep `SiteProfile.contact.formspree_endpoint` Admin-owned.
- Do not add a frontend framework or new visual dependency.
- Preserve existing dashboard CRUD behavior.
- Use a failing regression test before each production change.

---

### Task 1: Fix Admin Asset Routing

**Files:**
- Modify: `infra/nginx/default.conf`
- Test: `apps/backend-api/test/admin-profile.test.js`

**Interfaces:**
- Consumes: requests under `/admin/`
- Produces: nginx prefix location with `^~` priority

- [ ] Add an assertion that the nginx config contains `location ^~ /admin/`.
- [ ] Run `npm test -- test/admin-profile.test.js` and confirm failure.
- [ ] Change the Admin nginx location from `location /admin/` to
  `location ^~ /admin/`.
- [ ] Run the focused test and `nginx -t` when nginx is available.
- [ ] Commit the routing fix.

### Task 2: Restore Formspree Ownership and Rendering

**Files:**
- Modify: `apps/backend-api/public/admin/index.html`
- Modify: `apps/backend-api/public/admin/app.js`
- Modify: `apps/backend-api/src/services/content-snapshot.js`
- Modify: `apps/backend-api/src/routes/site-profile.js`
- Modify: `apps/backend-api/prisma/schema.prisma`
- Modify: `apps/backend-api/src/app.js`
- Delete: `apps/backend-api/src/routes/contact.js`
- Delete: `apps/backend-api/prisma/migrations/20260728000000_add_contact_messages/migration.sql`
- Modify: `apps/blog-portal/lib/portal/render/contact.js`
- Modify: `apps/blog-portal/lib/portal/theme-projection.js`
- Delete: `apps/blog-portal/source/js/portal-contact.js`
- Modify: `apps/blog-portal/source/_data/site_profile.yml`
- Test: `apps/backend-api/test/admin-profile.test.js`
- Test: `apps/backend-api/test/content-snapshot.test.js`
- Test: `apps/blog-portal/test/renderer.test.js`
- Test: `apps/blog-portal/test/validate-output.test.js`

**Interfaces:**
- Consumes: `contact.formspree_endpoint: string`
- Produces: `<form method="post" action="<configured HTTPS endpoint>">`

- [ ] Change tests to require the Admin field, preserve the endpoint in snapshot
  normalization, render the configured endpoint, and accept it in generated
  output.
- [ ] Run backend and portal focused tests and confirm expected failures.
- [ ] Restore the Admin field and profile serialization.
- [ ] Replace `/api/contact` rendering with direct Formspree submission and a
  disabled state when no endpoint exists.
- [ ] Remove the temporary API route, Prisma model/migration, browser fetch
  client, and theme injection.
- [ ] Restore the checked-in endpoint snapshot.
- [ ] Run all backend and portal tests, Prisma validation, build, and output
  validation.
- [ ] Commit the Formspree restoration.

### Task 3: Improve Admin Login Experience and Document Ownership

**Files:**
- Modify: `apps/backend-api/public/admin/index.html`
- Modify: `apps/backend-api/public/admin/style.css`
- Modify: `apps/backend-api/public/admin/app.js`
- Modify: `docs/CONTENT_MAP.md`
- Modify: `docs/MAINTENANCE.md`
- Test: `apps/backend-api/test/admin-profile.test.js`

**Interfaces:**
- Consumes: `/auth/login` JSON responses
- Produces: accessible login card, submitting state, and useful error text

- [ ] Add static assertions for branded login structure, autocomplete, an
  `aria-live` error region, and Formspree ownership copy.
- [ ] Run the focused test and confirm failure.
- [ ] Add the semantic login structure and state handling.
- [ ] Apply portal-aligned color, spacing, focus, responsive, and reduced-motion
  styles without changing dashboard selectors.
- [ ] Document the Admin/profile/projection ownership map and the diagnosed
  nginx precedence rule.
- [ ] Run backend tests, portal checks, shell/nginx syntax checks, and
  desktop/mobile browser visual verification.
- [ ] Commit, push the branch, and update the draft PR.
