const { text } = require('./data')
const { escapeHtml, tag, voidTag } = require('./html')
const { uiAttrs, uiText } = require('./ui')

module.exports = function renderContact(context, { siteLocals } = {}) {
  const { profile } = context.data(siteLocals)
  const contact = profile.contact || {}
  const endpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9_-]+$/.test(
    String(contact.formspree_endpoint || '').trim(),
  )
    ? String(contact.formspree_endpoint).trim()
    : ''
  const field = (key, label, name, type = 'text', required = true) =>
    tag(
      'label',
      { class: 'portal-contact-field' },
      `${uiText(key, label)}${voidTag('input', {
        ...uiAttrs(`${key}Placeholder`, 'placeholder'),
        name,
        required,
        type,
      })}`,
    )

  const form = endpoint
    ? tag(
        'form',
        { action: endpoint, class: 'portal-card portal-contact-form', method: 'post' },
        `${voidTag('input', { name: '_subject', type: 'hidden', value: 'New message from je1ght.top' })}${field('contact.name', 'Name', 'name')}${field('contact.email', 'Email', 'email', 'email')}${field('contact.topic', 'Topic', 'topic')}${tag('label', { class: 'portal-contact-field' }, `${uiText('contact.message', 'Message')}${tag('textarea', { ...uiAttrs('contact.messagePlaceholder', 'placeholder'), name: 'message', required: true, rows: 7 }, '')}`)}${uiText('contact.submit', text(contact.submit_label, 'Send message'), { name: 'button', attrs: { class: 'portal-button portal-contact-submit', type: 'submit' } })}`,
      )
    : tag(
        'div',
        { class: 'portal-card portal-contact-unavailable' },
        `${uiText('contact.unavailableTitle', 'Contact form unavailable', { name: 'h2' })}${contact.email ? uiText('contact.unavailableWithEmail', 'Please use the email address shown above', { name: 'p' }) : uiText('contact.unavailable', 'Please check back later', { name: 'p' })}`,
      )

  return tag(
    'div',
    { class: 'portal-page portal-contact' },
    `${tag('section', { class: 'portal-section portal-contact-intro' }, `${tag('div', { class: 'portal-section-heading' }, uiText('contact.title', 'Contact', { name: 'h1' }))}${tag('div', { class: 'portal-card portal-contact-info' }, `${contact.email ? tag('p', {}, `${uiText('contact.email', 'Email', { name: 'strong' })}: ${escapeHtml(contact.email)}`) : ''}${contact.location ? tag('p', {}, `${uiText('contact.location', 'Location', { name: 'strong' })}: ${escapeHtml(contact.location)}`) : ''}${contact.availability_note ? tag('p', { class: 'portal-authored-content' }, escapeHtml(contact.availability_note)) : ''}`)}`)}
    ${tag('section', { class: 'portal-section' }, form)}`,
  )
}
