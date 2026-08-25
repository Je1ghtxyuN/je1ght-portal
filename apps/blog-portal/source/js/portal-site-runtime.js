(function portalSiteRuntime() {
  'use strict'

  if (window.PortalSiteRuntime) {
    window.PortalSiteRuntime.refresh()
    return
  }

  function pad(value) {
    return String(value).padStart(2, '0')
  }

  function durationParts(milliseconds) {
    var totalSeconds = Math.floor(milliseconds / 1000)
    var totalMinutes = Math.floor(totalSeconds / 60)
    var totalHours = Math.floor(totalMinutes / 60)
    var totalDays = Math.floor(totalHours / 24)
    var years = Math.floor(totalDays / 365)

    return {
      years: years,
      days: totalDays - years * 365,
      hours: pad(totalHours % 24),
      minutes: pad(totalMinutes % 60),
      seconds: pad(totalSeconds % 60),
    }
  }

  function formatFallback(template, params) {
    return template.replace(/\{(\w+)\}/g, function (_match, key) {
      return params[key] === undefined ? '' : params[key]
    })
  }

  function refresh() {
    var output = document.getElementById('site-running-time')
    if (!output) return

    var started = output.getAttribute('data-site-started')
    var startTime = started ? new Date(started).getTime() : Number.NaN
    var elapsed = new Date().getTime() - startTime
    if (!Number.isFinite(startTime) || elapsed < 0) {
      output.textContent = ''
      return
    }

    var params = durationParts(elapsed)
    var fallback = 'Site online for {years}y {days}d {hours}h {minutes}m {seconds}s'
    output.textContent = window.PortalLocale
      ? window.PortalLocale.t('footer.runtime', fallback, params)
      : formatFallback(fallback, params)
  }

  window.PortalSiteRuntime = Object.freeze({ refresh: refresh })

  if (window.PortalLocale) {
    window.PortalLocale.subscribe(refresh)
  }
  document.addEventListener('pjax:complete', refresh)
  refresh()
  window.setInterval(refresh, 1000)
})()
