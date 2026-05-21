(function portalHero() {
  var page = document.querySelector('.type-portal-home')
  if (!page) return

  // Smooth gradient transition from hero bg to content area
  var style = document.createElement('style')
  style.textContent = [
    '.type-portal-home #page-header::after {',
    '  content:"";',
    '  position:absolute;',
    '  bottom:0; left:0; right:0;',
    '  height:120px;',
    '  background:linear-gradient(to bottom, transparent, #0d0d0d);',
    '  z-index:1;',
    '  pointer-events:none;',
    '}',
    '[data-theme="light"] .type-portal-home #page-header::after {',
    '  background:linear-gradient(to bottom, transparent, #ffffff);',
    '}'
  ].join('')
  document.head.appendChild(style)

  var header = document.getElementById('page-header')
  if (!header) return

  // Read profile data from embedded JSON
  var data = {}
  var dataNode = document.getElementById('portal-hero-data')
  if (dataNode) {
    try { data = JSON.parse(dataNode.textContent || '{}') } catch (e) {}
  }

  var displayName = data.display_name || 'Je1ghtxyuN'
  var avatarPath = data.avatar_path || '/shared-assets/images/profile.jpg'
  var introText = data.intro_short || ''

  // Hide Butterfly's default page title in the hero (we have our own hero info)
  var siteTitle = document.getElementById('site-title')
  if (siteTitle) siteTitle.style.display = 'none'

  // Replace "Home" with "Je1ghtxyuN" in the nav bar top-left (no translation)
  var siteName = document.querySelector('#blog-info .site-name')
  if (siteName) siteName.textContent = 'Je1ghtxyuN'

  // Create hero info container
  var heroInfo = document.createElement('div')
  heroInfo.className = 'portal-hero-info'

  // Avatar
  var avatar = document.createElement('img')
  avatar.className = 'portal-hero-info__avatar'
  avatar.src = avatarPath
  avatar.alt = displayName
  avatar.onerror = function () { this.src = '/img/friend_404.gif' }

  // Name + subtitle group
  var textGroup = document.createElement('div')
  textGroup.className = 'portal-hero-info__text'

  var name = document.createElement('div')
  name.className = 'portal-hero-info__name'
  name.textContent = displayName

  var subtitle = document.createElement('div')
  subtitle.className = 'portal-hero-info__subtitle'

  var cursor = document.createElement('span')
  cursor.className = 'typed-cursor'
  cursor.textContent = '|'

  var intro = document.createElement('p')
  intro.className = 'portal-hero-info__intro'
  intro.textContent = introText

  textGroup.appendChild(name)
  textGroup.appendChild(subtitle)
  if (introText) textGroup.appendChild(intro)

  heroInfo.appendChild(avatar)
  heroInfo.appendChild(textGroup)
  header.appendChild(heroInfo)

  // Scroll hint
  var scrollHint = document.createElement('div')
  scrollHint.className = 'portal-scroll-hint'
  scrollHint.textContent = '▼  scroll down'
  scrollHint.addEventListener('click', function () {
    var main = document.getElementById('content-inner')
    if (main) {
      main.scrollIntoView({ behavior: 'smooth' })
    }
  })
  header.appendChild(scrollHint)

  // Typewriter effect
  var phrases = (data.hero_phrases && data.hero_phrases.length > 0)
    ? data.hero_phrases
    : ['Code, Anime, Games, and Coffee.', 'VR, HCI, and game dev.', "Writing things down so I don't forget."]
  var phraseIndex = 0
  var charIndex = 0
  var isDeleting = false
  var typeSpeed = 60
  var deleteSpeed = 30
  var pauseBetween = 2000

  function type() {
    var currentPhrase = phrases[phraseIndex]

    if (isDeleting) {
      subtitle.textContent = currentPhrase.substring(0, charIndex - 1)
      charIndex--
    } else {
      subtitle.textContent = currentPhrase.substring(0, charIndex + 1)
      charIndex++
    }

    subtitle.appendChild(cursor)

    if (!isDeleting && charIndex === currentPhrase.length) {
      setTimeout(function () {
        isDeleting = true
        type()
      }, pauseBetween)
      return
    }

    if (isDeleting && charIndex === 0) {
      isDeleting = false
      phraseIndex = (phraseIndex + 1) % phrases.length
      setTimeout(type, 400)
      return
    }

    setTimeout(type, isDeleting ? deleteSpeed : typeSpeed)
  }

  setTimeout(type, 800)

  // Make header nav transparent
  var nav = header.querySelector('#nav')
  if (nav) {
    nav.classList.add('portal-nav-transparent')
  }

  // Background rotation
  var backgrounds = data.hero_backgrounds || []
  var rotationInterval = (data.hero_rotation_interval || 300) * 1000

  if (backgrounds.length > 1) {
    var bgIndex = 0
    setInterval(function () {
      bgIndex = (bgIndex + 1) % backgrounds.length
      if (header) {
        header.style.backgroundImage = 'url(' + backgrounds[bgIndex] + ')'
      }
    }, rotationInterval)
  }
})()
