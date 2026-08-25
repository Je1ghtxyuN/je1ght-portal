(function portalMusicPlayer() {
  'use strict'

  var dependencies = {
    css: 'https://gcore.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css',
    player: 'https://gcore.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js',
    meting: 'https://gcore.jsdelivr.net/npm/butterfly-extsrc@1.1.6/metingjs/dist/Meting.min.js',
  }
  var loading
  var state = 'initial'

  var musicBtn = document.createElement('button')
  musicBtn.id = 'portal-music-btn'
  musicBtn.type = 'button'
  musicBtn.setAttribute('aria-controls', 'portal-music-panel')
  musicBtn.setAttribute('aria-expanded', 'false')
  musicBtn.innerHTML = '<i class="fas fa-music" aria-hidden="true"></i>'

  var panel = document.createElement('div')
  panel.id = 'portal-music-panel'
  panel.className = 'portal-music-panel--hidden'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'false')

  var status = document.createElement('p')
  status.className = 'portal-music-status'
  panel.appendChild(status)

  function translate(key, fallback) {
    return window.PortalLocale
      ? window.PortalLocale.t(key, fallback)
      : fallback
  }

  function renderCopy() {
    var openLabel = translate('music.open', 'Open player')
    musicBtn.title = openLabel
    musicBtn.setAttribute('aria-label', openLabel)
    panel.setAttribute('aria-label', translate('music.title', 'Music'))
    if (!status.isConnected) return
    if (state === 'initial') {
      status.textContent = translate('music.initial', 'Open to load music')
    } else if (state === 'loading') {
      status.textContent = translate('music.loading', 'Loading…')
    } else if (state === 'error') {
      status.textContent = translate('music.unavailable', 'Music unavailable')
    }
  }

  function loadStylesheet(url) {
    if (document.querySelector('link[data-portal-music]')) return
    var link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    link.dataset.portalMusic = 'true'
    document.head.appendChild(link)
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script')
      script.src = url
      script.async = true
      script.dataset.portalMusic = 'true'
      script.onload = resolve
      script.onerror = function () { reject(new Error('music-load-failed')) }
      document.head.appendChild(script)
    })
  }

  function ensurePlayer() {
    if (loading) return loading
    state = 'loading'
    renderCopy()
    loadStylesheet(dependencies.css)
    loading = loadScript(dependencies.player)
      .then(function () { return loadScript(dependencies.meting) })
      .then(function () {
        state = 'ready'
        panel.innerHTML = ''
        var player = document.createElement('div')
        player.className = 'aplayer no-destroy'
        Object.assign(player.dataset, {
          autoplay: 'false',
          id: '17688647005',
          loop: 'all',
          order: 'random',
          preload: 'none',
          server: 'netease',
          theme: '#3b6f68',
          type: 'playlist',
          volume: '0.7',
        })
        panel.appendChild(player)
        if (typeof window.loadMeting === 'function') window.loadMeting()
      })
      .catch(function () {
        state = 'error'
        renderCopy()
        loading = null
      })
    return loading
  }

  function isOpen() {
    return !panel.classList.contains('portal-music-panel--hidden')
  }

  function setOpen(open) {
    panel.classList.toggle('portal-music-panel--hidden', !open)
    musicBtn.classList.toggle('portal-music-btn--active', open)
    musicBtn.setAttribute('aria-expanded', String(open))
    musicBtn.title = translate(
      open ? 'music.close' : 'music.open',
      open ? 'Close player' : 'Open player',
    )
    musicBtn.setAttribute('aria-label', musicBtn.title)
  }

  musicBtn.addEventListener('click', function (event) {
    event.preventDefault()
    event.stopPropagation()
    if (isOpen()) {
      setOpen(false)
      return
    }
    setOpen(true)
    void ensurePlayer()
  })

  document.addEventListener('click', function (event) {
    if (isOpen() && !panel.contains(event.target) && !musicBtn.contains(event.target)) {
      setOpen(false)
    }
  })

  function mount() {
    if (document.getElementById('portal-music-btn')) return
    var toolbar = window.PortalButterflyAdapter
      ? window.PortalButterflyAdapter.resolveToolbar()
      : document.querySelector('[data-portal-toolbar]')
    if (!toolbar) return
    toolbar.appendChild(musicBtn)
    document.body.appendChild(panel)
    renderCopy()
  }

  window.PortalMusicPlayer = Object.freeze({ mount: mount })

  if (window.PortalLocale) {
    window.PortalLocale.subscribe(function () {
      renderCopy()
      setOpen(isOpen())
    })
  }
  document.addEventListener('pjax:complete', mount)
  mount()
})()
