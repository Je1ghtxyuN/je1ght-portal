(function portalMusicPlayer() {
  'use strict'

  var showPanel = document.getElementById('rightside-config-show')
  if (!showPanel) return

  var dependencies = {
    css: 'https://gcore.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css',
    player: 'https://gcore.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js',
    meting: 'https://gcore.jsdelivr.net/npm/butterfly-extsrc@1.1.6/metingjs/dist/Meting.min.js',
  }
  var loading

  var musicBtn = document.createElement('button')
  musicBtn.id = 'portal-music-btn'
  musicBtn.type = 'button'
  musicBtn.title = 'Open music player'
  musicBtn.setAttribute('aria-controls', 'portal-music-panel')
  musicBtn.setAttribute('aria-expanded', 'false')
  musicBtn.innerHTML = '<i class="fas fa-music" aria-hidden="true"></i>'

  var panel = document.createElement('div')
  panel.id = 'portal-music-panel'
  panel.className = 'portal-music-panel--hidden'
  panel.innerHTML = '<p class="portal-music-status">Music loads after your first click.</p>'
  document.body.appendChild(panel)

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
      script.onerror = function () {
        reject(new Error('Music service is temporarily unavailable.'))
      }
      document.head.appendChild(script)
    })
  }

  function ensurePlayer() {
    if (loading) return loading
    panel.querySelector('.portal-music-status').textContent = 'Loading music…'
    loadStylesheet(dependencies.css)
    loading = loadScript(dependencies.player)
      .then(function () { return loadScript(dependencies.meting) })
      .then(function () {
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
      .catch(function (error) {
        panel.querySelector('.portal-music-status').textContent = error.message
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
  }

  musicBtn.addEventListener('click', function (event) {
    event.preventDefault()
    event.stopPropagation()
    if (isOpen()) {
      setOpen(false)
      return
    }
    setOpen(true)
    ensurePlayer()
  })

  document.addEventListener('click', function (event) {
    if (isOpen() && !panel.contains(event.target) && !musicBtn.contains(event.target)) {
      setOpen(false)
    }
  })

  var goUp = document.getElementById('go-up')
  if (goUp) showPanel.insertBefore(musicBtn, goUp)
  else showPanel.appendChild(musicBtn)
})()
