# Development Roadmap

Last updated: 2026-05-16
Status: long-term phased execution roadmap

## Roadmap Use

This roadmap is intended to guide gradual execution across many future sessions. It is phase-oriented on purpose so the rebuild can remain organized while the legacy SPA and the new platform coexist during migration.

## Phase 1 — Architecture Memory Initialization

### Objectives

- establish a permanent architectural memory center
- align future sessions around the real target platform instead of the legacy SPA
- document the current repository truth, migration boundaries, and long-term priorities

### Detailed Checklist

- create `docs/AI_PROJECT_MEMORY/`
- define the final target architecture and service split
- record immutable project context and non-negotiable constraints
- create a phased roadmap for future execution
- initialize a persistent Codex engineering worklog
- create a monorepo structure proposal for the future platform
- capture the core rule that the old React/Firebase SPA is a migration source, not the end state
- identify which legacy resources are worth migrating as content/assets/schema knowledge

### Dependency Notes

- depends on having a trustworthy repository audit
- unblocks every later phase
- should be completed before any major scaffolding or migration work begins

## Phase 2 — Hexo Butterfly Portal Construction

### Objectives

- build the new main public website on Hexo
- establish the long-term public-facing information architecture
- migrate profile, portfolio, gallery, and blog presentation into a static-first portal

### Detailed Checklist

- scaffold the Hexo portal in the future monorepo structure
- install and configure `hexo-theme-butterfly`
- define final portal navigation, page taxonomy, and content architecture
- create the home page, about/profile page, works page, gallery page, and blog index/detail flows
- map legacy localized content into the new portal content structure
- migrate or rewrite blog posts into Hexo-compatible content format
- customize Butterfly theme output to match the project's intended atmosphere
- integrate the Study Room entry point as a first-class portal surface
- define asset organization for images, profile media, gallery items, and project visuals
- establish SEO foundations: metadata, sitemap, feed strategy, canonical URLs, Open Graph
- ensure responsive behavior across desktop and mobile

### Dependency Notes

- depends on Phase 1 architectural memory
- can begin before the backend is fully built if dynamic pieces are stubbed or temporarily disabled
- should not depend on preserving the old SPA routing model

## Phase 3 — Study Room Web App Construction — COMPLETED (2026-05-16)

**Status: Completed and separated into independent repository.** The Study Room is now a standalone app at `study.je1ght.top` with its own React frontend, Hono backend, MySQL database, and Docker Compose stack. See `/Users/je1ghtxyun/code/personal-website/study-app/` for the codebase.

### Objectives (historical)

### Detailed Checklist

- define the initial Study Room feature scope
- decide the first release feature set: timer, ambience, music controls, wallpapers, presets, settings, session UX
- create the application shell, routing, and layout model
- build audio and ambience controls with graceful client-side behavior
- build timer and focus-state interactions
- create a settings/preferences model that can work locally first
- define which user state is local-only and which should eventually sync through the backend
- reuse shared branding, locale, and assets where appropriate
- validate that the app remains performant during long-lived browser sessions
- plan mainland-safe media delivery and caching behavior

### Dependency Notes

- depends on Phase 1 decisions
- can progress in parallel with Phase 2 once shared asset and branding direction are clear
- advanced persistence and account-linked features depend on Phase 4 backend capabilities

## Phase 4 — Backend + MySQL + Prisma + Admin System Construction

### Objectives

- create the platform trust boundary that replaces Firebase browser-direct architecture
- establish self-hosted data ownership
- build the admin system needed to manage content and operations safely

### Detailed Checklist

- choose and record the backend implementation framework if not already decided
- create the backend service structure in the monorepo
- provision MySQL and define the first Prisma schema
- create migration and seed workflows
- define explicit user roles and permissions
- implement admin authentication and secure session handling
- add content management capabilities for profile/site settings, works, gallery data, and future structured content
- add comment ingestion, moderation, and retrieval endpoints
- add contact form submission and admin review workflows
- add Study Room configuration and optional persistence APIs
- design media metadata and upload handling strategy
- implement logging, validation, rate limiting, and operational safeguards
- establish backup and restore processes for MySQL

### Dependency Notes

- depends on Phase 1 architectural decisions
- benefits from content/domain clarity discovered during Phases 2 and 3
- must be substantially complete before Firebase can be retired

## Phase 5 — Full Integration and Deployment Migration

### Objectives

- connect the portal, Study Room, and backend into one coherent platform
- migrate production hosting from the legacy static/cloud setup to the self-hosted architecture
- phase out Firebase safely

### Detailed Checklist

- connect Hexo pages to the backend comment system
- connect the contact flow to the backend
- connect Study Room dynamic features to backend services where needed
- migrate legacy Firestore content into MySQL, Markdown, or other final storage targets
- migrate approved static media into the shared asset system
- prepare Docker images and deployment configuration for all services
- configure Ubuntu reverse proxy and internal Docker networking
- configure Cloudflare DNS, proxy, TLS, and caching policies
- validate staging deployment before public cutover
- test China mainland accessibility on the staging environment
- plan and rehearse rollback steps
- switch production traffic
- disable legacy Firebase writes
- retain and monitor the owner-approved Formspree email delivery flow
- phase out Firebase services in a controlled sequence

### Dependency Notes

- depends on meaningful completion of Phases 2, 3, and 4
- requires migration scripts and deployment playbooks
- should not be attempted as a single unplanned cutover

## Phase 6 — Optimization, SEO, Analytics, Future Expansion

### Objectives

- harden the platform after migration
- improve discoverability, maintainability, and operational resilience
- prepare the system for future growth without structural churn

### Detailed Checklist

- optimize asset caching and compression behavior
- improve image handling and static asset delivery
- strengthen Lighthouse and Core Web Vitals performance where meaningful
- complete structured data, sitemap, feed, and indexing refinements
- add privacy-conscious analytics strategy
- refine admin UX and moderation workflow ergonomics
- improve accessibility and device-level QA coverage
- add monitoring and alerting where needed
- test backup and restore regularly
- review spam controls and adjust contact/comment defenses
- plan future expansions such as search, notes, reading logs, richer case studies, or Study Room account sync

### Dependency Notes

- depends on a stable integrated production platform
- should be iterative and continuous rather than treated as a one-time finishing pass

## Sequencing Notes

- the public portal and Study Room are separate workstreams, but both rely on the Phase 1 architecture memory
- the backend should be introduced deliberately rather than rushed, because it becomes the security and data ownership core of the platform
- Firebase removal should be the result of successful replacement, not a premature first move
