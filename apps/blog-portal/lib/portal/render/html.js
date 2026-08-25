function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function attrs(values = {}) {
  return Object.entries(values)
    .filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '')
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ')
}

function tag(name, values = {}, content = '') {
  const rendered = attrs(values)
  return `<${name}${rendered ? ` ${rendered}` : ''}>${content}</${name}>`
}

function voidTag(name, values = {}) {
  const rendered = attrs(values)
  return `<${name}${rendered ? ` ${rendered}` : ''}>`
}

function paragraphs(value = '', className = '') {
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => tag('p', className ? { class: className } : {}, escapeHtml(line)))
    .join('')
}

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

module.exports = { attrs, escapeHtml, paragraphs, stripHtml, tag, voidTag }
