(function portalMusicPlayer() {
  var aplayerEl = document.querySelector('.aplayer.no-destroy')
  if (!aplayerEl) return

  var showPanel = document.getElementById('rightside-config-show')
  if (!showPanel) return

  // --- Create music button ---
  var musicBtn = document.createElement('button')
  musicBtn.id = 'portal-music-btn'
  musicBtn.type = 'button'
  musicBtn.title = 'Music Player'
  musicBtn.innerHTML = '<i class="fas fa-music"></i>'

  // --- Create floating panel ---
  // Use opacity + pointer-events (not display:none) so APlayer can measure
  // its container width at init time and won't enter arrow mode.
  var panel = document.createElement('div')
  panel.id = 'portal-music-panel'
  panel.classList.add('portal-music-panel--hidden')

  // Move APlayer into the panel
  aplayerEl.parentNode.insertBefore(panel, aplayerEl)
  panel.appendChild(aplayerEl)

  // --- Toggle logic ---
  function isOpen() {
    return !panel.classList.contains('portal-music-panel--hidden')
  }

  function openPanel() {
    panel.classList.remove('portal-music-panel--hidden')
    musicBtn.classList.add('portal-music-btn--active')
  }

  function closePanel() {
    panel.classList.add('portal-music-panel--hidden')
    musicBtn.classList.remove('portal-music-btn--active')
  }

  musicBtn.addEventListener('click', function (e) {
    e.preventDefault()
    e.stopPropagation()
    isOpen() ? closePanel() : openPanel()
  })

  // Close on outside click — but NOT on clicks inside the panel
  document.addEventListener('click', function (e) {
    if (!isOpen()) return
    if (panel.contains(e.target) || musicBtn.contains(e.target)) return
    closePanel()
  })

  // Insert button before the "go-up" button
  var goUp = document.getElementById('go-up')
  if (goUp) {
    showPanel.insertBefore(musicBtn, goUp)
  } else {
    showPanel.appendChild(musicBtn)
  }

  // --- Shrink panel when playlist is folded ---
  // APlayer adds .aplayer-narrow when the playlist is hidden via miniswitcher.
  // Without this the panel stays 330px wide with just a tiny album art + empty space.
  var narrowObserver = new MutationObserver(function () {
    var narrow = aplayerEl.classList.contains('aplayer-narrow')
    panel.classList.toggle('portal-music-panel--narrow', narrow)
  })
  narrowObserver.observe(aplayerEl, { attributes: true, attributeFilter: ['class'] })
})()
