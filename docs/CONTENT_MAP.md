# Content Map

## Ownership

| Content | Canonical owner | Build representation |
| --- | --- | --- |
| Site profile | MySQL `SiteProfile` | `source/_data/site_profile.yml` snapshot |
| Portfolio | MySQL `PortfolioItem` | `source/_data/portfolio.yml` snapshot |
| Admin posts | MySQL `BlogPost` | managed Markdown snapshot |
| Manual posts and drafts | repository Markdown | imported intentionally |
| Navigation and shortcuts | `source/_data/navigation.yml` | direct |
| Friend links | `source/_data/link.yml` | direct |
| UI translations | `packages/shared-assets/locales/site-ui/` | direct |
| Brand/media assets | `packages/shared-assets/` | `source/shared-assets` mapping |

Use `scripts/content-snapshot.sh` for explicit database snapshot operations.
Normal deployment never synchronizes database-owned `_data` files in both
directions.

## Build flow

1. Hexo loads Markdown and `_data` snapshots.
2. `scripts/portal-data-sync.js` projects profile and navigation values into an
   in-memory Butterfly configuration.
3. `scripts/portal-home-generator.js` owns `/`.
4. `lib/portal/create-renderer.js` composes focused renderers under
   `lib/portal/render/`.
5. Empty portfolio data suppresses its menu, shortcut, and homepage preview.
6. Butterfly renders the shell and Hexo writes `public/`.
7. `lib/portal/validate-output.js` validates all generated HTML and internal
   references.

## Structural settings

Recent-post and portfolio-preview limits live in
`lib/portal/render/data.js`. Visual structure lives in `source/css/portal/`.
Editable wording belongs in profile/navigation/locale data, not in the
Butterfly override.
