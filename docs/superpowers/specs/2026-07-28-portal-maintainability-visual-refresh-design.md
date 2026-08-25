# Portal Maintainability and Visual Refresh Design

## Context

The public site is a Hexo 7 portal using Butterfly 5.5.4, a Hono/Prisma/MySQL
admin backend, and custom renderer, i18n, hero, and music-player code.

The audit found that the same values can currently be defined in MySQL,
`source/_data/*.yml`, `_config.butterfly.yml`, and build-time JavaScript. The
winning value depends on which build path runs. Local and server builds also
have different behavior: the server temporarily disables the home generator
and replaces `BUILD_VER` after generation, while a normal local build does not.

The current site builds successfully and all generated internal links resolve,
but it has several correctness and maintainability defects:

- `<html lang>` renders a serialized language array instead of one language code.
- the local portfolio snapshot is absent and the public portfolio API is empty;
  the page therefore exposes an empty product surface.
- the contact form still posts to Formspree even though the architecture requires
  a backend-owned contact flow.
- favicon cache handling writes generated files into `source/` and injects a
  runtime script that repeatedly removes and recreates icon elements.
- asset versioning depends on post-build `sed` replacement and leaves literal
  `BUILD_VER` values in ordinary local builds.
- the music player and its third-party dependencies load on every page even
  before the visitor opens the player.
- the main custom renderer is 1,070 lines, the Butterfly override is 1,101 lines,
  and the custom stylesheet is 626 lines with no automated regression suite.
- documentation still describes removed routes and superseded integrations.

## Goals

1. Give every setting and content field one documented owner.
2. Make local, admin-triggered, and deployment builds produce equivalent HTML.
3. Keep Hexo and Butterfly while reducing custom code and isolating extensions.
4. Add automated checks for configuration projection, rendering, links, metadata,
   accessibility-critical markup, and backend integration contracts.
5. Improve the visual hierarchy without losing the site's anime atmosphere.
6. Improve first-load behavior by deferring nonessential media and third-party code.
7. Preserve mainland-China accessibility and avoid adding blocked dependencies.

## Non-goals

- Replacing Hexo or Butterfly.
- Rebuilding the Study Room application.
- Adding a new CMS or JavaScript framework.
- Inventing portfolio projects that do not exist.
- Adding new Firebase dependencies.
- Deploying to production before the refactor is reviewed and merged.

## Source-of-truth contract

| Concern | Canonical owner | Derived consumers |
| --- | --- | --- |
| Hexo URL, permalink, generation, syntax | `_config.yml` | Hexo |
| Butterfly behavior and visual defaults | `_config.butterfly.yml` | Butterfly |
| Owner profile and editable presentation copy | MySQL `SiteProfile` | versioned `site_profile.yml` export |
| Portfolio items | MySQL `PortfolioItem` | versioned `portfolio.yml` export |
| Admin-managed posts | MySQL `BlogPost` | marked Markdown exports |
| Local/manual posts and drafts | repository Markdown | deployment content import |
| Main navigation and home shortcuts | `navigation.yml` | Butterfly menu projection and portal renderer |
| Friend links | `link.yml` | Butterfly friend page |
| Shared brand/media assets | `packages/shared-assets/` | portal `source/shared-assets` mapping |
| UI translations | `packages/shared-assets/locales/site-ui/` | renderer fallbacks and runtime i18n |

`_config.butterfly.yml` must not duplicate CMS-managed profile values or the
navigation menu. It may contain safe fallback values only where Butterfly
requires a schema entry. Each projected field will be listed in a small
machine-readable projection map and tested.

The repository will retain generated YAML snapshots so a clean checkout can
build the same public content without a live database. Export and import will
be explicit commands. Deployment will no longer perform an ambiguous
bidirectional `_data` synchronization.

## Build architecture

All build entry points will call one portal build command:

1. validate repository-owned content and exported snapshots;
2. project profile/navigation data into an in-memory Butterfly configuration;
3. generate Hexo output;
4. validate generated HTML and internal asset/link references.

Build versioning will come from `PORTAL_BUILD_VERSION`, defaulting to the current
Git commit or `dev`. The value will be injected during generation. Post-build
search-and-replace is removed.

The server rebuild service and `scripts/deploy.sh` will invoke the same command.
The home generator will use the same route strategy everywhere and will not be
renamed during server builds.

Generated favicon variants will be prepared once under canonical shared assets.
Builds will never write `source/logo.png`, copy icons during `before_generate`,
or modify the document title to refresh a favicon.

## Code boundaries

The current renderer will be split by responsibility:

- a Hexo entry script for generators, tags, filters, and data wiring;
- pure data normalization and URL helpers;
- home renderer;
- about renderer;
- portfolio renderer;
- contact renderer;
- small shared HTML primitives.

Pure modules will live outside Hexo's auto-loaded `scripts/` directory. The
entry script remains small and calls them through explicit interfaces.

Custom CSS will be divided into tokens/base, hero, portal pages/cards, controls,
and responsive/accessibility layers. Selectors that only undo old experiments
will be removed after visual regression checks.

Runtime JavaScript will use one idempotent initializer contract that works both
on initial load and Butterfly navigation events. Global document listeners,
observers, and timers must be installed once and cleaned up when appropriate.

## Functional corrections

- Set Hexo's primary language to `en`; keep supported runtime locales in the
  shared locale contract. Runtime switching updates `document.documentElement.lang`.
- Hide portfolio navigation, shortcuts, and homepage sections when there are no
  portfolio items. The page can be restored automatically when real items exist.
- Replace Formspree with a validated backend contact endpoint using the existing
  Hono application, same-origin cookies/security policy, rate limiting, and
  honeypot protection. The UI must show submitting, success, validation-error,
  and network-error states.
- Keep Waline but verify its public read/write path independently from the portal
  backend. Listing pages remain comment-free.
- Lazy-load APlayer and Meting only after the visitor opens the music control.
  The page shell must remain usable if the music provider is unavailable.
- Prefer native image lazy loading and local/self-hosted assets where practical.
- Preserve search, dark/light mode, archives, categories, tags, friend links,
  article TOC, math rendering, Mermaid rendering, and responsive navigation.

## Visual direction

The selected direction is an editorial technical portfolio with a restrained
anime atmosphere:

- retain a cinematic hero, but reduce it to roughly `78svh` on desktop and
  `64svh` on mobile so content is discoverable without a full-screen dead zone;
- use the hero image as atmosphere rather than the only source of identity;
- use a midnight/navy foundation, cool cyan primary accent, and a small muted
  magenta accent drawn from the existing artwork;
- establish one spacing scale, one radius scale, and semantic surface/text/border
  tokens for both light and dark themes;
- keep body text content-first with 45–75 character lines and stronger hierarchy;
- turn recent posts into compact editorial cards with clear date/category,
  title, excerpt, and optional cover instead of large empty white panels;
- remove empty homepage and page sections instead of rendering placeholders;
- make About read like a personal profile rather than a generated schema demo;
- keep the music control secondary and non-blocking;
- add subtle hover/fade motion and honor `prefers-reduced-motion`;
- meet WCAG 2.1 AA contrast and visible keyboard-focus requirements.

The approved visual reference remains `https://atritium.github.io`, used for its
content density and Butterfly-native clarity. The result will retain more
personal artwork and stronger project identity than the reference.

## Testing and acceptance

The portal will use Node's built-in test runner to avoid a new test framework.
Tests will cover:

- data normalization and escaping;
- source-of-truth projection rules;
- renderer output and empty-state suppression;
- build-version injection;
- locale normalization;
- contact endpoint validation and error responses;
- one-time runtime initialization contracts where practical.

Generated-output validation will assert:

- `npm run build` succeeds from a clean checkout;
- no literal `BUILD_VER`, placeholder domain, Formspree endpoint, or serialized
  language array remains in HTML;
- every internal `href` and `src` resolves;
- every page has a title, canonical URL, valid description where applicable,
  exactly one primary language, and no duplicate IDs;
- no empty portfolio surface appears when the portfolio dataset is empty.

Manual visual verification will cover desktop and mobile widths, dark and light
themes, homepage, article, archives/categories, About, Contact, friend links,
search, locale switcher, music failure fallback, and reduced-motion mode.

## Migration sequence

1. Add baseline tests and generated-output validators.
2. Centralize build version and language handling.
3. Replace favicon runtime mutation with static canonical assets.
4. Introduce explicit content snapshot export/import and remove ambiguous sync.
5. Split renderer and stylesheet while preserving current output.
6. Correct empty portfolio behavior and stale documentation.
7. Add the backend-owned contact flow.
8. Defer music dependencies and harden optional integrations.
9. Apply the visual token system and page-level refresh.
10. Run full build, link, functional, responsive, and visual verification.

Each step must keep the site buildable and will be committed independently.
