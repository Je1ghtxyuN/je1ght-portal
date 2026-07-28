const { array, text } = require('./data')
const { escapeHtml, tag } = require('./html')
const { projectCard } = require('./components')

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
      `${tag('div', { class: 'portal-section-heading' }, `${tag('p', { class: 'portal-eyebrow' }, 'Work')}${tag('h1', {}, escapeHtml(text(section.title, 'Portfolio')))}${section.intro ? tag('p', {}, escapeHtml(section.intro)) : ''}`)}
      ${cards.length ? tag('div', { class: 'portal-card-grid portal-card-grid--projects' }, cards.map((card) => projectCard(context, card)).join('')) : tag('div', { class: 'portal-empty-state portal-portfolio-unavailable' }, tag('p', {}, 'Projects are being documented. Please check back later.'))}`,
    ),
  )
}
