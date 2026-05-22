# Replace Blog Page with Categories Shortcut

## Summary

Remove the broken custom `/blog/` page and replace the first homepage shortcut button with a link to the built-in Categories page (`/categories/`).

## Motivation

- The custom Blog page (`source/blog/index.md` + `portal_blog` tag plugin) is broken — it shows 2 stale posts and does not update with new content
- Archives and Categories already serve the same purpose (chronological + topical post discovery), making a separate Blog page redundant
- The homepage shortcut button is better used pointing to Categories, which provides more navigational value to readers

## Design

### Files Changed

| Action | File | Change |
|--------|------|--------|
| Edit | `source/_data/navigation.yml` | Change first `home_shortcuts` item from Blog→`/blog/` to Categories→`/categories/` |
| Edit | `scripts/portal-renderer.js` | Add `/categories/` entry to the `shortcutKey` mapping |
| Delete | `source/blog/index.md` | Remove broken custom Blog page |

### navigation.yml change

```yaml
home_shortcuts:
  items:
    - label: Categories
      path: /categories/
      icon: fas fa-folder-open
    - label: Portfolio
      path: /portfolio/
      icon: fas fa-laptop-code
    - label: Contact
      path: /contact/
      icon: fas fa-envelope
```

### portal-renderer.js change

Add one line to the `shortcutKey` mapping (~line 371):

```javascript
item.path === '/categories/' ? 'categories' :
```

### Cleanup

- Delete `source/blog/index.md` (the broken custom page)
- The `renderBlog()` function in `portal-renderer.js` can be left in place — it's dead code but harmless, and removing it is a separate cleanup concern

## Non-Goals

- Not removing `renderBlog()` or `portal_blog` tag registration (unused but not causing bugs)
- Not changing the other two shortcut buttons

## Testing

1. Run `hexo generate` in `apps/blog-portal/`
2. Verify homepage shows "Categories" as first shortcut button, linking to `/categories/`
3. Verify `/blog/` returns 404 (page deleted)
4. Verify `/categories/` works and shows all posts grouped by category
