# Content Editing Guide

This guide explains how the blog portal content is organized and how each file feeds into the current UI.

## 1. Where Blog Posts Live

Blog posts are stored in:

- `source/_posts/`

How to write a new post:

- create one markdown file per article
- add front matter at the top
- write the body in normal markdown below it
- use headings, lists, quotes, and code blocks freely

Useful front matter example:

```yaml
---
title: Example Post
date: 2026-04-27 09:00:00
description: Short summary used by the homepage preview and metadata.
categories:
  - Engineering
tags:
  - Hexo
  - Architecture
---
```

How posts flow into the UI:

- the latest posts automatically appear on the custom homepage
- the generated post index is available at `/blog/`
- posts also feed the archives, categories, tags, and search index

Important note:

- the homepage recent-post count is controlled in `lib/portal/render/data.js`
- edit `PORTAL_CONFIG.HOMEPAGE_POST_LIMIT` to change how many posts appear on the homepage

## 2. Where Profile And Identity Content Lives

Profile and site identity data is stored in:

- `source/_data/site_profile.yml`

Edit this file when you want to change:

- display name and subtitle
- hero intro text
- avatar, icon, and background paths
- social links
- contact metadata
- about page skills and experience
- Study Room entry copy

How it flows into the UI:

- homepage hero
- homepage footer contact and social section
- about page content
- Study Room landing page
- parts of the Butterfly shell through `scripts/portal-data-sync.js`

## 3. Where Portfolio Data Lives

Portfolio content is stored in:

- `source/_data/portfolio.yml`

Each card can contain:

- title
- year
- status
- summary
- cover image
- gallery images
- tech stack
- tags
- optional links

How it flows into the UI:

- the homepage portfolio preview section reads from this file
- the full `/portfolio/` page also reads from this file

## 4. Where Navigation Data Lives

Navigation data is stored in:

- `source/_data/navigation.yml`

This file controls:

- top-level menu entries
- homepage shortcut cards

Important note:

- the Butterfly menu is synchronized from this file by `scripts/portal-data-sync.js`

## 5. Where Custom Page Shells Live

Main portal page shells live here:

- `source/archives/index.md`
- `source/about/index.md`
- `source/contact/index.md`
- `source/portfolio/index.md`
- `source/study-room/index.md`

Important note:

- the homepage is generated at the root route by `scripts/portal-home-generator.js`
- the branded rendering logic lives in `lib/portal/render/`
- the about, portfolio, and Study Room page shells stay intentionally lightweight
- the current tag entry points are `{% portal_about %}`, `{% portal_portfolio %}`, and `{% portal_study_room %}`

## 6. Where Shared Images And Media Live

Canonical shared assets are maintained in:

- `packages/shared-assets/`

The blog portal consumes them through:

- `source/shared-assets`

Editing rule:

- change the canonical files in `packages/shared-assets/`
- do not edit or duplicate files under the mounted path unless the asset strategy changes

## 7. Which Files Will Likely Be CMS-Managed Later

The best future CMS candidates are:

- `source/_posts/`
- `source/_data/site_profile.yml`
- `source/_data/portfolio.yml`
- `source/_data/navigation.yml`
- selected custom page markdown files such as `source/contact/index.md`

## 8. Safest Editing Workflow

- change one content area at a time
- rebuild or run the local Hexo server after each meaningful edit
- check the homepage after editing posts, profile data, or portfolio data
- check navigation after editing `source/_data/navigation.yml`
- check image paths after changing any asset reference
