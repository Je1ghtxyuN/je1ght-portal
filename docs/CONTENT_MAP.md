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
| Public portal UI translations | `packages/shared-assets/locales/portal-ui/` | semantic `data-ui-*` attributes |
| Authored content translations | language-specific Markdown/routes when present | never runtime DOM replacement |
| Brand/media assets | `packages/shared-assets/` | `source/shared-assets` mapping |
| Contact form destination | MySQL `SiteProfile.contact.formspree_endpoint` | direct Formspree form action |

Use `scripts/content-snapshot.sh` for explicit database snapshot operations.
Normal deployment never synchronizes database-owned `_data` files in both
directions.

## Profile field projection

The table below is the override audit for values editable at `/admin/`. The
left column is authoritative; the right column is generated or projected and
must not be edited as a competing source.

| Admin / `SiteProfile` field | Runtime consumer | Overrides |
| --- | --- | --- |
| `owner.display_name` | Hexo author and Butterfly author | `_config.yml: author` |
| `subtitle` | Hexo subtitle, Butterfly subtitle and site subtitle | `_config.yml: subtitle`, Butterfly subtitle placeholders |
| `icon_path` | Butterfly nav logo; derived `site-favicon.png` path | Butterfly `nav.logo` and `favicon` |
| `avatar_path` | Butterfly sidebar avatar | Butterfly `avatar.img` |
| `hero_background_path` | default, index, archive, tag, and category top images | Butterfly top-image fields |
| `site_started_year` | Butterfly footer owner year | Butterfly `footer.owner.since` |
| `site_started_date`, `footer_note` | generated footer custom text and runtime counter | Butterfly `footer.custom_text` |
| `social_links` | Butterfly social menu | Butterfly `social` |
| `contact.*` except endpoint | Contact page renderer | no Butterfly setting |
| `contact.formspree_endpoint` | Contact form `action` | no fallback or hard-coded endpoint |
| `intro.*`, `about.*`, `home.*`, `hero_phrases` | focused portal renderers/browser behavior | no Butterfly setting |

`navigation.yml` independently owns the Butterfly menu and homepage shortcuts.
An empty `portfolio.yml` intentionally removes Portfolio from both. Portal UI
JSON can replace controls, labels, placeholders, search, empty states, and
music wrapper messages in the browser. It does not own paths, articles, profile
copy, project descriptions, experience, skills, categories, tags, or the
homepage subtitle.

## Precedence rules

1. Admin saves profile data to MySQL.
2. **Rebuild Portal** exports MySQL to the managed YAML snapshot.
3. Hexo reads that snapshot.
4. `portal-data-sync.js` applies the explicit projection above in memory.
5. Butterfly renders the projected values.

Therefore values in `_config.butterfly.yml` that are listed in the projection
table are defaults/placeholders, not a second editing surface. The projection
does not write back to source files. After a production Admin edit, pull and
commit the snapshot so GitHub retains the current rebuildable state.

## Build flow

1. Hexo loads Markdown and `_data` snapshots.
2. `scripts/portal-data-sync.js` calls
   `lib/portal/adapters/butterfly-theme-projection.js` to project profile and
   navigation values into an in-memory Butterfly configuration.
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
Editable content belongs in profile/navigation/Markdown data. Interface wording
belongs in `packages/shared-assets/locales/portal-ui/`. Neither belongs in the
Butterfly override.

## Theme boundary

| Responsibility | Owner |
| --- | --- |
| Semantic page rendering | `lib/portal/render/` |
| Portal interface locale runtime | `source/js/portal-locale-core.js` |
| Butterfly DOM selectors, PJAX, and toolbar placement | `source/js/adapters/butterfly-adapter.js` |
| Butterfly build-time configuration | `lib/portal/adapters/butterfly-theme-projection.js` |
| Music loading and translated wrapper state | `source/js/portal-music-player.js` |

Changing Hexo themes must not require edits to the renderer, portal UI
catalogs, locale core, music controller, content snapshots, or Formspree form.
Replace the DOM adapter, replace the build-time theme projection, and add the
new theme configuration file.
