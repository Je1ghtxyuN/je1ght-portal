const { array, CONFIG, text } = require('./data')
const { escapeHtml, tag } = require('./html')
const { projectCard, recentPosts } = require('./components')
const { uiText } = require('./ui')

module.exports = function renderHome(context, { siteLocals } = {}) {
  const { navigation, portfolio, profile } = context.data(siteLocals)
  const cards = array(portfolio.cards)
  const home = profile.home || {}
  const shortcuts = array(navigation.home_shortcuts?.items).filter(
    (item) => item.path !== '/portfolio/' || cards.length,
  )
  const heroData = {
    display_name: text(profile.owner?.display_name, context.hexo.config.author),
    full_name: text(profile.owner?.full_name),
    avatar_path: text(profile.avatar_path, '/shared-assets/images/profile.jpg'),
    intro_short: text(profile.intro?.short),
    intro_long: text(profile.intro?.long),
    hero_phrases: array(profile.hero_phrases).length
      ? profile.hero_phrases
      : ['Code, Anime, Games, and Coffee.', 'VR, HCI, and game dev.'],
    hero_backgrounds: array(profile.hero_backgrounds),
    hero_rotation_interval:
      typeof profile.hero_rotation_interval === 'number' ? profile.hero_rotation_interval : 300,
  }
  const heroJson = JSON.stringify(heroData).replaceAll('<', '\\u003c')
  const shortcutSection = shortcuts.length
    ? tag(
        'section',
        { class: 'portal-section portal-shortcuts' },
        `${tag('div', { class: 'portal-section-heading' }, uiText('home.shortcutsTitle', text(navigation.home_shortcuts?.title, text(home.shortcuts_title, 'Explore')), { name: 'h2' }))}
        ${tag(
          'div',
          { class: 'portal-card-grid portal-card-grid--shortcuts' },
          shortcuts
            .map((item) =>
              tag(
                'a',
                {
                  class: 'portal-card portal-shortcut-card',
                  href: context.href(item.path),
                  rel: context.external(item.path) ? 'noopener noreferrer' : null,
                  target: context.external(item.path) ? '_blank' : null,
                },
                `${item.icon ? tag('i', { class: item.icon }, '') : ''}${tag('h3', { class: 'portal-card__title' }, escapeHtml(text(item.label, 'Open')))}`,
              ),
            )
            .join(''),
        )}`,
      )
    : ''
  const portfolioSection = cards.length
    ? tag(
        'section',
        { class: 'portal-section portal-portfolio-preview' },
        `${tag('div', { class: 'portal-section-heading' }, uiText('home.portfolioPreviewTitle', text(portfolio.section?.home_preview_title, 'Selected projects'), { name: 'h2' }))}
        ${tag('div', { class: 'portal-card-grid portal-card-grid--projects' }, cards.slice(0, CONFIG.PORTFOLIO_PREVIEW_LIMIT).map((card) => projectCard(context, card)).join(''))}`,
      )
    : ''

  return `<script id="portal-hero-data" type="application/json">${heroJson}</script>${tag(
    'div',
    { class: 'portal-page portal-home' },
    `${shortcutSection}${recentPosts(context, siteLocals, home)}${portfolioSection}`,
  )}`
}
