# Master Architecture

Last updated: 2026-05-16
Status: long-term target architecture memory

## Purpose

This document defines the final target architecture for the rebuilt platform.

The current repository is a legacy React + Vite + Firebase single-page application. That legacy SPA is not the final architecture target. During the rebuild, only the following should be migrated forward:

- content and writing
- static assets
- localization content
- useful UX ideas
- legacy data/domain knowledge
- schema and collection knowledge from the old Firebase model

The old browser-heavy Firebase SPA should be treated as a migration source, not as the architectural foundation of the future platform.

## Final System Split

### 1. Hexo Blog Portal

Primary role:

- main public website
- personal flagship portal
- technical blog
- portfolio and works showcase
- profile and long-form public pages
- SEO-first entry point for most visitors

Core characteristics:

- built with Hexo
- fixed preferred theme: `hexo-theme-butterfly` by `jerryc127`
- static-first rendering for speed, SEO, and operational simplicity
- customized visual layer aligned with the project aesthetic rather than default theme output
- may consume selected backend APIs for dynamic surfaces such as comments, contact submission status, or lightweight counters

Expected public responsibility boundary:

- blog posts and article pages
- about/profile presentation
- works/project pages
- photo/gallery pages

### 2. Study Room Interactive Web Application — SEPARATED

**Status: Completed and separated into independent repository (2026-05-16)**

The Study Room now lives in its own independent repo at `/Users/je1ghtxyun/code/personal-website/study-app/` and deploys to `study.je1ght.top`.

It has its own:
- React 19 + Vite 8 frontend
- Hono + Prisma backend (port 3002)
- MySQL database (`study_app_db`)
- Docker Compose stack (backend + nginx + mysql)
- Cloudflare Tunnel for public access
- Independent deploy script (`scripts/deploy.sh`)

The portal no longer hosts, syncs, or links to the study-app subpath. The two systems are fully decoupled.

### 3. Admin/API Backend Service

Primary role:

- single trusted server boundary for all authenticated and dynamic platform operations
- operational control plane for content, moderation, contact intake, uploads, and Study Room data services

Core characteristics:

- self-hosted server application
- exposes public API endpoints, protected admin endpoints, and admin-facing management capabilities
- owns authentication, authorization, validation, rate limiting, and auditability
- becomes the replacement for browser-direct Firebase usage and Formspree submission flow

Expected responsibility boundary:

- admin authentication and session management
- role and permission enforcement
- content metadata CRUD for works, gallery items, site settings, and future structured content
- comment intake, moderation, and public retrieval
- contact form intake and processing
- media metadata management
- Study Room dynamic configuration and optional user state APIs
- migrations, backups, and operational data controls

### 4. Shared Static Assets and Common Config

Primary role:

- common asset source of truth
- shared environment/config conventions
- reusable localization and contract definitions across portal, Study Room, and backend

Expected contents:

- images and shared media manifests
- shared icons and identity assets
- common locale resources
- shared type/contracts definitions
- environment schema and deployment configuration templates

## Deployment Topology

### Production Base

The production base is:

- Ubuntu Server
- Docker-based service deployment
- Cloudflare as the public DNS, CDN, and reverse-proxy layer

### Recommended Topology

```text
Visitor Browser
  -> Cloudflare DNS / CDN / TLS / caching / WAF
    -> Ubuntu Server
      -> reverse proxy container or host-level proxy
        -> Hexo portal static service
        -> Study Room web app service
        -> Admin/API backend service
        -> shared asset origin path
      -> private Docker network
        -> MySQL service
```

### Recommended Public Routing Model

Preferred logical split:

- apex domain or `www` subdomain: Hexo Blog Portal
- `study` subdomain: Study Room app
- `api` subdomain: public and authenticated API endpoints
- `admin` subdomain or protected `/admin` entry on the platform service: admin system

Reasoning:

- keeps portal, app, and backend operationally independent
- reduces deployment coupling
- makes caching policies easier to manage
- supports future scale and service replacement without redesigning the whole domain model

### Reverse Proxy Expectations

The reverse proxy layer on Ubuntu should:

- terminate origin traffic from Cloudflare
- route requests to the correct Docker service
- enforce security headers
- manage gzip/brotli where appropriate
- expose only intended public ports
- keep MySQL non-public and reachable only through the Docker private network

### Operational Model

Initial orchestration target:

- Docker Compose is sufficient for the early self-hosted production phase

Current production deployment:

- Portal: `je1ght.top` — Hexo static + Hono backend + MySQL (`je1ght_space`)
- Study App: `study.je1ght.top` — React SPA + Hono backend + MySQL (`study_app_db`)
- Both stacks use Docker Compose on the same Ubuntu server
- Portal uses host-level Cloudflare Tunnel; study-app uses its own tunnel

Operational expectations:

- versioned environment files
- automated database backup schedule
- image/version pinning
- zero-trust assumption between browser and database
- explicit health checks for each service

## Data Architecture

### Primary Database

The authoritative structured data store is a self-hosted MySQL database.

MySQL is the source of truth for:

- admin users and roles
- structured site settings
- portfolio/work metadata
- gallery metadata
- comments and moderation state
- contact messages
- study room presets and optional user state
- future analytics or event summaries if later stored internally

### ORM and Schema Layer

Prisma is the required data access layer.

Prisma responsibilities:

- schema definition under version control
- migration generation and execution
- typed data access from the backend service
- a stable contract between backend modules and MySQL

Non-negotiable rule:

- browsers never connect to MySQL directly
- Prisma is used server-side only

### Static vs Dynamic Data Split

The final platform intentionally separates static content from dynamic platform data.

Static-first content:

- blog article bodies
- many public pages
- theme/layout content

Dynamic data:

- comments
- admin settings
- contact submissions
- moderation state
- study room user state

This split keeps the portal fast and SEO-friendly while preserving room for interactive growth.

## Backend API Responsibility Boundaries

The backend exists to own the server-trust boundary. It should not become a dumping ground for presentation concerns that belong to Hexo or the Study Room UI.

### Backend Owns

- authentication and secure session issuance
- authorization and role enforcement
- server-side validation of all writes
- comment creation, retrieval, moderation, and abuse controls
- contact message intake and admin review flows
- structured content metadata CRUD
- media metadata and upload coordination
- study-room configuration APIs
- operational audit logs where needed

### Backend Does Not Own

- Hexo page rendering itself
- portal theme layout logic
- purely local Study Room UI interactions such as client-only timers when they do not need persistence
- one-off presentation state that can stay in the browser

### Required Module Boundaries

At minimum, the backend should evolve around explicit domain modules such as:

- `auth`
- `admin`
- `site-settings`
- `portfolio`
- `gallery`
- `comments`
- `contact`
- `media`
- `study-room`

## Authentication Strategy

Firebase Auth is planned to be fully phased out.

### Target Model

Admin authentication should be first-party and self-hosted through the backend service.

Recommended baseline:

- email + password login for admin users
- secure session cookies with `HttpOnly`, `Secure`, and same-site protections
- role-based authorization in the backend
- optional TOTP-based 2FA for the owner account and any future privileged accounts
- CSRF protection on state-changing admin actions
- login rate limiting and audit logging

### Public User Strategy

The public site should not require accounts for browsing.

Recommended posture:

- anonymous browsing for public pages
- guest comments allowed only if moderation and abuse controls are in place
- Study Room should support unauthenticated local usage first, with optional account-linked persistence added later if needed

Important rule:

- never recreate the old pattern where any non-anonymous browser-authenticated user implicitly becomes an admin

## Blog Comment Strategy

The comment system should be self-hosted and tied to the backend service, not outsourced to a third-party hosted comment platform.

### Recommended Model

- comments stored in MySQL
- each comment linked to a stable blog post identifier such as slug
- Hexo pages render the article statically, then load comment data from the backend
- public submission endpoint for new comments
- protected admin moderation interface

### Abuse Control Baseline

- rate limiting
- honeypot field
- server-side validation and sanitization
- approval queue by default for anonymous or first-time commenters
- IP/user-agent logging only as needed for anti-abuse and in a privacy-conscious way

### Why This Fits the Project

- preserves self-hosting goals
- avoids China-mainland reliability issues from some third-party comment systems
- keeps ownership of the platform data inside the project

## Contact Form Strategy

Current owner decision (2026-07-28): keep Formspree because contact submissions
must be forwarded directly to email. This decision supersedes the earlier
self-hosted-message proposal below.

### Current Model

- Admin owns the HTTPS endpoint in `SiteProfile.contact.formspree_endpoint`
- the Hexo contact form posts directly to Formspree
- Formspree forwards submissions to the owner's configured email
- no duplicate `ContactMessage` model or backend intake route

If requirements later change to require message history or moderation, treat a
self-hosted inbox as a new migration project rather than maintaining both flows.

### Abuse Control Baseline

- rate limiting
- honeypot field
- server-side validation
- optional adaptive challenge later if abuse becomes significant and mainland accessibility remains acceptable

### Ownership Rule

Contact data should remain inside the project platform rather than being dependent on external form platforms.

## Future Extensibility Notes

The final architecture should stay modular enough to support later expansion without another full rewrite.

Planned or plausible future expansion areas:

- richer admin workflows and editorial states
- structured project case studies
- notes or microblog sections
- search service
- privacy-friendly analytics
- object storage for heavier media libraries
- study room account sync and cross-device persistence
- real-time collaborative room features
- feeds, sitemap enrichment, and syndication tools

Architectural rule for future expansion:

- new capabilities should be added as isolated modules or services around the stable portal/app/backend split, not by rebuilding a new monolith

## Migration Principle

This is the permanent guiding rule for future sessions:

- the legacy React SPA is not the end state
- only its content, assets, localization, and domain knowledge are migration inputs
- the rebuilt platform is a modular self-hosted system centered on Hexo, Study Room, and a real backend boundary
