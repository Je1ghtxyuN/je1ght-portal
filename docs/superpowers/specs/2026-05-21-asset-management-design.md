# Brand Asset Management — Design Spec

Date: 2026-05-21
Status: approved

## Problem

Profile photo, site icon, and background images are hardcoded across 6 files (13 references). Changing any asset requires manual file replacement + config edits + redeploy. No multi-background support.

## Solution

Admin UI upload → server filesystem → Sharp auto-format → rsync back to local repo. Frontend JS rotates backgrounds every 5 minutes. Existing config paths remain unchanged (files keep the same names).

---

## Backend API (4 endpoints)

Base: `POST /api/admin/assets/upload`

| Field | Type | Description |
|-------|------|-------------|
| `file` | multipart | Image file |
| `type` | string | `avatar` / `icon` / `background` |

Sharp transforms per type:

| type | Output filename | Transform |
|------|----------------|-----------|
| `avatar` | `profile.jpg` | 400×400 center-crop, JPEG quality 85 |
| `icon` | `icon.png` | Keep original size, always PNG |
| `background` | `background.jpg` (single) or `backgrounds/bg-{timestamp}.jpg` (multi) | 1920px max width, JPEG quality 85 |

Other endpoints:

| Endpoint | Action |
|----------|--------|
| `GET /api/admin/assets` | List all assets with type, filename, size, uploadedAt |
| `DELETE /api/admin/assets/:filename` | Delete from backgrounds pool only (avatar/icon/current default are protected) |
| `POST /api/admin/assets/set-default` | { filename: "bg-001.jpg" } — copies to `background.jpg` for theme config compatibility |

Storage: `/portal-source/source/shared-assets/images/` on server (nginx serves directly, no DB blob storage).

---

## Admin UI

New page/tab in admin panel. Three sections:

1. **Avatar card** — single-file upload, live preview, replaces `profile.jpg`
2. **Icon card** — single-file upload, live preview, replaces `icon.png`
3. **Background card** — multi-file drag-and-drop, thumbnail grid with delete buttons, "Set as default" action

After any asset change, admin clicks "Rebuild Portal" to regenerate static HTML with new asset references (cover fallbacks, etc.). Or we auto-trigger rebuild on upload.

---

## Background Rotation (Frontend)

Modify `source/js/portal-hero.js`: when `hero_backgrounds` list is non-empty, add timed rotation:

```javascript
var backgrounds = data.hero_backgrounds || []
var rotationInterval = data.hero_rotation_interval || 300 // seconds

if (backgrounds.length > 1) {
  var idx = 0
  setInterval(function () {
    idx = (idx + 1) % backgrounds.length
    var header = document.getElementById('page-header')
    if (header) header.style.backgroundImage = 'url(' + backgrounds[idx] + ')'
  }, rotationInterval * 1000)
}
```

Background list is injected via `site_profile.yml` → `portal-renderer.js` → embedded JSON in page (existing `portal-hero-data` pattern).

Site profile updates: `hero_backgrounds` array and `hero_rotation_interval` field added to `site_profile.yml` schema. Portal renderer reads them and embeds in the page data.

Butterfly's existing `theme.background` array support (in `layout.pug` lines 15-37) also rotates backgrounds randomly on pjax navigation — our JS runs in addition, handling timed rotation without navigation.

---

## Sync (deploy.sh)

Add one line to Phase C (after existing `_data/` pull):

```bash
rsync -avz \
  "$SERVER:$SERVER_PORTAL/source/shared-assets/images/" \
  "$REPO_ROOT/packages/shared-assets/images/"
```

This ensures admin-uploaded assets survive local `hexo clean` and re-deploy cycles.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/backend-api/src/routes/admin/assets.ts` | **New** — upload/list/delete/set-default endpoints |
| `apps/backend-api/src/services/asset-processor.ts` | **New** — Sharp transform logic |
| `apps/backend-api/src/admin-ui/...` | **New** — Asset management page in admin UI |
| `apps/blog-portal/source/js/portal-hero.js` | Add background rotation timer (fix existing textContent bug) |
| `apps/blog-portal/source/_data/site_profile.yml` | Add `hero_backgrounds` + `hero_rotation_interval` fields |
| `apps/blog-portal/scripts/portal-renderer.js` | Embed background list in portal-hero-data JSON |
| `scripts/deploy.sh` | Add shared-assets/images server→local rsync |

## Files NOT Changed

- `_config.butterfly.yml` — paths stay the same (files keep fixed names)
- `_config.yml` — already fixed to `je1ght.top`
- 4× page `index.md` — top_img paths unchanged
- `rebuild.js` — cover_image fallback unchanged
- `packages/shared-config/site-identity.json` — no new shared config needed

---

## Dependencies

- `sharp` (npm) — image processing on server
- Admin UI already has upload-capable HTTP client (need to verify multipart support)

---

## Testing

1. Upload JPEG/PNG/WebP avatar → verify `profile.jpg` exists, 400×400, JPEG
2. Upload multiple backgrounds → verify rotation pool populated, `background.jpg` unchanged until set-default
3. Delete background from pool → verify file removed, default unaffected
4. Click "Rebuild Portal" → verify new assets appear on live site
5. Run `deploy.sh` → verify server assets pulled back to local `packages/shared-assets/images/`
6. Background rotation: load home page, wait 5 minutes, verify header image changes
