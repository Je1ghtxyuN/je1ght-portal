const path = require('path')
const fs = require('fs')

function resolveSiteIdentity() {
  // Server: local copy in blog-portal root
  const localPath = path.join(__dirname, '..', 'site-identity.json')
  if (fs.existsSync(localPath)) return require(localPath)
  // Local dev: repo packages directory
  return require('../../../packages/shared-config/site-identity.json')
}

function resolveLocaleBundle(locale) {
  const localPath = path.join(__dirname, '..', 'source', 'shared-assets', 'locales', 'portal-ui', `${locale}.json`)
  if (fs.existsSync(localPath)) return require(localPath)
  // Local dev: repo packages directory
  return require(path.join(__dirname, `../../../packages/shared-assets/locales/portal-ui/${locale}.json`))
}

const siteIdentity = resolveSiteIdentity()

const defaultLocale = siteIdentity.i18n?.defaultLocale || 'en'
const supportedLocales = Array.isArray(siteIdentity.i18n?.supportedLocales)
  ? siteIdentity.i18n.supportedLocales
  : []
const localeBasePath =
  siteIdentity.i18n?.portalLocaleBasePath || '/shared-assets/locales/portal-ui'
const defaultLocaleBundle = resolveLocaleBundle(defaultLocale)

function getNestedValue(target, keyPath) {
  if (!target || !keyPath) return undefined

  return String(keyPath)
    .split('.')
    .reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), target)
}

function getDefaultLocaleText(keyPath, fallback = '') {
  const value = getNestedValue(defaultLocaleBundle, keyPath)
  return typeof value === 'string' ? value : fallback
}

module.exports = {
  siteIdentity,
  defaultLocale,
  supportedLocales,
  localeBasePath,
  defaultLocaleBundle,
  getNestedValue,
  getDefaultLocaleText,
}
