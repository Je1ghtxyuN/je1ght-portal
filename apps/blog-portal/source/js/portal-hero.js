(function portalHero() {
  'use strict'

  var page = document.querySelector('.type-portal-home')
  var header = document.getElementById('page-header')
  if (!page || !header || header.dataset.portalHeroReady === 'true') return
  header.dataset.portalHeroReady = 'true'

  var data = {}
  var dataNode = document.getElementById('portal-hero-data')
  try {
    data = JSON.parse(dataNode ? dataNode.textContent || '{}' : '{}')
  } catch (_error) {
    data = {}
  }

  var displayName = data.display_name || 'Je1ghtxyuN'
  var motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var phrases = data.hero_phrases && data.hero_phrases.length
    ? data.hero_phrases
    : ['Code, Anime, Games, and Coffee.']

  var heroInfo = document.createElement('div')
  heroInfo.className = 'portal-hero-info'

  var avatar = document.createElement('img')
  avatar.className = 'portal-hero-info__avatar'
  avatar.src = data.avatar_path || '/shared-assets/images/profile.jpg'
  avatar.alt = displayName
  avatar.fetchPriority = 'high'
  avatar.onerror = function () { this.src = '/img/friend_404.gif' }

  var textGroup = document.createElement('div')
  textGroup.className = 'portal-hero-info__text'

  var name = document.createElement('h1')
  name.className = 'portal-hero-info__name'
  name.textContent = displayName

  var subtitle = document.createElement('div')
  subtitle.className = 'portal-hero-info__subtitle'
  subtitle.setAttribute('aria-live', 'off')

  var intro = document.createElement('p')
  intro.className = 'portal-hero-info__intro'
  intro.textContent = data.intro_short || ''

  textGroup.appendChild(name)
  textGroup.appendChild(subtitle)
  if (intro.textContent) textGroup.appendChild(intro)
  heroInfo.appendChild(avatar)
  heroInfo.appendChild(textGroup)
  header.appendChild(heroInfo)

  var scrollHint = document.createElement('button')
  scrollHint.className = 'portal-scroll-hint'
  scrollHint.type = 'button'
  scrollHint.innerHTML = '<span data-ui-key="home.scroll">Read the latest</span> <span aria-hidden="true">↓</span>'
  scrollHint.addEventListener('click', function () {
    var main = document.getElementById('content-inner')
    if (main) main.scrollIntoView({ behavior: motionAllowed ? 'smooth' : 'auto' })
  })
  header.appendChild(scrollHint)

  var siteName = document.querySelector('#blog-info .site-name')
  if (siteName) siteName.textContent = displayName
  var nav = header.querySelector('#nav')
  if (nav) nav.classList.add('portal-nav-transparent')

  if (!motionAllowed) {
    subtitle.textContent = phrases[0]
    return
  }

  var phraseIndex = 0
  var charIndex = 0
  var deleting = false
  function typePhrase() {
    var phrase = phrases[phraseIndex]
    charIndex += deleting ? -1 : 1
    subtitle.textContent = phrase.slice(0, charIndex)

    if (!deleting && charIndex === phrase.length) {
      deleting = true
      window.setTimeout(typePhrase, 1800)
      return
    }
    if (deleting && charIndex === 0) {
      deleting = false
      phraseIndex = (phraseIndex + 1) % phrases.length
    }
    window.setTimeout(typePhrase, deleting ? 28 : 52)
  }
  window.setTimeout(typePhrase, 450)

  var backgrounds = data.hero_backgrounds || []
  if (backgrounds.length > 1) {
    var backgroundIndex = 0
    window.setInterval(function () {
      backgroundIndex = (backgroundIndex + 1) % backgrounds.length
      header.style.backgroundImage = 'url("' + backgrounds[backgroundIndex] + '")'
    }, Math.max(30, data.hero_rotation_interval || 300) * 1000)
  }
})()
