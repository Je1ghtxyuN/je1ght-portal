const { escapeHtml, tag } = require('./html')

function uiAttrs(key, kind = 'text') {
  const attribute = {
    text: 'data-ui-key',
    placeholder: 'data-ui-placeholder',
    value: 'data-ui-value',
    aria: 'data-ui-aria-label',
  }[kind]

  if (!attribute) throw new Error(`Unsupported UI attribute kind: ${kind}`)
  return { [attribute]: key }
}

function uiText(key, fallback, { name = 'span', attrs = {} } = {}) {
  return tag(name, { ...attrs, ...uiAttrs(key) }, escapeHtml(fallback))
}

module.exports = { uiAttrs, uiText }
