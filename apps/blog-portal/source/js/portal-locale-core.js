(function portalLocaleCore() {
  'use strict'

  var configNode = document.getElementById('portal-i18n-config')
  if (!configNode) return

  var config = {}
  try {
    config = JSON.parse(configNode.textContent || '{}')
  } catch (_error) {
    return
  }

  var defaultLocale = config.defaultLocale || 'en'
  var localeBasePath = config.localeBasePath || '/shared-assets/locales/portal-ui'
  var storageKey = config.storageKey || 'site-locale'
  var supportedLocales = Array.isArray(config.supportedLocales)
    ? config.supportedLocales
    : []
  var cache = new Map()
  var listeners = new Set()
  var activeLocale = defaultLocale
  var activeBundle = {}
  var fallbackBundle = {}
  var applyChain = Promise.resolve()

  function nested(target, keyPath) {
    return String(keyPath || '')
      .split('.')
      .reduce(function (value, key) {
        return value && value[key] !== undefined ? value[key] : undefined
      }, target)
  }

  function format(value, params) {
    if (typeof value !== 'string') return ''
    return value.replace(/\{(\w+)\}/g, function (_match, key) {
      return params && params[key] !== undefined ? params[key] : ''
    })
  }

  function t(key, fallback, params) {
    var value = nested(activeBundle, key)
    if (value === undefined) value = nested(fallbackBundle, key)
    if (value === undefined) value = fallback || ''
    return format(value, params)
  }

  function normalize(locale) {
    var codes = supportedLocales.map(function (item) { return item.code })
    if (codes.includes(locale)) return locale
    var lowered = String(locale || '').toLowerCase()
    if (lowered.startsWith('ja')) return 'ja'
    if (lowered === 'zh-tw' || lowered === 'zh-hk') return 'zh-TW'
    if (lowered.startsWith('zh')) return 'zh-CN'
    return defaultLocale
  }

  function readStoredLocale() {
    try {
      return window.localStorage.getItem(storageKey)
    } catch (_error) {
      return null
    }
  }

  function writeStoredLocale(locale) {
    try {
      window.localStorage.setItem(storageKey, locale)
    } catch (_error) {
      // Locale switching remains available for this page when storage is blocked.
    }
  }

  function loadBundle(locale) {
    if (cache.has(locale)) return Promise.resolve(cache.get(locale))
    return window.fetch(
      `${localeBasePath}/${encodeURIComponent(locale)}.json`,
      { credentials: 'same-origin' },
    )
      .then(function (response) {
        if (!response.ok) throw new Error(`Unable to load UI locale: ${locale}`)
        return response.json()
      })
      .then(function (bundle) {
        cache.set(locale, bundle)
        return bundle
      })
  }

  function translateDocument() {
    document.querySelectorAll('[data-ui-key]').forEach(function (element) {
      element.textContent = t(
        element.getAttribute('data-ui-key'),
        element.textContent || '',
      )
    })
    document.querySelectorAll('[data-ui-placeholder]').forEach(function (element) {
      element.setAttribute(
        'placeholder',
        t(
          element.getAttribute('data-ui-placeholder'),
          element.getAttribute('placeholder') || '',
        ),
      )
    })
    document.querySelectorAll('[data-ui-value]').forEach(function (element) {
      element.setAttribute(
        'value',
        t(
          element.getAttribute('data-ui-value'),
          element.getAttribute('value') || '',
        ),
      )
    })
    document.querySelectorAll('[data-ui-aria-label]').forEach(function (element) {
      element.setAttribute(
        'aria-label',
        t(
          element.getAttribute('data-ui-aria-label'),
          element.getAttribute('aria-label') || '',
        ),
      )
    })
  }

  function notify() {
    var detail = { locale: activeLocale, t: t }
    listeners.forEach(function (listener) { listener(detail) })
    document.dispatchEvent(
      new CustomEvent('portal:locale-change', {
        detail: { locale: activeLocale },
      }),
    )
  }

  function applyLocale(locale) {
    var normalized = normalize(locale)
    return Promise.all([loadBundle(defaultLocale), loadBundle(normalized)])
      .then(function (bundles) {
        fallbackBundle = bundles[0]
        activeBundle = bundles[1]
        activeLocale = normalized
        writeStoredLocale(normalized)
        document.documentElement.lang = normalized
        translateDocument()
        notify()
        return normalized
      })
      .catch(function () {
        if (normalized !== defaultLocale) return applyLocale(defaultLocale)
        return defaultLocale
      })
  }

  function apply(locale) {
    applyChain = applyChain.then(function () { return applyLocale(locale) })
    return applyChain
  }

  window.PortalLocale = Object.freeze({
    apply: apply,
    getLocale: function () { return activeLocale },
    t: t,
    subscribe: function (listener) {
      listeners.add(listener)
      return function unsubscribe() { listeners.delete(listener) }
    },
  })

  document.addEventListener('pjax:complete', function () {
    translateDocument()
    notify()
  })

  void apply(readStoredLocale() || defaultLocale)
})()
