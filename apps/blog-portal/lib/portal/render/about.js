const { array, text } = require('./data')
const { escapeHtml, paragraphs, tag } = require('./html')
const { uiText } = require('./ui')

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
      `${tag('div', { class: 'portal-section-heading' }, `${uiText('about.title', text(about.intro_title, 'About me'), { name: 'h1' })}${about.intro_summary ? tag('p', { class: 'portal-authored-content' }, escapeHtml(about.intro_summary)) : ''}`)}
      ${profile.intro?.long ? tag('div', { class: 'portal-card portal-copy-card portal-copy' }, paragraphs(profile.intro.long)) : ''}`,
    )}
    ${skills.length ? tag('section', { class: 'portal-section' }, `${uiText('about.skillsTitle', text(about.skills_title, 'Skills'), { name: 'h2' })}${tag('div', { class: 'portal-chip-grid' }, skills.map((skill) => tag('span', { class: 'portal-chip portal-authored-content' }, escapeHtml(skill))).join(''))}`) : ''}
    ${experience.length ? tag('section', { class: 'portal-section' }, `${uiText('about.experienceTitle', text(about.experience_title, 'Experience'), { name: 'h2' })}${tag('div', { class: 'portal-stack' }, experience.map((item) => tag('article', { class: 'portal-card' }, `${tag('h3', { class: 'portal-card__title portal-authored-content' }, escapeHtml(text(item.title, 'Role')))}${item.period ? tag('span', { class: 'portal-badge portal-authored-content' }, escapeHtml(item.period)) : ''}${item.description ? tag('p', { class: 'portal-card__copy portal-authored-content' }, escapeHtml(item.description)) : ''}`)).join(''))}`) : ''}`,
  )
}
