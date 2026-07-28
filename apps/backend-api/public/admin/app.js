const API = ''

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// --- State ---
let currentTab = 'posts'

// --- Views ---
function showView(name) {
  document.querySelectorAll('.view').forEach((v) => (v.style.display = 'none'))
  document.getElementById(`${name}-view`).style.display = ''
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.className = `toast toast-${type}`
  toast.style.display = ''
  setTimeout(() => (toast.style.display = 'none'), 3000)
}

// --- Auth ---
async function checkSession() {
  try {
    await api('/auth/session')
    showView('dashboard')
    loadTab('posts')
  } catch {
    showView('login')
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  try {
    await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    document.getElementById('login-error').textContent = ''
    showView('dashboard')
    loadTab('posts')
  } catch (err) {
    document.getElementById('login-error').textContent = err.message
  }
})

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' })
  showView('login')
})

// --- Tabs ---
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach((tc) => tc.classList.remove('active'))
    tab.classList.add('active')
    const tabName = tab.dataset.tab
    document.getElementById(`tab-${tabName}`).classList.add('active')
    currentTab = tabName
    loadTab(tabName)
  })
})

async function loadTab(name) {
  if (name === 'posts') await loadPosts()
  else if (name === 'portfolio') await loadPortfolio()
  else if (name === 'profile') await loadProfile()
}

// --- Blog Posts ---
async function loadPosts() {
  const { posts } = await api('/blog/admin/posts')
  const list = document.getElementById('posts-list')
  list.innerHTML = posts.length
    ? posts
        .map(
          (p) => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${esc(p.title)}</div>
        <div class="list-item-meta">
          ${p.slug} &middot; ${new Date(p.updatedAt).toLocaleDateString()}
          &middot; <span class="badge ${p.published ? 'badge-published' : 'badge-draft'}">${p.published ? 'Published' : 'Draft'}</span>
        </div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-ghost btn-sm" onclick="editPost('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePost('${p.id}', '${esc(p.title)}')">Delete</button>
      </div>
    </div>`
        )
        .join('')
    : '<p style="color:#8b949e">No posts yet. Create your first post.</p>'
}

window.editPost = async function (id) {
  const { post } = await api(`/blog/admin/posts/${id}`)
  document.getElementById('post-id').value = post.id
  document.getElementById('post-title').value = post.title
  document.getElementById('post-slug').value = post.slug
  document.getElementById('post-description').value = post.description || ''
  document.getElementById('post-categories').value = Array.isArray(post.categories) ? post.categories.join(', ') : ''
  document.getElementById('post-tags').value = Array.isArray(post.tags) ? post.tags.join(', ') : ''
  document.getElementById('post-cover').value = post.coverImage || ''
  document.getElementById('post-content').value = post.content || ''
  document.getElementById('post-published').checked = post.published
  document.getElementById('post-editor-title').textContent = 'Edit Post'
  document.getElementById('post-editor-modal').style.display = ''
}

window.deletePost = async function (id, title) {
  if (!confirm(`Delete "${title}"?`)) return
  await api(`/blog/admin/posts/${id}`, { method: 'DELETE' })
  showToast('Post deleted')
  loadPosts()
}

document.getElementById('new-post-btn').addEventListener('click', () => {
  document.getElementById('post-id').value = ''
  document.getElementById('post-form').reset()
  document.getElementById('post-editor-title').textContent = 'New Post'
  document.getElementById('post-editor-modal').style.display = ''
})

document.getElementById('post-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const id = document.getElementById('post-id').value
  const body = {
    title: document.getElementById('post-title').value,
    slug: document.getElementById('post-slug').value || undefined,
    description: document.getElementById('post-description').value,
    content: document.getElementById('post-content').value,
    categories: splitComma(document.getElementById('post-categories').value),
    tags: splitComma(document.getElementById('post-tags').value),
    coverImage: document.getElementById('post-cover').value || null,
    published: document.getElementById('post-published').checked,
  }

  if (id) {
    await api(`/blog/admin/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    showToast('Post updated')
  } else {
    await api('/blog/admin/posts', { method: 'POST', body: JSON.stringify(body) })
    showToast('Post created')
  }

  document.getElementById('post-editor-modal').style.display = 'none'
  loadPosts()
})

// --- Portfolio ---
async function loadPortfolio() {
  const { items } = await api('/portfolio/admin/items')
  const list = document.getElementById('portfolio-list')
  list.innerHTML = items.length
    ? items
        .map(
          (p) => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${esc(p.title)}</div>
        <div class="list-item-meta">${p.slug} &middot; ${p.year || 'N/A'} &middot; ${esc(p.status || '')}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-ghost btn-sm" onclick="editPortfolio('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deletePortfolio('${p.id}', '${esc(p.title)}')">Delete</button>
      </div>
    </div>`
        )
        .join('')
    : '<p style="color:#8b949e">No portfolio items yet.</p>'
}

window.editPortfolio = async function (id) {
  const { items } = await api('/portfolio/admin/items')
  const item = items.find((i) => i.id === id)
  if (!item) return
  document.getElementById('portfolio-id').value = item.id
  document.getElementById('portfolio-title').value = item.title
  document.getElementById('portfolio-slug').value = item.slug
  document.getElementById('portfolio-year').value = item.year || ''
  document.getElementById('portfolio-status').value = item.status || ''
  document.getElementById('portfolio-summary').value = item.summary
  document.getElementById('portfolio-cover').value = item.coverImage || ''
  document.getElementById('portfolio-tech').value = Array.isArray(item.techStack) ? item.techStack.join(', ') : ''
  document.getElementById('portfolio-tags').value = Array.isArray(item.tags) ? item.tags.join(', ') : ''
  document.getElementById('portfolio-links').value = JSON.stringify(item.links || {})
  document.getElementById('portfolio-sort').value = item.sortOrder ?? 0
  document.getElementById('portfolio-editor-title').textContent = 'Edit Portfolio Item'
  document.getElementById('portfolio-editor-modal').style.display = ''
}

window.deletePortfolio = async function (id, title) {
  if (!confirm(`Delete "${title}"?`)) return
  await api(`/portfolio/admin/items/${id}`, { method: 'DELETE' })
  showToast('Item deleted')
  loadPortfolio()
}

document.getElementById('new-portfolio-btn').addEventListener('click', () => {
  document.getElementById('portfolio-id').value = ''
  document.getElementById('portfolio-form').reset()
  document.getElementById('portfolio-editor-title').textContent = 'New Portfolio Item'
  document.getElementById('portfolio-editor-modal').style.display = ''
})

document.getElementById('portfolio-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const id = document.getElementById('portfolio-id').value
  let links = {}
  try {
    links = JSON.parse(document.getElementById('portfolio-links').value || '{}')
  } catch {
    showToast('Invalid JSON in links field', 'error')
    return
  }

  const body = {
    title: document.getElementById('portfolio-title').value,
    slug: document.getElementById('portfolio-slug').value || undefined,
    year: document.getElementById('portfolio-year').value || null,
    status: document.getElementById('portfolio-status').value || null,
    summary: document.getElementById('portfolio-summary').value,
    coverImage: document.getElementById('portfolio-cover').value || null,
    techStack: splitComma(document.getElementById('portfolio-tech').value),
    tags: splitComma(document.getElementById('portfolio-tags').value),
    links,
    sortOrder: Number(document.getElementById('portfolio-sort').value) || 0,
  }

  if (id) {
    await api(`/portfolio/admin/items/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    showToast('Item updated')
  } else {
    await api('/portfolio/admin/items', { method: 'POST', body: JSON.stringify(body) })
    showToast('Item created')
  }

  document.getElementById('portfolio-editor-modal').style.display = 'none'
  loadPortfolio()
})

// --- Site Profile ---

function getVal(obj, path, def = '') {
  return path.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : '', obj) || def
}

function setVal(id, value) {
  const el = document.getElementById(id)
  if (!el) return
  if (el.type === 'checkbox') el.checked = value
  else if (el.tagName === 'IMG') el.src = value
  else el.value = value ?? ''
}

function readVal(id) {
  const el = document.getElementById(id)
  if (!el) return ''
  if (el.type === 'checkbox') return el.checked
  return el.value.trim()
}

// --- Array Fields ---
function renderArrayFields(containerId, items, template) {
  const container = document.getElementById(containerId)
  container.innerHTML = items.map((item, i) => template(item, i)).join('')
}

function collectArrayFields(containerId, fieldConfigs) {
  const container = document.getElementById(containerId)
  const items = container.querySelectorAll('.array-item')
  const result = []
  items.forEach((item) => {
    const obj = {}
    fieldConfigs.forEach(({ key, selector }) => {
      const el = item.querySelector(selector)
      if (el) obj[key] = el.value.trim()
    })
    if (Object.values(obj).some((v) => v)) result.push(obj)
  })
  return result
}

function socialLinkTemplate(link, i) {
  return `
    <div class="array-item">
      <input type="text" value="${esc(link.label || '')}" placeholder="Label" class="sl-label">
      <input type="text" value="${esc(link.url || '')}" placeholder="URL" class="sl-url">
      <input type="text" value="${esc(link.icon || '')}" placeholder="Icon class" class="sl-icon">
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.array-item').remove()">&times;</button>
    </div>`
}

function skillTemplate(skill, i) {
  return `
    <div class="array-item">
      <input type="text" value="${esc(skill || '')}" placeholder="Skill" class="sk-value">
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.array-item').remove()">&times;</button>
    </div>`
}

function expTemplate(exp, i) {
  return `
    <div class="exp-item array-item">
      <div class="exp-header">
        <strong>Experience #${i + 1}</strong>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.exp-item').remove()">&times;</button>
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label>Title</label>
          <input type="text" value="${esc(exp.title || '')}" class="exp-title">
        </div>
        <div class="form-group">
          <label>Period</label>
          <input type="text" value="${esc(exp.period || '')}" class="exp-period">
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea rows="2" class="exp-desc">${esc(exp.description || '')}</textarea>
      </div>
    </div>`
}

async function loadProfile() {
  const { profile } = await api('/site-profile')
  const p = profile || {}

  // Owner
  setVal('pf-display-name', getVal(p, 'owner.display_name'))
  setVal('pf-full-name', getVal(p, 'owner.full_name'))

  // Brand
  setVal('pf-subtitle', getVal(p, 'subtitle'))
  setVal('pf-hero-phrases', (p.hero_phrases || []).join('\n'))
  setVal('pf-started-date', getVal(p, 'site_started_date'))
  setVal('pf-started-year', getVal(p, 'site_started_year'))

  // Preview images — use known fixed paths (assets API manages the files)
  document.getElementById('pf-avatar-preview').src = getVal(p, 'avatar_path') || '/shared-assets/images/profile.jpg'
  document.getElementById('pf-icon-preview').src = getVal(p, 'icon_path') || '/shared-assets/images/icon.png'

  // Load backgrounds grid from assets API
  loadBgGrid()

  // Intro
  setVal('pf-intro-short', getVal(p, 'intro.short'))
  setVal('pf-intro-long', getVal(p, 'intro.long'))

  // Social links
  renderArrayFields('pf-social-links', p.social_links || [], socialLinkTemplate)

  // Contact
  setVal('pf-contact-email', getVal(p, 'contact.email'))
  setVal('pf-contact-location', getVal(p, 'contact.location'))
  setVal('pf-contact-note', getVal(p, 'contact.availability_note'))

  // About
  setVal('pf-about-title', getVal(p, 'about.intro_title', 'About Me'))
  setVal('pf-about-summary', getVal(p, 'about.intro_summary'))
  setVal('pf-about-skills-title', getVal(p, 'about.skills_title', 'Skills'))
  renderArrayFields('pf-skills', p.about?.skills || [], skillTemplate)
  setVal('pf-about-exp-title', getVal(p, 'about.experience_title', 'Experience'))
  renderArrayFields('pf-experience', p.about?.experience || [], expTemplate)

  // Homepage
  setVal('pf-home-shortcuts', getVal(p, 'home.shortcuts_title'))
  setVal('pf-home-posts', getVal(p, 'home.recent_posts_title'))
  setVal('pf-home-portfolio', getVal(p, 'home.portfolio_preview_title'))
  setVal('pf-home-footer', getVal(p, 'home.footer_title'))
  setVal('pf-home-empty', getVal(p, 'home.recent_posts_empty_text'))

  // Footer
  setVal('pf-footer-note', getVal(p, 'footer_note'))
}

async function saveProfile() {
  const p = {
    owner: {
      display_name: readVal('pf-display-name'),
      full_name: readVal('pf-full-name'),
    },
    subtitle: readVal('pf-subtitle'),
    avatar_path: '/shared-assets/images/profile.jpg',
    icon_path: '/shared-assets/images/icon.png',
    hero_background_path: '/shared-assets/images/background.jpg',
    hero_phrases: readVal('pf-hero-phrases').split('\n').map((s) => s.trim()).filter(Boolean),
    site_started_date: readVal('pf-started-date'),
    site_started_year: parseInt(readVal('pf-started-year')) || new Date().getFullYear(),
    intro: {
      short: readVal('pf-intro-short'),
      long: readVal('pf-intro-long'),
    },
    social_links: collectArrayFields('pf-social-links', [
      { key: 'label', selector: '.sl-label' },
      { key: 'url', selector: '.sl-url' },
      { key: 'icon', selector: '.sl-icon' },
    ]),
    contact: {
      email: readVal('pf-contact-email'),
      location: readVal('pf-contact-location'),
      availability_note: readVal('pf-contact-note'),
    },
    about: {
      intro_title: readVal('pf-about-title'),
      intro_summary: readVal('pf-about-summary'),
      skills_title: readVal('pf-about-skills-title'),
      skills: collectArrayFields('pf-skills', [{ key: 'value', selector: '.sk-value' }]).map((s) => s.value).filter(Boolean),
      experience_title: readVal('pf-about-exp-title'),
      experience: collectArrayFields('pf-experience', [
        { key: 'title', selector: '.exp-title' },
        { key: 'period', selector: '.exp-period' },
        { key: 'description', selector: '.exp-desc' },
      ]),
    },
    home: {
      shortcuts_title: readVal('pf-home-shortcuts'),
      recent_posts_title: readVal('pf-home-posts'),
      portfolio_preview_title: readVal('pf-home-portfolio'),
      footer_title: readVal('pf-home-footer'),
      recent_posts_empty_text: readVal('pf-home-empty'),
    },
    footer_note: readVal('pf-footer-note'),
  }

  try {
    await api('/site-profile', { method: 'PUT', body: JSON.stringify({ data: p }) })
    showToast('Profile saved')
  } catch (err) {
    showToast('Save failed: ' + err.message, 'error')
    if (err.message.includes('Authentication required')) {
      showView('login')
    }
  }
}

document.getElementById('save-profile-btn').addEventListener('click', saveProfile)

// Add buttons for array fields
document.getElementById('pf-add-social').addEventListener('click', () => {
  const div = document.createElement('div')
  div.innerHTML = socialLinkTemplate({}, 0)
  document.getElementById('pf-social-links').appendChild(div.firstElementChild)
})
document.getElementById('pf-add-skill').addEventListener('click', () => {
  const div = document.createElement('div')
  div.innerHTML = skillTemplate('', 0)
  document.getElementById('pf-skills').appendChild(div.firstElementChild)
})
document.getElementById('pf-add-experience').addEventListener('click', () => {
  const div = document.createElement('div')
  div.innerHTML = expTemplate({}, 0)
  document.getElementById('pf-experience').appendChild(div.firstElementChild)
})
// --- Profile Asset Uploads ---
function uploadProfileAsset(type) {
  const inputId = type === 'background' ? 'pf-bg-input' : `pf-${type}-input`
  const btnId = type === 'background' ? 'pf-bg-upload' : `pf-${type}-upload`
  const input = document.getElementById(inputId)
  const btn = document.getElementById(btnId)
  const files = input.files
  if (!files || files.length === 0) return

  btn.disabled = true
  const origText = btn.textContent
  btn.textContent = 'Uploading...'

  const uploadFile = async (file) => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    const res = await fetch('/assets/admin/assets/upload', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
  }

  Promise.all(Array.from(files).map(uploadFile))
    .then((results) => {
      showToast(`${files.length} file(s) uploaded`)
      // Update preview
      if (type === 'avatar') {
        document.getElementById('pf-avatar-preview').src = '/shared-assets/images/profile.jpg?' + Date.now()
      } else if (type === 'icon') {
        document.getElementById('pf-icon-preview').src = '/shared-assets/images/icon.png?' + Date.now()
      } else if (type === 'background') {
        loadBgGrid()
      }
    })
    .catch(err => showToast('Upload failed: ' + err.message, 'error'))
    .finally(() => {
      input.value = ''
      btn.disabled = false
      btn.textContent = origText
    })
}

async function loadBgGrid() {
  try {
    const { backgrounds, defaultBackground } = await api('/assets/admin/assets')
    const grid = document.getElementById('pf-bg-grid')
    if (!grid) return

    grid.innerHTML = backgrounds.length
      ? backgrounds.map(bg => `
        <div class="asset-bg-card">
          <img src="/shared-assets/images/backgrounds/${esc(bg)}" alt="${esc(bg)}">
          <div class="asset-bg-card__name">${esc(bg)}${bg === defaultBackground ? ' (default)' : ''}</div>
          <div class="asset-bg-card__actions">
            <button class="btn btn-ghost btn-sm pf-set-default-bg" data-filename="${esc(bg)}">Set Default</button>
            <button class="btn btn-danger btn-sm pf-delete-bg" data-filename="${esc(bg)}">Delete</button>
          </div>
        </div>`).join('')
      : '<p style="color:#8b949e">No background images uploaded yet.</p>'

    grid.querySelectorAll('.pf-set-default-bg').forEach(btn => {
      btn.addEventListener('click', () => setDefaultBg(btn.dataset.filename))
    })
    grid.querySelectorAll('.pf-delete-bg').forEach(btn => {
      btn.addEventListener('click', () => deleteBg(btn.dataset.filename))
    })
  } catch (err) {
    // Silently handle - backgrounds are secondary
    console.warn('Failed to load backgrounds:', err.message)
  }
}

async function setDefaultBg(filename) {
  try {
    await api('/assets/admin/assets/set-default', {
      method: 'POST',
      body: JSON.stringify({ filename }),
    })
    showToast('Default background updated')
    loadBgGrid()
  } catch (err) {
    showToast('Failed: ' + err.message, 'error')
  }
}

async function deleteBg(filename) {
  if (!confirm(`Delete "${filename}"?`)) return
  try {
    await api(`/assets/admin/assets/${filename}`, { method: 'DELETE' })
    showToast('Background deleted')
    loadBgGrid()
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error')
  }
}

document.getElementById('pf-avatar-upload').addEventListener('click', () => uploadProfileAsset('avatar'))
document.getElementById('pf-icon-upload').addEventListener('click', () => uploadProfileAsset('icon'))
document.getElementById('pf-bg-upload').addEventListener('click', () => uploadProfileAsset('background'))

// --- Rebuild ---
document.getElementById('rebuild-btn').addEventListener('click', async () => {
  const btn = document.getElementById('rebuild-btn')
  btn.disabled = true
  btn.textContent = 'Rebuilding...'
  try {
    // Pre-flight session check — if session expired, redirect to login
    try { await api('/auth/session') } catch {
      showToast('Session expired. Please log in first.', 'error')
      btn.disabled = false
      btn.textContent = 'Rebuild Portal'
      showView('login')
      return
    }

    const result = await api('/admin/rebuild', { method: 'POST' })
    showToast(result.message)
  } catch (err) {
    showToast('Rebuild failed: ' + err.message, 'error')
    if (err.message.includes('Authentication required')) {
      showView('login')
    }
  } finally {
    btn.disabled = false
    btn.textContent = 'Rebuild Portal'
  }
})

// --- Modal close ---
document.querySelectorAll('.modal-close').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').style.display = 'none'
  })
})
document.querySelectorAll('.modal').forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none'
  })
})

// --- Helpers ---
function esc(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function splitComma(str) {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// --- Import .md ---
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw.trim() }

  const yaml = match[1]
  const body = match[2].trim()
  const meta = {}
  let currentKey = null
  let currentArray = null

  for (const line of yaml.split('\n')) {
    const arrayItem = line.match(/^\s+-\s+(.+)$/)
    if (arrayItem && currentKey) {
      if (!currentArray) currentArray = []
      currentArray.push(arrayItem[1].trim().replace(/^["']|["']$/g, ''))
      meta[currentKey] = currentArray
      continue
    }
    currentArray = null

    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      let val = kv[2].trim().replace(/^["']|["']$/g, '')
      if (val === '' || val === 'null') {
        meta[currentKey] = null
      } else {
        meta[currentKey] = val
      }
    }
  }

  return { meta, body }
}

function importMdToForm(text, filename) {
  const { meta, body } = parseFrontmatter(text)
  const titleEl = document.getElementById('post-title')
  const contentEl = document.getElementById('post-content')
  if (!titleEl || !contentEl) return

  if (meta.title) document.getElementById('post-title').value = meta.title
  if (meta.slug) document.getElementById('post-slug').value = meta.slug
  if (meta.description) document.getElementById('post-description').value = meta.description
  if (meta.categories) {
    const cats = Array.isArray(meta.categories) ? meta.categories : [meta.categories]
    document.getElementById('post-categories').value = cats.join(', ')
  }
  if (meta.tags) {
    const tags = Array.isArray(meta.tags) ? meta.tags : [meta.tags]
    document.getElementById('post-tags').value = tags.join(', ')
  }
  if (meta.coverImage || meta.cover) document.getElementById('post-cover').value = meta.coverImage || meta.cover
  contentEl.value = body

  showToast(`Imported from ${filename}`)
}

function handleMdFile(file) {
  if (!file || (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt'))) {
    showToast('Please drop a .md file', 'error')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => importMdToForm(e.target.result, file.name)
  reader.readAsText(file)
}

// File input change
document.getElementById('import-md-input').addEventListener('change', (e) => {
  if (e.target.files[0]) handleMdFile(e.target.files[0])
  e.target.value = ''
})

// Drag and drop on post editor modal
const postModal = document.getElementById('post-editor-modal')
let dragCounter = 0

postModal.addEventListener('dragenter', (e) => {
  e.preventDefault()
  dragCounter++
  document.getElementById('drop-zone-overlay').classList.add('active')
})

postModal.addEventListener('dragleave', (e) => {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    document.getElementById('drop-zone-overlay').classList.remove('active')
  }
})

postModal.addEventListener('dragover', (e) => {
  e.preventDefault()
})

postModal.addEventListener('drop', (e) => {
  e.preventDefault()
  dragCounter = 0
  document.getElementById('drop-zone-overlay').classList.remove('active')
  const file = e.dataTransfer.files[0]
  if (file) handleMdFile(file)
})

// --- Init ---
checkSession()
