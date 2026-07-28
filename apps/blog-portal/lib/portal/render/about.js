const { array, text } = require('./data')
const { escapeHtml, paragraphs, tag } = require('./html')

module.exports = function renderAbout(context, { siteLocals } = {}) {
  const { profile } = context.data(siteLocals)
  const about = profile.about || {}
  const skills = array(about.skills)
  const experience = array(about.experience)

  return tag(
    'div',
    { class: 'portal-page portal-about' },
    `${tag(
      'section',
      { class: 'portal-section portal-about-intro' },
      `${tag('div', { class: 'portal-section-heading' }, `${tag('p', { class: 'portal-eyebrow' }, 'Profile')}${tag('h1', {}, escapeHtml(text(about.intro_title, 'About Me')))}${about.intro_summary ? tag('p', {}, escapeHtml(about.intro_summary)) : ''}`)}
      ${profile.intro?.long ? tag('div', { class: 'portal-card portal-copy-card portal-copy' }, paragraphs(profile.intro.long)) : ''}`,
    )}
    ${skills.length ? tag('section', { class: 'portal-section' }, `${tag('h2', {}, escapeHtml(text(about.skills_title, 'Skills')))}${tag('div', { class: 'portal-chip-grid' }, skills.map((skill) => tag('span', { class: 'portal-chip' }, escapeHtml(skill))).join(''))}`) : ''}
    ${experience.length ? tag('section', { class: 'portal-section' }, `${tag('h2', {}, escapeHtml(text(about.experience_title, 'Experience')))}${tag('div', { class: 'portal-stack' }, experience.map((item) => tag('article', { class: 'portal-card' }, `${tag('h3', { class: 'portal-card__title' }, escapeHtml(text(item.title, 'Role')))}${item.period ? tag('span', { class: 'portal-badge' }, escapeHtml(item.period)) : ''}${item.description ? tag('p', { class: 'portal-card__copy' }, escapeHtml(item.description)) : ''}`)).join(''))}`) : ''}`,
  )
}
