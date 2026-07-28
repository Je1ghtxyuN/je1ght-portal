const { text } = require('./data')
const { escapeHtml, tag, voidTag } = require('./html')

module.exports = function renderContact(context, { siteLocals } = {}) {
  const { profile } = context.data(siteLocals)
  const contact = profile.contact || {}
  const endpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+$/.test(
    String(contact.formspree_endpoint || '').trim(),
  )
    ? String(contact.formspree_endpoint).trim()
    : ''
  const field = (label, name, type = 'text', required = true) =>
    tag(
      'label',
      { class: 'portal-contact-field' },
      `${tag('span', {}, escapeHtml(label))}${voidTag('input', { name, required, type })}`,
    )

  const form = endpoint
    ? tag(
        'form',
        { action: endpoint, class: 'portal-card portal-contact-form', method: 'post' },
        `${voidTag('input', { name: '_subject', type: 'hidden', value: 'New message from je1ght.top' })}${field('Name', 'name')}${field('Email', 'email', 'email')}${field('Topic', 'topic')}${tag('label', { class: 'portal-contact-field' }, `${tag('span', {}, 'Message')}<textarea name="message" rows="7" required></textarea>`)}${tag('button', { class: 'portal-button portal-contact-submit', type: 'submit' }, escapeHtml(text(contact.submit_label, 'Send Message')))}`,
      )
    : tag(
        'div',
        { class: 'portal-card portal-contact-unavailable' },
        `${tag('h2', {}, 'Contact form unavailable')}${tag('p', {}, contact.email ? `Please email ${tag('a', { href: `mailto:${contact.email}` }, escapeHtml(contact.email))}.` : 'Please check back later.')}`,
      )

  return tag(
    'div',
    { class: 'portal-page portal-contact' },
    `${tag('section', { class: 'portal-section portal-contact-intro' }, `${tag('div', { class: 'portal-section-heading' }, `${tag('p', { class: 'portal-eyebrow' }, 'Say hello')}${tag('h1', {}, 'Contact')}`)}${tag('div', { class: 'portal-card portal-contact-info' }, `${contact.email ? tag('p', {}, `<strong>Email:</strong> ${escapeHtml(contact.email)}`) : ''}${contact.location ? tag('p', {}, `<strong>Location:</strong> ${escapeHtml(contact.location)}`) : ''}${contact.availability_note ? tag('p', {}, escapeHtml(contact.availability_note)) : ''}`)}`)}
    ${tag('section', { class: 'portal-section' }, form)}`,
  )
}
