const { text } = require('./data')
const { escapeHtml, tag, voidTag } = require('./html')

module.exports = function renderContact(context, { siteLocals } = {}) {
  const { profile } = context.data(siteLocals)
  const contact = profile.contact || {}
  const field = (label, name, type = 'text', required = true) =>
    tag(
      'label',
      { class: 'portal-contact-field' },
      `${tag('span', {}, escapeHtml(label))}${voidTag('input', { name, required, type })}`,
    )

  return tag(
    'div',
    { class: 'portal-page portal-contact' },
    `${tag('section', { class: 'portal-section portal-contact-intro' }, `${tag('div', { class: 'portal-section-heading' }, `${tag('p', { class: 'portal-eyebrow' }, 'Say hello')}${tag('h1', {}, 'Contact')}`)}${tag('div', { class: 'portal-card portal-contact-info' }, `${contact.email ? tag('p', {}, `<strong>Email:</strong> ${escapeHtml(contact.email)}`) : ''}${contact.location ? tag('p', {}, `<strong>Location:</strong> ${escapeHtml(contact.location)}`) : ''}${contact.availability_note ? tag('p', {}, escapeHtml(contact.availability_note)) : ''}`)}`)}
    ${tag(
      'section',
      { class: 'portal-section' },
      tag(
        'form',
        { action: '/api/contact', class: 'portal-card portal-contact-form', method: 'post' },
        `${field('Name', 'name')}${field('Email', 'email', 'email')}${field('Topic', 'topic')}${tag('label', { class: 'portal-contact-field' }, `${tag('span', {}, 'Message')}<textarea name="message" rows="7" required></textarea>`)}${voidTag('input', { 'aria-hidden': 'true', autocomplete: 'off', class: 'portal-contact-honeypot', name: 'company', tabindex: '-1', type: 'text' })}${tag('p', { 'aria-live': 'polite', class: 'portal-contact-status' }, '')}${tag('button', { class: 'portal-button portal-contact-submit', type: 'submit' }, escapeHtml(text(contact.submit_label, 'Send Message')))}`,
      ),
    )}`,
  )
}
