# Portal UI, Localization, and Theme Boundary Design

Date: 2026-07-28

## Goal

Restore a coherent public portal that keeps the selected original-style
homepage composition, uses editorial typography deliberately, translates every
piece of interface chrome, never treats authored content as interface text, and
can move from Butterfly to another Hexo theme without rewriting the portal
renderer or feature logic.

## Confirmed Direction

The visual direction is option A from the companion:

- center the profile image and identity in the homepage hero;
- crop the avatar to a true circle without stretching;
- keep the background image and restrained immersive presentation;
- retain an editorial serif face for the site name and page headings;
- use the existing sans-serif face for body copy, navigation, controls, forms,
  metadata, and music UI;
- remove decorative phrases that were not supplied by the owner.

The following hardcoded additions must be removed:

- `PERSONAL NOTES / SELECTED WORK`;
- `Directory`;
- `Journal`;
- `Profile`;
- `Say hello`;
- `Work`;
- any equivalent decorative eyebrow or fallback sentence that presents itself
  as owner-authored copy.

Page headings may come from the UI dictionary. Personal introductions, article
titles, article bodies, project descriptions, experience entries, the homepage
subtitle, and other owner-authored copy may only come from content data.

## Diagnosed Causes

The July visual refactor introduced two direct regressions:

1. `hero.css` added an English pseudo-element through CSS `content` and changed
   the avatar from a circle to an asymmetric blob radius.
2. Splitting the original renderer removed most of its `data-i18n` attributes.
   The new renderer modules then added English labels and fallbacks directly,
   while the runtime translator still translated only marked DOM nodes.

The current `portal-i18n.js` also mixes four responsibilities:

- locale storage and bundle loading;
- semantic page translation;
- Butterfly navigation/sidebar/search selectors;
- creation and placement of the language control.

The music player independently hardcodes its button title, initial status,
loading state, and failure text in English. This prevents complete locale and
theme adaptation.

## Content and Interface Ownership

### Interface text

Interface text includes:

- navigation and search chrome;
- page and section labels;
- control titles and accessible labels;
- form labels, placeholders, submit state, and validation/failure messages;
- empty states;
- language menu text;
- music panel title, loading state, failure state, and controls owned by the
  portal wrapper.

Portal interface text is stored in:

```text
packages/shared-assets/locales/portal-ui/
  en.json
  zh-CN.json
  zh-TW.json
  ja.json
```

All four files must contain the same leaf-key set. Empty strings are not valid
for keys rendered in the portal.

### Authored content

Authored content includes:

- post and page body content;
- post titles, excerpts, categories, and tags;
- profile introduction, experience, skills, and subtitle;
- project names and descriptions;
- contact availability notes;
- any other text saved through Admin as site content.

The runtime locale switcher must not replace authored content. Authored content
continues to come from Markdown, `SiteProfile`, portfolio records, and their
versioned YAML snapshots.

If multilingual authored content is introduced later, it must use explicit
Hexo language-specific source files or routes. It must not be inserted into the
portal UI dictionary or translated by DOM text replacement.

The selected locale preference remains shared through the existing
`site-locale` storage key so another app can honor the preference, but each app
loads its own interface bundle.

## Architecture

### Theme-independent locale core

`source/js/portal-locale-core.js` owns:

- locale normalization;
- local storage;
- locale bundle loading and fallback;
- translation lookup and interpolation;
- applying `data-ui-key`, `data-ui-placeholder`, `data-ui-value`, and
  `data-ui-aria-label`;
- publishing locale changes through a stable API and a
  `portal:locale-change` custom event;
- reapplying semantic translation after PJAX navigation without knowing which
  theme performs the navigation.

It must not contain Butterfly selectors or create theme-specific controls.

The public API is:

```js
window.PortalLocale = {
  apply(locale),
  getLocale(),
  t(key, fallback, params),
  subscribe(listener),
}
```

Subscribers receive:

```js
{
  locale: 'zh-CN',
  t: window.PortalLocale.t,
}
```

### Semantic renderer output

Theme-independent renderer helpers emit interface attributes:

```html
<h1 data-ui-key="about.title">About Me</h1>
<span data-ui-key="contact.nameLabel">Name</span>
<input data-ui-placeholder="contact.namePlaceholder">
```

Owner-authored values are rendered without `data-ui-*` attributes:

```html
<p class="portal-authored-content">Owner supplied introduction</p>
```

The renderer may use English UI fallbacks to preserve useful no-JavaScript
output, but every such fallback must have a dictionary key and semantic
attribute. It may not invent owner copy.

### Butterfly adapter

`source/js/adapters/butterfly-adapter.js` is the only public portal script that
may query Butterfly-specific elements such as:

- `#rightside-config-hide`;
- `#rightside-config-show`;
- `#nav`;
- `#sidebar-menus`;
- Butterfly search dialog and sidebar classes.

It mounts the locale and music buttons, translates Butterfly-provided
navigation/sidebar/search text, and reapplies the adapter after PJAX events.

If its expected mount point does not exist, it creates a small generic floating
toolbar marked with `data-portal-toolbar`. This fallback keeps language and
music controls usable under another Hexo theme.

Theme configuration projection remains an adapter concern. The existing
Butterfly projection implementation moves to
`lib/portal/adapters/butterfly-theme-projection.js`; a compatibility re-export
at its current path prevents an abrupt internal API break. Renderer and locale
modules do not import the adapter.

### Music UI

`portal-music-player.js` owns player loading and wrapper state, but receives its
mount target from the adapter and receives text through `PortalLocale`.

It must translate:

- the music button accessible label and tooltip;
- panel title;
- initial state;
- loading state;
- unavailable/error state;
- close action.

The panel subscribes to locale changes so an already-open panel updates without
being recreated. APlayer/Meting remain lazy-loaded after explicit user intent.
Third-party track names and provider-owned labels are content/provider data and
are not rewritten by the portal translator.

## Visual System

### Hero

- Avatar width and height are equal at every breakpoint.
- Avatar uses `aspect-ratio: 1`, `border-radius: 50%`, and `object-fit: cover`.
- Hero identity is centered and does not contain a CSS pseudo-element with
  text.
- The homepage subtitle is owner-authored content and remains unchanged when
  the interface locale changes.
- Reduced-motion mode disables cursor, bounce, and background transitions.

### Typography

- Editorial serif: homepage name and semantic `h1`/`h2` page headings.
- Sans serif: all body copy, cards, navigation, metadata, form fields,
  language UI, and music UI.
- CSS may not generate visible words through `content`, except nonverbal
  symbols with an accessible text equivalent.

### Shared surfaces

Homepage sections, About, Contact, Portfolio, archive/category/tag pages, and
post pages share:

- semantic background, text, muted, border, surface, accent, and shadow tokens;
- the same card radius family;
- the same content width and vertical rhythm;
- the same light/dark contrast rules.

Portal tokens provide standalone fallback values. The Butterfly adapter may
map them to theme variables when present, but core components never require
Butterfly variables to render correctly.

### Light and dark behavior

- Both modes meet readable contrast for body text, muted text, fields, menus,
  music UI, and focus rings.
- Language and music popovers use the current surface and border tokens.
- APlayer receives explicit light/dark wrapper overrides.
- The existing Butterfly theme toggle remains usable through the adapter.
- A non-Butterfly theme can drive the same components by setting
  `data-theme="light"` or `data-theme="dark"`; system preference is the fallback
  when neither is set.

## Validation

### Automated

Tests must prove:

- the avatar is a circular, non-stretched 1:1 image;
- no public CSS file emits visible English copy through `content`;
- renderer-generated UI text has a `data-ui-*` key;
- owner-authored content has no UI translation attribute;
- all portal UI locales contain identical nonempty leaf-key sets;
- locale core contains no Butterfly selector;
- Butterfly selectors are isolated to the adapter;
- music loading, error, tooltip, and close text come from translation keys;
- language and music controls have a generic mount fallback;
- semantic tokens contain light and dark values;
- generated pages contain no unresolved keys, placeholders, duplicate IDs, or
  broken internal assets/links;
- Formspree remains the generated Contact form destination;
- backend Admin and snapshot tests continue to pass.

### Browser QA

Desktop and narrow viewport checks cover:

- homepage;
- one post;
- archives, categories, and tags;
- About;
- Contact;
- Friends;
- light and dark modes;
- English, Simplified Chinese, Traditional Chinese, and Japanese;
- language switching without changing a post title/body or profile content;
- language dropdown and music panel in both themes;
- music success or failure state;
- PJAX navigation followed by locale reapplication;
- exact production URLs after deployment.

## Deployment and Safety

Implementation is committed to the existing audit branch and pushed to its
open pull request. The production content snapshot preflight remains in force.
Deployment updates the real 1Panel OpenResty topology and recreates only the
managed backend/Waline services when necessary.

Production verification must confirm:

- public HTML, CSS, JavaScript, and locale bundles return 200;
- the homepage no longer contains the removed phrase;
- the live avatar is circular;
- Formspree remains present;
- Admin health and login routes remain reachable;
- the GitHub remote head matches the deployed source commit.
