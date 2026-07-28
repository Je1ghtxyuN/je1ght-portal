# Blog Portal Setup Notes

The current portal contract is documented centrally:

- `../../docs/MAINTENANCE.md` — commands, ownership, optional integrations, and
  release checklist
- `../../docs/CONTENT_MAP.md` — content owners and rendering flow
- `../../docs/DEPLOYMENT_CONTRACT.md` — production routing and build contract
- `CONTENT_EDITING_GUIDE.md` — writing and editing posts

## Architecture at a glance

- Hexo behavior: `_config.yml`
- Butterfly behavior: `_config.butterfly.yml`
- projected CMS/navigation settings: `lib/portal/theme-projection.js`
- Hexo wiring only: `scripts/`
- page rendering: `lib/portal/render/`
- generated-output checks: `lib/portal/validate-output.js`
- visual layers: `source/css/portal/`
- optional browser behaviors: `source/js/portal-*.js`

Run `npm run check` before committing portal changes. It performs tests, a clean
Hexo build, and generated HTML/link validation.
