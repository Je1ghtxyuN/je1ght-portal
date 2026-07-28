const { array, text } = require('./data')
const { escapeHtml, tag } = require('./html')
const { projectCard } = require('./components')
const { uiText } = require('./ui')

module.exports = function renderPortfolio(context, { siteLocals } = {}) {
  const { portfolio } = context.data(siteLocals)
  const cards = array(portfolio.cards)
  const section = portfolio.section || {}
  return tag(
    'div',
    { class: 'portal-page portal-portfolio' },
    tag(
      'section',
      { class: 'portal-section' },
      `${tag('div', { class: 'portal-section-heading' }, `${uiText('portfolio.title', text(section.title, 'Portfolio'), { name: 'h1' })}${section.intro ? tag('p', { class: 'portal-authored-content' }, escapeHtml(section.intro)) : ''}`)}
      ${cards.length ? tag('div', { class: 'portal-card-grid portal-card-grid--projects' }, cards.map((card) => projectCard(context, card)).join('')) : tag('div', { class: 'portal-empty-state portal-portfolio-unavailable' }, uiText('portfolio.empty', 'No portfolio items configured', { name: 'p' }))}`,
    ),
  )
}
