function flattenLocale(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const keyPath = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenLocale(child, keyPath, output)
    } else {
      output[keyPath] = child
    }
  }
  return output
}

function compareLocaleCatalogs(catalogs) {
  const entries = Object.entries(catalogs)
  if (!entries.length) return ['no locale catalogs']

  const reference = Object.keys(flattenLocale(entries[0][1])).sort()
  const errors = []

  for (const [code, catalog] of entries.slice(1)) {
    const keys = Object.keys(flattenLocale(catalog)).sort()
    const missing = reference.filter((key) => !keys.includes(key))
    const extra = keys.filter((key) => !reference.includes(key))
    if (missing.length) errors.push(`${code} missing: ${missing.join(', ')}`)
    if (extra.length) errors.push(`${code} extra: ${extra.join(', ')}`)
  }

  for (const [code, catalog] of entries) {
    for (const [key, value] of Object.entries(flattenLocale(catalog))) {
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${code} empty: ${key}`)
      }
    }
  }

  return errors
}

module.exports = { compareLocaleCatalogs, flattenLocale }
