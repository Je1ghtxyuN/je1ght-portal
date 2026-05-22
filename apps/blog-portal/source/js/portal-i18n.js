(function portalI18nBootstrap() {
  const configNode = document.getElementById('portal-i18n-config')

  if (!configNode) return

  let config = {}

  try {
    config = JSON.parse(configNode.textContent || '{}')
  } catch {
    return
  }

  const defaultLocale = config.defaultLocale || 'en'
  const localeBasePath = config.localeBasePath || '/shared-assets/locales/site-ui'
  const storageKey = config.storageKey || 'site-locale'
  const supportedLocales = Array.isArray(config.supportedLocales)
    ? config.supportedLocales
    : []
  const navMap = config.navMap || {}
  const sidebarTextMap = config.sidebarTextMap || {}
  const localeCache = new Map()
  let activeLocale = defaultLocale
  let activeBundle = null
  let activeFallbackBundle = null
  let searchObserver = null

  function getNestedValue(target, keyPath) {
    if (!target || !keyPath) return undefined

    return String(keyPath)
      .split('.')
      .reduce(
        (value, key) =>
          value && value[key] !== undefined ? value[key] : undefined,
        target,
      )
  }

  function formatText(value, params) {
    if (typeof value !== 'string') return ''

    return value.replace(/\{(\w+)\}/g, (_, key) =>
      params && params[key] !== undefined ? params[key] : '',
    )
  }

  function normalizeLocale(locale) {
    const supportedCodes = supportedLocales.map((item) => item.code)

    if (supportedCodes.includes(locale)) return locale

    if (!locale) return defaultLocale

    const loweredLocale = String(locale).toLowerCase()

    if (loweredLocale.startsWith('ja')) return 'ja'
    if (loweredLocale === 'zh-tw' || loweredLocale === 'zh-hk') return 'zh-TW'
    if (loweredLocale.startsWith('zh')) return 'zh-CN'

    return defaultLocale
  }

  function readStoredLocale() {
    try {
      return window.localStorage.getItem(storageKey)
    } catch {
      return null
    }
  }

  function writeStoredLocale(locale) {
    try {
      window.localStorage.setItem(storageKey, locale)
    } catch {
      // Ignore persistence errors so locale switching still works for the session.
    }
  }

  function resolveInitialLocale() {
    return normalizeLocale(readStoredLocale() || defaultLocale)
  }

  async function loadLocaleBundle(locale) {
    if (localeCache.has(locale)) {
      return localeCache.get(locale)
    }

    try {
      const response = await fetch(
        `${localeBasePath}/${encodeURIComponent(locale)}.json`,
        {
          credentials: 'same-origin',
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to load locale bundle: ${locale}`)
      }

      const bundle = await response.json()
      localeCache.set(locale, bundle)
      return bundle
    } catch {
      const fallbackBundle = localeCache.get(defaultLocale) || {}
      localeCache.set(locale, fallbackBundle)
      return fallbackBundle
    }
  }

  function translate(bundle, fallbackBundle, key, fallback = '', params) {
    const value =
      getNestedValue(bundle, key) ??
      getNestedValue(fallbackBundle, key) ??
      fallback

    return formatText(value, params)
  }

  function setTextContent(target, value) {
    if (!target || typeof value !== 'string') return
    target.textContent = value
  }

  function applyDataTranslations(bundle, fallbackBundle) {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n')
      const fallback = element.getAttribute('data-i18n-fallback') || element.textContent || ''
      setTextContent(element, translate(bundle, fallbackBundle, key, fallback))
    })

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder')
      const fallback = element.getAttribute('placeholder') || ''
      element.setAttribute(
        'placeholder',
        translate(bundle, fallbackBundle, key, fallback),
      )
    })

    document.querySelectorAll('[data-i18n-value]').forEach((element) => {
      const key = element.getAttribute('data-i18n-value')
      const fallback = element.getAttribute('value') || ''
      element.setAttribute(
        'value',
        translate(bundle, fallbackBundle, key, fallback),
      )
    })

    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      const key = element.getAttribute('data-i18n-aria-label')
      const fallback = element.getAttribute('aria-label') || ''
      element.setAttribute(
        'aria-label',
        translate(bundle, fallbackBundle, key, fallback),
      )
    })
  }

  function applyNavigationTranslations(bundle, fallbackBundle) {
    Object.entries(navMap).forEach(([href, key]) => {
      // Only target nav menus (desktop + sidebar), not shortcut cards or other page content
      document
        .querySelectorAll(`#nav a[href="${href}"]:not(.nav-site-title), #sidebar-menus a[href="${href}"]:not(.nav-site-title)`)
        .forEach((anchor) => {
          const translated = translate(bundle, fallbackBundle, key, anchor.textContent || '')
          const icon = anchor.querySelector('i')
          if (icon) {
            // Preserve Font Awesome icon, only replace text
            anchor.textContent = ''
            anchor.appendChild(icon)
            anchor.appendChild(document.createTextNode(' ' + translated))
          } else {
            setTextContent(anchor, translated)
          }
        })
    })
  }

  function applySearchPlaceholder(bundle, fallbackBundle) {
    const placeholder = translate(
      bundle,
      fallbackBundle,
      'portal.searchPlaceholder',
      '',
    )

    if (!placeholder) return

    document
      .querySelectorAll(
        '#local-search input, .local-search-input input, .search-dialog-input, .local-search-box--input',
      )
      .forEach((input) => {
        input.setAttribute('placeholder', placeholder)
        input.setAttribute('data-i18n-placeholder', 'portal.searchPlaceholder')
      })
  }

  function applySidebarTranslations(bundle, fallbackBundle) {
    // Translate card title spans inside .item-headline (exclude toc-percentage)
    document.querySelectorAll('.item-headline > span:not(.toc-percentage)').forEach((el) => {
      const text = (el.textContent || '').trim()
      const key = sidebarTextMap[text]
      if (key) setTextContent(el, translate(bundle, fallbackBundle, key, text))
    })

    // Translate .headline spans inside .site-data (author card stats)
    document.querySelectorAll('.site-data .headline, .card-webinfo .headline').forEach((el) => {
      const text = (el.textContent || '').trim()
      const key = sidebarTextMap[text]
      if (key) setTextContent(el, translate(bundle, fallbackBundle, key, text))
    })

    // Translate card-info button text
    document.querySelectorAll('#card-info-btn > span').forEach((el) => {
      const text = (el.textContent || '').trim()
      const key = sidebarTextMap[text]
      if (key) setTextContent(el, translate(bundle, fallbackBundle, key, text))
    })

    // Translate search dialog title
    document.querySelectorAll('.search-dialog-title').forEach((el) => {
      const text = (el.textContent || '').trim()
      const key = sidebarTextMap[text]
      if (key) setTextContent(el, translate(bundle, fallbackBundle, key, text))
    })
  }

  function applyCurrentLocaleToDynamicUi() {
    if (!activeBundle || !activeFallbackBundle) return
    applySearchPlaceholder(activeBundle, activeFallbackBundle)
  }

  function ensureSearchObserver() {
    if (searchObserver || !window.MutationObserver) return

    searchObserver = new MutationObserver(() => {
      applyCurrentLocaleToDynamicUi()
    })

    searchObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  function ensureLocaleSwitcher() {
    let select = document.getElementById('portal-locale-select')

    if (select) return select

    const configHide = document.getElementById('rightside-config-hide')
    if (!configHide) return null

    // Globe button — same size as darkmode toggle
    const btn = document.createElement('button')
    btn.id = 'locale-switch-btn'
    btn.type = 'button'
    btn.title = 'Switch Language'
    btn.innerHTML = '<i class="fas fa-language"></i>'

    // Hidden select to hold state (used by applyLocale)
    select = document.createElement('select')
    select.id = 'portal-locale-select'
    select.style.display = 'none'

    supportedLocales.forEach((locale) => {
      const option = document.createElement('option')
      option.value = locale.code
      option.textContent = locale.label
      select.appendChild(option)
    })

    // Custom dropdown for language selection
    const dropdown = document.createElement('div')
    dropdown.id = 'locale-dropdown'
    dropdown.style.display = 'none'

    supportedLocales.forEach((locale) => {
      const item = document.createElement('button')
      item.className = 'locale-dropdown__item'
      item.type = 'button'
      item.textContent = locale.label
      item.addEventListener('click', () => {
        select.value = locale.code
        select.dispatchEvent(new Event('change', { bubbles: true }))
        dropdown.style.display = 'none'
      })
      dropdown.appendChild(item)
    })

    // Click globe → toggle dropdown
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      dropdown.style.display = dropdown.style.display === 'none' ? '' : 'none'
    })

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (dropdown.style.display !== 'none' && !dropdown.contains(e.target) && e.target !== btn) {
        dropdown.style.display = 'none'
      }
    })

    configHide.appendChild(btn)
    configHide.appendChild(select)
    document.body.appendChild(dropdown)

    document.querySelectorAll('.portal-locale-switcher').forEach(el => el.remove())

    return select
  }

  async function applyLocale(locale) {
    const normalizedLocale = normalizeLocale(locale)
    const [fallbackLocaleBundle, nextLocaleBundle] = await Promise.all([
      loadLocaleBundle(defaultLocale),
      loadLocaleBundle(normalizedLocale),
    ])

    activeLocale = normalizedLocale
    activeFallbackBundle = fallbackLocaleBundle
    activeBundle = nextLocaleBundle
    writeStoredLocale(normalizedLocale)
    document.documentElement.lang = normalizedLocale

    applyDataTranslations(nextLocaleBundle, fallbackLocaleBundle)
    applyNavigationTranslations(nextLocaleBundle, fallbackLocaleBundle)
    applySidebarTranslations(nextLocaleBundle, fallbackLocaleBundle)
    applySearchPlaceholder(nextLocaleBundle, fallbackLocaleBundle)

    const select = ensureLocaleSwitcher()
    if (select) select.value = normalizedLocale

    // Highlight active locale in dropdown
    const dropdown = document.getElementById('locale-dropdown')
    if (dropdown) {
      dropdown.querySelectorAll('.locale-dropdown__item').forEach((item) => {
        const isActive = item.textContent === supportedLocales.find(l => l.code === normalizedLocale)?.label
        item.classList.toggle('locale-dropdown__item--active', isActive)
      })
    }
  }

  const select = ensureLocaleSwitcher()

  if (select) {
    select.addEventListener('change', (event) => {
      void applyLocale(event.target.value)
    })
  }

  document.addEventListener('pjax:complete', () => {
    void applyLocale(activeLocale)
  })

  ensureSearchObserver()
  void applyLocale(resolveInitialLocale())
})();

(function siteRunningTime() {
  const el = document.getElementById('site-running-time')
  if (!el) return

  const started = el.getAttribute('data-site-started')
  if (!started) return

  const startDate = new Date(started)
  if (isNaN(startDate.getTime())) return

  function formatDuration(diff) {
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const years = Math.floor(days / 365)
    const remainingDays = days - years * 365

    const parts = []
    if (years > 0) parts.push(years + 'y')
    if (remainingDays > 0 || years > 0) parts.push(remainingDays + 'd')
    parts.push(String(hours % 24).padStart(2, '0') + 'h')
    parts.push(String(minutes % 60).padStart(2, '0') + 'm')
    parts.push(String(seconds % 60).padStart(2, '0') + 's')
    return parts.join(' ')
  }

  function update() {
    const now = new Date()
    const diff = now - startDate
    el.textContent = ' · Running for ' + formatDuration(diff)
  }

  update()
  setInterval(update, 1000)
})()
