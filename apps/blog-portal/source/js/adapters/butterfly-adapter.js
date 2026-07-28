(function butterflyAdapter() {
  'use strict'

  var configNode = document.getElementById('portal-i18n-config')
  var config = {}
  try {
    config = JSON.parse(configNode ? configNode.textContent || '{}' : '{}')
  } catch (_error) {
    config = {}
  }

  var supportedLocales = Array.isArray(config.supportedLocales)
    ? config.supportedLocales
    : []
  var navMap = config.navMap || {}
  var sidebarTextMap = config.sidebarTextMap || {}

  function createGenericToolbar() {
    var toolbar = document.querySelector('[data-portal-toolbar]')
    if (toolbar) return toolbar
    toolbar = document.createElement('div')
    toolbar.dataset.portalToolbar = 'true'
    toolbar.className = 'portal-generic-toolbar'
    document.body.appendChild(toolbar)
    return toolbar
  }

  function resolveToolbar() {
    return document.getElementById('rightside-config-show')
      || document.getElementById('rightside-config-hide')
      || createGenericToolbar()
  }

  function languageToolbar() {
    return document.getElementById('rightside-config-hide') || resolveToolbar()
  }

  function translateButterfly() {
    if (!window.PortalLocale) return
    var translate = window.PortalLocale.t

    Object.entries(navMap).forEach(function (entry) {
      var href = entry[0]
      var key = entry[1]
      document
        .querySelectorAll(
          `#nav a[href="${href}"]:not(.nav-site-title), #sidebar-menus a[href="${href}"]:not(.nav-site-title)`,
        )
        .forEach(function (anchor) {
          var label = translate(key, anchor.textContent.trim())
          var icon = anchor.querySelector('i')
          anchor.textContent = ''
          if (icon) anchor.appendChild(icon)
          anchor.appendChild(document.createTextNode(`${icon ? ' ' : ''}${label}`))
        })
    })

    document
      .querySelectorAll(
        '.item-headline > span:not(.toc-percentage), .site-data .headline, .card-webinfo .headline, #card-info-btn > span, .search-dialog-title',
      )
      .forEach(function (element) {
        var key = element.dataset.portalSidebarKey
        if (!key) {
          key = sidebarTextMap[(element.textContent || '').trim()]
          if (key) element.dataset.portalSidebarKey = key
        }
        if (key) element.textContent = translate(key, element.textContent || '')
      })

    document
      .querySelectorAll(
        '#local-search input, .local-search-input input, .search-dialog-input, .local-search-box--input',
      )
      .forEach(function (input) {
        input.setAttribute(
          'placeholder',
          translate('search.placeholder', input.getAttribute('placeholder') || 'Search'),
        )
      })
  }

  function mountLocaleControl() {
    if (!window.PortalLocale || document.getElementById('locale-switch-btn')) return
    var toolbar = languageToolbar()
    var button = document.createElement('button')
    var dropdown = document.createElement('div')

    button.id = 'locale-switch-btn'
    button.type = 'button'
    button.innerHTML = '<i class="fas fa-language" aria-hidden="true"></i>'
    button.setAttribute('aria-haspopup', 'menu')
    button.setAttribute('aria-expanded', 'false')

    dropdown.id = 'locale-dropdown'
    dropdown.hidden = true
    dropdown.setAttribute('role', 'menu')

    supportedLocales.forEach(function (locale) {
      var item = document.createElement('button')
      item.className = 'locale-dropdown__item'
      item.type = 'button'
      item.dataset.locale = locale.code
      item.textContent = locale.label
      item.setAttribute('role', 'menuitem')
      item.addEventListener('click', function () {
        dropdown.hidden = true
        button.setAttribute('aria-expanded', 'false')
        void window.PortalLocale.apply(locale.code)
      })
      dropdown.appendChild(item)
    })

    button.addEventListener('click', function (event) {
      event.preventDefault()
      event.stopPropagation()
      dropdown.hidden = !dropdown.hidden
      button.setAttribute('aria-expanded', String(!dropdown.hidden))
    })
    document.addEventListener('click', function (event) {
      if (!dropdown.hidden && !dropdown.contains(event.target) && event.target !== button) {
        dropdown.hidden = true
        button.setAttribute('aria-expanded', 'false')
      }
    })

    toolbar.appendChild(button)
    document.body.appendChild(dropdown)

    window.PortalLocale.subscribe(function () {
      var label = window.PortalLocale.t(
        'controls.language',
        'Choose interface language',
      )
      button.title = label
      button.setAttribute('aria-label', label)
      dropdown.querySelectorAll('[data-locale]').forEach(function (item) {
        item.classList.toggle(
          'locale-dropdown__item--active',
          item.dataset.locale === window.PortalLocale.getLocale(),
        )
      })
      translateButterfly()
    })
  }

  function mount() {
    mountLocaleControl()
    translateButterfly()
  }

  window.PortalButterflyAdapter = Object.freeze({
    mount: mount,
    resolveToolbar: resolveToolbar,
  })

  document.addEventListener('portal:locale-change', translateButterfly)
  document.addEventListener('pjax:complete', mount)
  mount()
})()
