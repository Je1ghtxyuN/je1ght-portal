# Editorial Taxonomy Pages and Theme Footer Design

Date: 2026-07-29  
Status: Approved visual direction; awaiting written-spec review

## Goal

Bring the Archives, Categories, and Tags page families into the same restrained
editorial system as the homepage. Remove the hard visual break between their
top image and content, use the established serif display typography, and make
the footer genuinely theme-aware.

## Scope

This design applies to:

- `/archives/` and year/month archive pages
- `/categories/` and every category detail page
- `/tags/` and every tag detail page
- the shared footer in light and dark themes

It does not change authored posts, taxonomy names, navigation data, the Admin
content model, or Hexo/Butterfly source packages.

## Selected Direction

Direction A, “soft-fade editorial pages,” is the approved direction.

Each scoped page keeps the existing owner-selected background image, but uses a
short editorial masthead instead of a visually dominant cover. A dark image
overlay protects title contrast. The masthead ends in a gradient whose final
color is `--portal-bg`, so the image dissolves into the current theme rather
than ending at a hard horizontal boundary.

## Visual System

### Masthead

- Target height: 260px above 768px and 210px at or below 768px.
- Keep the existing background position and image source projected by the
  Admin-managed Site Profile.
- Use a stable dark overlay in both themes so the image and white title remain
  predictable.
- Fade the bottom edge to `var(--portal-bg)`.
- Keep the primary navigation above the overlay with sufficient contrast.

### Typography

- Page masthead titles use `var(--portal-heading-font)`.
- Archive summary titles, archive year markers, taxonomy page headings, and
  taxonomy list links use the same editorial heading family where appropriate.
- Dates, counts, metadata, and body copy remain in
  `var(--portal-body-font)` for scanability.
- Authored taxonomy names are never translated or rewritten by CSS or runtime
  localization.

### Content Surfaces

- Preserve Butterfly’s generated DOM and page behavior.
- Restyle archive, category, tag, and sidebar surfaces with Portal tokens:
  `--portal-surface`, `--portal-border`, `--portal-shadow`, and Portal radii.
- Avoid recreating taxonomy generators or introducing a Portal-only content
  renderer.
- Maintain readable information density; no large overlapping cards or extra
  marketing copy.

### Footer

- Remove fixed light-theme dark coloring.
- Add explicit footer tokens for background, foreground, muted foreground, and
  border in both root and dark theme scopes.
- Light theme uses a warm neutral surface adjacent to `--portal-bg`, separated
  by a subtle top border.
- Dark theme uses the established deep blue-black palette with the same
  hierarchy.
- Footer links and runtime text must inherit accessible colors in both themes.

## Architecture Boundary

The implementation belongs to the Portal CSS Butterfly-compatibility layer.
It may target Butterfly-generated page type classes and markup, but must not:

- modify `node_modules/hexo-theme-butterfly`
- place Butterfly selectors in the theme-independent locale core or renderers
- change authored data or Admin snapshots
- add JavaScript solely to achieve visual styling

The shared color and typography values remain Portal tokens. Theme-specific DOM
selectors are isolated in a dedicated stylesheet layer so a future Hexo theme
can replace that adapter without rewriting content or localization.

## Responsive and Accessibility Requirements

- The masthead remains compact at mobile widths and never forces horizontal
  scrolling.
- Titles retain white contrast over the image in both themes.
- Reduced-motion preferences require no special exception because the design
  adds no motion.
- Focus outlines remain visible on taxonomy and archive links.
- Footer contrast must meet the existing Portal foreground hierarchy in both
  themes.

## Testing and Acceptance

Automated checks will verify:

- the stylesheet is injected after shared Portal layers
- all scoped page families are covered
- mastheads use the Portal heading token and fade to `--portal-bg`
- footer colors come from light/dark tokens rather than fixed dark values
- no authored content or theme package files are modified
- a clean Hexo build and generated-output validation pass

Production acceptance requires:

- Archives, Categories, Tags, and representative detail pages return HTTP 200
- desktop and mobile-width visual checks show a continuous masthead transition
- light and dark theme screenshots show a matching footer
- production assets use the new Git commit cache-bust version
