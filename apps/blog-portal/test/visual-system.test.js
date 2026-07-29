const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const cssRoot = path.resolve(__dirname, '../source/css/portal')

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4,
    )
  return (
    0.2126 * channels[0] +
    0.7152 * channels[1] +
    0.0722 * channels[2]
  )
}

function contrastRatio(foreground, background) {
  const light = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  )
  const dark = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  )
  return (light + 0.05) / (dark + 0.05)
}

function readRootHexToken(css, token) {
  const root = css.match(/:root\s*\{(?<body>[\s\S]*?)\n\}/)?.groups.body
  return root?.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]
}

test('visual system is split into explicit layers with accessibility fallbacks', () => {
  const layers = ['tokens.css', 'base.css', 'hero.css', 'components.css', 'responsive.css']
  const combined = layers
    .map((file) => fs.readFileSync(path.join(cssRoot, file), 'utf8'))
    .join('\n')

  assert.match(combined, /--portal-space-1/)
  assert.match(combined, /--portal-surface/)
  assert.match(combined, /:focus-visible/)
  assert.match(combined, /prefers-reduced-motion:\s*reduce/)
  assert.match(combined, /64svh/)
})

test('hero uses a circular crop and CSS does not generate visible copy', () => {
  const hero = fs.readFileSync(path.join(cssRoot, 'hero.css'), 'utf8')

  assert.match(
    hero,
    /\.portal-hero-info__avatar[\s\S]*border-radius:\s*50%/,
  )
  assert.match(hero, /\.portal-hero-info__avatar[\s\S]*object-fit:\s*cover/)
  assert.match(hero, /\.portal-hero-info__avatar[\s\S]*aspect-ratio:\s*1/)
  assert.doesNotMatch(hero, /PERSONAL NOTES|SELECTED WORK/)
  assert.doesNotMatch(hero, /content:\s*['"][A-Za-z]/)
})

test('hero foreground remains legible in both site themes', () => {
  const hero = fs.readFileSync(path.join(cssRoot, 'hero.css'), 'utf8')

  assert.match(
    hero,
    /\.type-portal-home \.portal-hero-info__name\s*\{[^}]*color:\s*#fff/,
  )
})

test('portal components provide standalone light and dark typography tokens', () => {
  const tokens = fs.readFileSync(path.join(cssRoot, 'tokens.css'), 'utf8')

  assert.match(tokens, /:root[\s\S]*--portal-bg/)
  assert.match(tokens, /\[data-theme='dark'\][\s\S]*--portal-bg/)
  assert.match(tokens, /--portal-heading-font/)
  assert.match(tokens, /--portal-body-font/)
})

test('footer follows Portal light and dark theme tokens', () => {
  const tokens = fs.readFileSync(path.join(cssRoot, 'tokens.css'), 'utf8')
  const base = fs.readFileSync(path.join(cssRoot, 'base.css'), 'utf8')

  assert.match(tokens, /:root[\s\S]*--portal-footer-bg/)
  assert.match(tokens, /\[data-theme='dark'\][\s\S]*--portal-footer-bg/)
  assert.match(base, /#footer[\s\S]*background:\s*var\(--portal-footer-bg\)/)
  assert.match(base, /#footer[\s\S]*color:\s*var\(--portal-footer-text\)/)
  assert.match(base, /border-top:\s*1px solid var\(--portal-footer-border\)/)
  assert.match(base, /#footer a\s*\{[^}]*color:\s*inherit/)
  assert.doesNotMatch(base, /#footer\s*\{[^}]*background:\s*#[0-9a-f]{3,8}/i)

  const lightBackground = readRootHexToken(tokens, '--portal-footer-bg')
  const lightMuted = readRootHexToken(tokens, '--portal-footer-muted')
  assert.ok(lightBackground)
  assert.ok(lightMuted)
  assert.ok(contrastRatio(lightMuted, lightBackground) >= 4.5)
})
