const { readdir, readFile, stat } = require('node:fs/promises')
const { existsSync } = require('node:fs')
const { join, relative, resolve } = require('node:path')

async function collectHtmlFiles(directory) {
  const files = []

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectHtmlFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath)
    }
  }

  return files
}

function extractAttributeValues(html, attribute) {
  const expression = new RegExp(`\\b${attribute}=(["'])(.*?)\\1`, 'gi')
  return Array.from(html.matchAll(expression), (match) => match[2])
}

function resolveInternalTarget(publicDir, rawValue) {
  if (
    !rawValue ||
    rawValue.startsWith('#') ||
    rawValue.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(rawValue)
  ) {
    return null
  }

  const pathOnly = rawValue.split('#', 1)[0].split('?', 1)[0]
  if (!pathOnly.startsWith('/') || pathOnly.startsWith('/api/') || pathOnly.startsWith('/waline/')) {
    return null
  }

  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathOnly)
  } catch {
    decodedPath = pathOnly
  }

  const target = resolve(publicDir, `.${decodedPath}`)
  return [target, join(target, 'index.html')]
}

function validateHtmlDocument({ html, file, publicDir }) {
  const errors = []
  const displayPath = relative(publicDir, file)

  if (html.includes('BUILD_VER')) {
    errors.push(`${displayPath}: contains unresolved BUILD_VER`)
  }
  if (html.includes('api.yourdomain.com')) {
    errors.push(`${displayPath}: contains placeholder API domain`)
  }
  if (/formspree\.io/i.test(html)) {
    errors.push(`${displayPath}: contains Formspree endpoint`)
  }

  const lang = html.match(/<html\b[^>]*\blang=(["'])(.*?)\1/i)?.[2] || ''
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(lang)) {
    errors.push(`${displayPath}: invalid primary language "${lang}"`)
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    errors.push(`${displayPath}: missing document title`)
  }
  if (!/<link\b[^>]*\brel=(["'])canonical\1/i.test(html)) {
    errors.push(`${displayPath}: missing canonical link`)
  }

  const seenIds = new Set()
  for (const id of extractAttributeValues(html, 'id')) {
    if (seenIds.has(id)) errors.push(`${displayPath}: duplicate id "${id}"`)
    seenIds.add(id)
  }

  for (const attribute of ['href', 'src']) {
    for (const value of extractAttributeValues(html, attribute)) {
      const candidates = resolveInternalTarget(publicDir, value)
      if (candidates && !candidates.some(existsSync)) {
        errors.push(`${displayPath}: unresolved ${attribute} "${value}"`)
      }
    }
  }

  return errors
}

async function validateGeneratedSite(publicDir) {
  const resolvedPublicDir = resolve(publicDir)
  const directoryStats = await stat(resolvedPublicDir)
  if (!directoryStats.isDirectory()) throw new Error(`${resolvedPublicDir} is not a directory`)

  const htmlFiles = await collectHtmlFiles(resolvedPublicDir)
  const errors = []

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8')
    errors.push(...validateHtmlDocument({ html, file, publicDir: resolvedPublicDir }))
  }

  return { htmlFiles: htmlFiles.length, errors }
}

async function main() {
  const publicDir = process.argv[2] || 'public'
  const result = await validateGeneratedSite(publicDir)

  if (result.errors.length) {
    for (const error of result.errors) console.error(error)
    console.error(`Validation failed: ${result.errors.length} error(s) across ${result.htmlFiles} HTML files`)
    process.exitCode = 1
    return
  }

  console.log(`Validated ${result.htmlFiles} HTML files`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = {
  validateGeneratedSite,
}
