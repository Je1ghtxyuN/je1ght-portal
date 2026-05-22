const { url_for: urlFor } = require('hexo-util')
const {
  getDefaultLocaleText,
} = require('./portal-shared-config')

module.exports = function createPortalRenderer(hexo) {
  const resolveInternalUrl = urlFor.bind(hexo)

  // Keep homepage behavior in code rather than data files so build output stays
  // deterministic across CMS edits and future content migrations.
  const PORTAL_CONFIG = Object.freeze({
    HOMEPAGE_POST_LIMIT: 3,
    PORTFOLIO_PREVIEW_LIMIT: 3,
    DEFAULT_TITLE: 'Untitled Entry',
    DEFAULT_DESCRIPTION: '',
    DEFAULT_IMAGE_PATH: '/shared-assets/images/background.jpg',
    DEFAULT_AVATAR_PATH: '/shared-assets/images/profile.jpg',
  })

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const stripHtml = (value = '') =>
    String(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const splitLines = (value = '') =>
    String(value)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

  const normalizeCollection = (collection) => {
    if (!collection) return []
    if (typeof collection.toArray === 'function') return collection.toArray()
    if (Array.isArray(collection.data)) return collection.data.slice()
    if (collection.data && typeof collection.data[Symbol.iterator] === 'function') {
      return Array.from(collection.data)
    }
    return Array.isArray(collection) ? collection.slice() : []
  }

  const isExternalPath = (path, explicitExternal = false) =>
    Boolean(
      explicitExternal ||
        /^(https?:)?\/\//.test(path || '') ||
        String(path || '').startsWith('mailto:')
    )

  const renderAttrs = (attrs = {}) =>
    Object.entries(attrs)
      .filter(([, value]) => value !== null && value !== undefined && value !== false && value !== '')
      .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
      .join(' ')

  const renderTag = (tag, attrs = {}, content = '') => {
    const attrText = renderAttrs(attrs)
    return attrText ? `<${tag} ${attrText}>${content}</${tag}>` : `<${tag}>${content}</${tag}>`
  }

  const renderVoidTag = (tag, attrs = {}) => {
    const attrText = renderAttrs(attrs)
    return attrText ? `<${tag} ${attrText}>` : `<${tag}>`
  }

  const renderParagraphs = (value = '', className = '') =>
    splitLines(value)
      .map((line) => renderTag('p', className ? { class: className } : {}, escapeHtml(line)))
      .join('')

  const formatDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateTime = (value) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }

  const fallbackText = (value, fallback) => {
    if (typeof value !== 'string') return fallback
    const trimmed = value.trim()
    return trimmed || fallback
  }

  const fallbackArray = (value) => (Array.isArray(value) ? value : [])

  const fallbackImagePath = (value) =>
    fallbackText(value, PORTAL_CONFIG.DEFAULT_IMAGE_PATH)

  const resolveHref = (path, explicitExternal = false) => {
    if (!path) return '#'
    return isExternalPath(path, explicitExternal) ? path : resolveInternalUrl(path)
  }

  const getLocaleText = (keyPath, fallback = '') =>
    getDefaultLocaleText(keyPath, fallback)

  const withI18nAttr = (attrs = {}, keyPath, fallback = '') => ({
    ...attrs,
    'data-i18n': keyPath,
    'data-i18n-fallback': fallback || getLocaleText(keyPath, ''),
  })

  const getLocalsData = (siteLocals) => siteLocals?.data || hexo.locals.get('data') || {}

  const getPortalData = (siteLocals) => {
    const data = getLocalsData(siteLocals)
    return {
      profile: data.site_profile || {},
      navigation: data.navigation || {},
      portfolio: data.portfolio || {},
    }
  }

  const getStablePostKey = (post = {}) =>
    fallbackText(post.path || post.slug || post.title || post._id, '')

  const getLatestPosts = (siteLocals, limit = PORTAL_CONFIG.HOMEPAGE_POST_LIMIT) => {
    const postsSource = siteLocals?.posts || hexo.locals.get('posts')

    // Hexo collections can arrive as Models or arrays depending on where rendering
    // happens. We normalize them first so the homepage always works with a plain list.
    //
    // Hexo also does not guarantee that source processing order matches publication
    // order, so we explicitly sort by date descending instead of relying on implicit
    // collection order. After sorting, we slice the list with the shared config
    // constant so recent-post output stays deterministic across repeated builds.
    return normalizeCollection(postsSource)
      .filter(Boolean)
      .slice()
      .sort((left, right) => {
        const byDate = new Date(right.date || 0) - new Date(left.date || 0)

        if (byDate !== 0) return byDate

        // When two posts share the same timestamp, fall back to a stable text key so
        // the homepage order stays deterministic across repeated builds.
        return getStablePostKey(left).localeCompare(getStablePostKey(right))
      })
      .slice(0, limit)
  }

  const getProjectLinks = (card = {}) => {
    const links = card.links || {}
    return [
      { label: 'Demo', url: links.demo },
      { label: 'Repository', url: links.repo },
      { label: 'Article', url: links.article },
    ]
      .filter((item) => item.url)
      .map((item) => ({
        ...item,
        external: isExternalPath(item.url),
        newTab: isExternalPath(item.url),
      }))
  }

  const renderSocialLinks = (links = []) => {
    if (!links.length) {
      return renderTag(
        'p',
        { class: 'portal-card__copy' },
        'No social links configured yet.'
      )
    }

    return renderTag(
      'div',
      { class: 'portal-social-list' },
      links
        .map((link) =>
          renderTag(
            'a',
            {
              class: 'portal-social-pill',
              href: resolveHref(link.url, true),
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            `${link.icon ? renderTag('i', { class: link.icon }, '') : ''}${renderTag(
              'span',
              {},
              escapeHtml(fallbackText(link.label, 'Link'))
            )}`
          )
        )
        .join('')
    )
  }

  const renderContactMeta = (contact = {}) => {
    const items = []
    const emailLabel = getLocaleText('brand.contactEmailLabel', 'Email')
    const locationLabel = getLocaleText('brand.contactLocationLabel', 'Location')

    if (contact.email) {
      items.push(
        renderTag(
          'li',
          {},
          `${renderTag(
            'strong',
            withI18nAttr({}, 'brand.contactEmailLabel', emailLabel),
            `${escapeHtml(emailLabel)}:`
          )} ${escapeHtml(contact.email)}`
        )
      )
    }

    if (contact.location) {
      items.push(
        renderTag(
          'li',
          {},
          `${renderTag(
            'strong',
            withI18nAttr({}, 'brand.contactLocationLabel', locationLabel),
            `${escapeHtml(locationLabel)}:`
          )} ${escapeHtml(contact.location)}`
        )
      )
    }

    if (contact.availability_note) {
      items.push(renderTag('li', {}, escapeHtml(contact.availability_note)))
    }

    return items.length
      ? renderTag('ul', { class: 'portal-meta-list' }, items.join(''))
      : renderTag(
          'p',
          { class: 'portal-card__copy' },
          'No contact metadata configured yet.'
        )
  }

  const renderProjectCard = (card = {}, linkLabel = 'View Project') => {
    const title = fallbackText(card.title, PORTAL_CONFIG.DEFAULT_TITLE)
    const year = card.year ? escapeHtml(card.year) : ''
    const status = fallbackText(card.status, PORTAL_CONFIG.DEFAULT_DESCRIPTION)
    const summary = fallbackText(card.summary, PORTAL_CONFIG.DEFAULT_DESCRIPTION)
    const coverImage = fallbackImagePath(card.cover_image)
    const links = getProjectLinks(card)
    const tags = fallbackArray(card.tags)

    const actions = links.length
      ? renderTag(
          'div',
          { class: 'portal-action-row' },
          links
            .map((link) =>
                renderTag(
                  'a',
                  {
                    class: 'portal-button',
                    href: resolveHref(link.url, link.external),
                    target: link.newTab ? '_blank' : null,
                    rel: link.newTab ? 'noopener noreferrer' : null,
                  },
                  escapeHtml(link.label || linkLabel)
                )
            )
            .join('')
        )
      : ''

    const tagMarkup = tags.length
      ? renderTag(
          'div',
          { class: 'portal-chip-grid portal-chip-grid--compact' },
          tags.map((tag) => renderTag('span', { class: 'portal-chip' }, escapeHtml(tag))).join('')
        )
      : ''

    return renderTag(
      'article',
      { class: 'portal-card portal-project-card' },
      `${renderTag(
        'div',
        { class: 'portal-project-card__cover' },
        `<img src="${escapeHtml(resolveInternalUrl(coverImage))}" alt="${escapeHtml(title)}">`
      )}${renderTag(
        'div',
        { class: 'portal-project-card__body' },
        `${renderTag(
          'div',
          { class: 'portal-inline-meta' },
          `${renderTag('h3', { class: 'portal-card__title' }, escapeHtml(title))}${
            year ? renderTag('span', { class: 'portal-badge' }, year) : ''
          }`
        )}${renderTag('p', { class: 'portal-card__meta' }, escapeHtml(status))}${renderTag(
          'p',
          { class: 'portal-card__copy' },
          escapeHtml(summary)
        )}${tagMarkup}${actions}`
      )}`
    )
  }

  const renderHero = (profile = {}) => {
    const ownerName = fallbackText(
      profile.owner?.display_name,
      fallbackText(hexo.config.author, hexo.config.title)
    )
    const subtitle = fallbackText(
      profile.subtitle,
      getLocaleText('brand.portalTagline', PORTAL_CONFIG.DEFAULT_DESCRIPTION)
    )
    const shortIntro = fallbackText(
      profile.intro?.short,
      PORTAL_CONFIG.DEFAULT_DESCRIPTION
    )
    const longIntro = fallbackText(profile.intro?.long, '')
    const avatarPath = fallbackText(
      profile.avatar_path,
      PORTAL_CONFIG.DEFAULT_AVATAR_PATH
    )

    return renderTag(
      'section',
      { class: 'portal-section portal-hero-card' },
      `${renderTag(
        'div',
        { class: 'portal-hero-card__media' },
        `<img class="portal-avatar" src="${escapeHtml(
          resolveInternalUrl(avatarPath)
        )}" alt="${escapeHtml(ownerName)}">`
      )}${renderTag(
        'div',
        { class: 'portal-hero-card__body' },
        `${renderTag('p', { class: 'portal-eyebrow' }, escapeHtml(hexo.config.title || ownerName))}${renderTag(
          'h1',
          { class: 'portal-title' },
          escapeHtml(ownerName)
        )}${renderTag(
          'p',
          withI18nAttr({ class: 'portal-subtitle' }, 'brand.portalTagline', subtitle),
          escapeHtml(subtitle)
        )}${renderTag(
          'p',
          { class: 'portal-lead' },
          escapeHtml(shortIntro)
        )}${
          longIntro
            ? renderTag('div', { class: 'portal-copy' }, renderParagraphs(longIntro))
            : ''
        }`
      )}`
    )
  }

  const renderShortcutSection = (navigation = {}, home = {}) => {
    const shortcuts = navigation.home_shortcuts || {}
    const shortcutItems = fallbackArray(shortcuts.items)

    if (!shortcutItems.length) return ''

    return renderTag(
      'section',
      { class: 'portal-section' },
      `${renderTag(
        'div',
        { class: 'portal-section-heading' },
        `${renderTag(
          'h2',
          withI18nAttr(
            {},
            'portal.home.shortcutsTitle',
            fallbackText(shortcuts.title, fallbackText(home.shortcuts_title, 'Quick Entry'))
          ),
          escapeHtml(
            fallbackText(
              shortcuts.title,
              fallbackText(
                home.shortcuts_title,
                getLocaleText('portal.home.shortcutsTitle', 'Quick Entry')
              )
            )
          )
        )}${
          shortcuts.description
            ? renderTag(
                'p',
                withI18nAttr(
                  {},
                  'portal.home.shortcutsDescription',
                  shortcuts.description
                ),
                escapeHtml(shortcuts.description)
              )
            : ''
        }`
      )}${renderTag(
        'div',
        { class: 'portal-card-grid portal-card-grid--shortcuts' },
        shortcutItems
          .map((item) => {
            const shortcutKey =
              item.path === '/categories/'
                ? 'categories'
                : item.path === '/portfolio/'
                  ? 'portfolio'
                  : item.path === '/contact/'
                    ? 'contact'
                    : null

            return renderTag(
              'a',
              {
                class: 'portal-card portal-shortcut-card',
                href: resolveHref(item.path, item.external),
                'data-portal-shortcut-path': item.path,
                target: isExternalPath(item.path, item.external)
                  ? '_blank'
                  : null,
                rel: isExternalPath(item.path, item.external)
                  ? 'noopener noreferrer'
                  : null,
              },
              `${item.icon ? renderTag('i', { class: item.icon }, '') : ''}${renderTag(
                'h3',
                shortcutKey
                  ? withI18nAttr(
                      { class: 'portal-card__title' },
                      `portal.shortcuts.${shortcutKey}.label`,
                      fallbackText(item.label, PORTAL_CONFIG.DEFAULT_TITLE)
                    )
                  : { class: 'portal-card__title' },
                escapeHtml(fallbackText(item.label, PORTAL_CONFIG.DEFAULT_TITLE))
              )}`
            )
          })
          .join('')
      )}`
    )
  }

  const renderRecentPosts = (siteLocals, home = {}) => {
    const recentPosts = getLatestPosts(siteLocals, PORTAL_CONFIG.HOMEPAGE_POST_LIMIT)

    return renderTag(
      'section',
      { class: 'portal-section' },
      `${renderTag(
        'div',
        { class: 'portal-section-heading' },
        `${renderTag(
          'h2',
          withI18nAttr(
            {},
            'portal.home.recentPostsTitle',
            fallbackText(home.recent_posts_title, 'Recent Writing')
          ),
          escapeHtml(fallbackText(home.recent_posts_title, 'Recent Writing'))
        )}${renderTag(
          'p',
          withI18nAttr(
            {},
            'portal.home.recentPostsIntro',
            'Latest posts from the portal publishing surface.'
          ),
          escapeHtml(
            getLocaleText(
              'portal.home.recentPostsIntro',
              'Latest posts from the portal publishing surface.'
            )
          )
        )}`
      )}${
        recentPosts.length
          ? renderTag(
              'div',
              { class: 'portal-post-list' },
              recentPosts
                .map((post) => {
                  const title = fallbackText(post.title, PORTAL_CONFIG.DEFAULT_TITLE)
                  const excerptSource = post.description || post.excerpt || post.content || ''
                  const excerptBase = stripHtml(excerptSource)
                  const excerpt = excerptBase
                    ? excerptBase.length > 160
                      ? `${excerptBase.slice(0, 160)}...`
                      : excerptBase
                    : PORTAL_CONFIG.DEFAULT_DESCRIPTION

                  return renderTag(
                    'article',
                    { class: 'portal-card portal-post-card' },
                    `${renderTag(
                      'div',
                      { class: 'portal-post-card__meta' },
                      renderTag(
                        'time',
                        { datetime: formatDateTime(post.date) },
                        escapeHtml(formatDate(post.date))
                      )
                    )}${renderTag(
                      'h3',
                      { class: 'portal-card__title' },
                      renderTag(
                        'a',
                        { href: resolveHref(post.path) },
                        escapeHtml(title)
                      )
                    )}${renderTag(
                      'p',
                      { class: 'portal-card__copy' },
                      escapeHtml(excerpt)
                    )}`
                  )
                })
                .join('')
            )
          : renderTag(
              'div',
              { class: 'portal-empty-state' },
              renderTag(
                'p',
                {},
                escapeHtml(
                  fallbackText(
                    home.recent_posts_empty_text,
                    'No posts yet.'
                  )
                )
              )
            )
      }`
    )
  }

  const renderBlog = (siteLocals) => {
    const allPosts = getLatestPosts(siteLocals, Number.MAX_SAFE_INTEGER)

    return renderTag(
      'div',
      { class: 'portal-page portal-blog' },
      renderTag(
        'section',
        { class: 'portal-section' },
        allPosts.length
          ? renderTag(
              'div',
              { class: 'portal-post-list' },
              allPosts
                .map((post) => {
                  const title = fallbackText(post.title, PORTAL_CONFIG.DEFAULT_TITLE)
                  const excerptSource = post.description || post.excerpt || post.content || ''
                  const excerptBase = stripHtml(excerptSource)
                  const excerpt = excerptBase
                    ? excerptBase.length > 160
                      ? `${excerptBase.slice(0, 160)}...`
                      : excerptBase
                    : PORTAL_CONFIG.DEFAULT_DESCRIPTION

                  return renderTag(
                    'article',
                    { class: 'portal-card portal-post-card' },
                    `${renderTag(
                      'div',
                      { class: 'portal-post-card__meta' },
                      renderTag(
                        'time',
                        { datetime: formatDateTime(post.date) },
                        escapeHtml(formatDate(post.date))
                      )
                    )}${renderTag(
                      'h3',
                      { class: 'portal-card__title' },
                      renderTag(
                        'a',
                        { href: resolveHref(post.path) },
                        escapeHtml(title)
                      )
                    )}${renderTag(
                      'p',
                      { class: 'portal-card__copy' },
                      escapeHtml(excerpt)
                    )}`
                  )
                })
                .join('')
            )
          : renderTag(
              'div',
              { class: 'portal-empty-state' },
              renderTag('p', {}, 'No posts yet.')
            )
      )
    )
  }

  const renderPortfolioPreview = (portfolio = {}, home = {}) => {
    const portfolioSection = portfolio.section || {}
    const portfolioCards = fallbackArray(portfolio.cards)
    const previewCards = portfolioCards.slice(0, PORTAL_CONFIG.PORTFOLIO_PREVIEW_LIMIT)

    if (!previewCards.length) return ''

    return renderTag(
      'section',
      { class: 'portal-section' },
      `${renderTag(
        'div',
        { class: 'portal-section-heading' },
        `${renderTag(
          'h2',
          withI18nAttr(
            {},
            'portal.home.portfolioPreviewTitle',
            fallbackText(
              portfolioSection.home_preview_title,
              fallbackText(
                home.portfolio_preview_title,
                fallbackText(portfolioSection.title, 'Project Preview')
              )
            )
          ),
          escapeHtml(
            fallbackText(
              portfolioSection.home_preview_title,
              fallbackText(
                home.portfolio_preview_title,
                fallbackText(portfolioSection.title, 'Project Preview')
              )
            )
          )
        )}${renderTag(
          'p',
          {},
          escapeHtml(
            fallbackText(
              portfolioSection.home_preview_intro,
              PORTAL_CONFIG.DEFAULT_DESCRIPTION
            )
          )
        )}`
      )}${renderTag(
        'div',
        { class: 'portal-card-grid portal-card-grid--projects' },
        previewCards
          .map((card) => renderProjectCard(card, portfolioSection.page_link_label))
          .join('')
      )}`
    )
  }

  const renderFooter = (profile = {}, home = {}) => {
    const ownerName = fallbackText(
      profile.owner?.display_name,
      fallbackText(hexo.config.author, hexo.config.title)
    )
    const currentYear = new Date().getFullYear()
    const sinceYear = profile.site_started_year || currentYear

    return renderTag(
      'section',
      { class: 'portal-section portal-footer-panel' },
      `${renderTag(
        'div',
        { class: 'portal-section-heading' },
        `${renderTag(
          'h2',
          withI18nAttr(
            {},
            'portal.home.footerTitle',
            fallbackText(home.footer_title, 'Connect')
          ),
          escapeHtml(fallbackText(home.footer_title, 'Connect'))
        )}${renderTag(
          'p',
          withI18nAttr(
            {},
            'portal.home.footerIntro',
            'Keep the public portal and shared profile details easy to update from one place.'
          ),
          escapeHtml(
            getLocaleText(
              'portal.home.footerIntro',
              'Keep the public portal and shared profile details easy to update from one place.'
            )
          )
        )}`
      )}${renderTag(
        'div',
        { class: 'portal-footer-panel__grid' },
        `${renderTag(
          'div',
          { class: 'portal-card' },
          `${renderTag(
            'h3',
            withI18nAttr({ class: 'portal-card__title' }, 'portal.footer.socialLinks', 'Social Links'),
            escapeHtml(getLocaleText('portal.footer.socialLinks', 'Social Links'))
          )}${renderSocialLinks(
            fallbackArray(profile.social_links)
          )}`
        )}${renderTag(
          'div',
          { class: 'portal-card' },
          `${renderTag(
            'h3',
            withI18nAttr({ class: 'portal-card__title' }, 'portal.footer.contact', 'Contact'),
            escapeHtml(getLocaleText('portal.footer.contact', 'Contact'))
          )}${renderContactMeta(
            profile.contact || {}
          )}${renderTag(
            'p',
            { class: 'portal-copyright' },
            escapeHtml(
              sinceYear !== currentYear
                ? `© ${sinceYear} - ${currentYear} ${ownerName}`
                : `© ${currentYear} ${ownerName}`
            )
          )}`
        )}`
      )}`
    )
  }

  const renderHome = ({ siteLocals } = {}) => {
    const { profile, navigation, portfolio } = getPortalData(siteLocals)
    const home = profile.home || {}

    // Embed profile data for client-side scripts (hero, etc.)
    const heroData = {
      display_name: fallbackText(profile.owner?.display_name, hexo.config.author),
      full_name: fallbackText(profile.owner?.full_name, ''),
      avatar_path: fallbackText(profile.avatar_path, '/shared-assets/images/profile.jpg'),
      intro_short: fallbackText(profile.intro?.short, ''),
      intro_long: fallbackText(profile.intro?.long, ''),
      hero_phrases: Array.isArray(profile.hero_phrases) && profile.hero_phrases.length > 0
        ? profile.hero_phrases
        : ['Code, Anime, Games, and Coffee.', 'VR, HCI, and game dev.', "Writing things down so I don't forget."],
      hero_backgrounds: Array.isArray(profile.hero_backgrounds) ? profile.hero_backgrounds : [],
      hero_rotation_interval: typeof profile.hero_rotation_interval === 'number' ? profile.hero_rotation_interval : 300,
    }
    const heroDataJson = JSON.stringify(heroData)
    // Direct output to avoid HTML escaping JSON
    const heroScript = `<script id="portal-hero-data" type="application/json">${heroDataJson}</script>`

    return (
      heroScript +
      renderTag(
        'div',
        { class: 'portal-page portal-home' },
        `${renderShortcutSection(navigation, home)}${renderRecentPosts(
          siteLocals,
          home
        )}${renderPortfolioPreview(portfolio, home)}`
      )
    )
  }

  const renderPortfolio = ({ siteLocals } = {}) => {
    const { portfolio } = getPortalData(siteLocals)
    const section = portfolio.section || {}
    const cards = fallbackArray(portfolio.cards)

    const body = cards.length
      ? renderTag(
          'div',
          { class: 'portal-card-grid portal-card-grid--projects' },
          cards.map((card) => renderProjectCard(card, section.page_link_label)).join('')
        )
      : renderTag(
          'div',
          { class: 'portal-empty-state' },
          renderTag(
            'p',
            withI18nAttr({}, 'portal.portfolio.empty', 'No portfolio cards configured yet.'),
            escapeHtml(getLocaleText('portal.portfolio.empty', 'No portfolio cards configured yet.'))
          )
        )

    return renderTag(
      'div',
      { class: 'portal-page portal-portfolio' },
      renderTag(
        'section',
        { class: 'portal-section' },
        `${renderTag(
          'div',
          { class: 'portal-section-heading' },
          `${renderTag(
            'h1',
            withI18nAttr(
              {},
              'portal.portfolio.title',
              fallbackText(section.title, 'Portfolio')
            ),
            escapeHtml(fallbackText(section.title, 'Portfolio'))
          )}${renderTag(
            'p',
            {},
            escapeHtml(fallbackText(section.intro, PORTAL_CONFIG.DEFAULT_DESCRIPTION))
          )}`
        )}${body}`
      )
    )
  }

  const renderAbout = ({ siteLocals } = {}) => {
    const { profile } = getPortalData(siteLocals)
    const about = profile.about || {}
    const skills = fallbackArray(about.skills)
    const experience = fallbackArray(about.experience)

    const experienceBody = experience.length
      ? renderTag(
          'div',
          { class: 'portal-stack' },
          experience
            .map((item) =>
              renderTag(
                'article',
                { class: 'portal-card' },
                `${renderTag(
                  'div',
                  { class: 'portal-inline-meta' },
                  `${renderTag(
                    'h3',
                    { class: 'portal-card__title' },
                    escapeHtml(fallbackText(item.title, 'Untitled Role'))
                  )}${
                    item.period ? renderTag('span', { class: 'portal-badge' }, escapeHtml(item.period)) : ''
                  }`
                )}${renderTag(
                  'p',
                  { class: 'portal-card__copy' },
                  escapeHtml(fallbackText(item.description, PORTAL_CONFIG.DEFAULT_DESCRIPTION))
                )}`
              )
            )
            .join('')
        )
      : renderTag(
          'div',
          { class: 'portal-empty-state' },
          renderTag(
            'p',
            withI18nAttr({}, 'portal.about.emptyExperience', 'No experience entries configured yet.'),
            escapeHtml(
              getLocaleText('portal.about.emptyExperience', 'No experience entries configured yet.')
            )
          )
        )

    return renderTag(
      'div',
      { class: 'portal-page portal-about' },
      `${renderTag(
        'section',
        { class: 'portal-section' },
        `${renderTag(
          'div',
          { class: 'portal-section-heading' },
          `${renderTag(
            'h1',
            withI18nAttr(
              {},
              'portal.about.title',
              fallbackText(about.intro_title, 'About Me')
            ),
            escapeHtml(fallbackText(about.intro_title, 'About Me'))
          )}${renderTag(
            'p',
            {},
            escapeHtml(fallbackText(about.intro_summary, PORTAL_CONFIG.DEFAULT_DESCRIPTION))
          )}`
        )}${renderTag(
          'div',
          { class: 'portal-card portal-copy-card' },
          profile.intro?.long
            ? renderTag('div', { class: 'portal-copy' }, renderParagraphs(profile.intro.long))
            : renderTag(
                'p',
                { class: 'portal-card__copy' },
                PORTAL_CONFIG.DEFAULT_DESCRIPTION
              )
        )}`
      )}${renderTag(
        'section',
        { class: 'portal-section' },
        `${renderTag(
          'div',
          { class: 'portal-section-heading' },
          `${renderTag(
            'h2',
            withI18nAttr(
              {},
              'portal.about.skillsTitle',
              fallbackText(about.skills_title, 'Skills')
            ),
            escapeHtml(fallbackText(about.skills_title, 'Skills'))
          )}${renderTag(
            'p',
            withI18nAttr(
              {},
              'portal.about.skillsIntro',
              'Placeholder structure prepared for future refinement through data editing.'
            ),
            escapeHtml(
              getLocaleText(
                'portal.about.skillsIntro',
                'Placeholder structure prepared for future refinement through data editing.'
              )
            )
          )}`
        )}${
          skills.length
            ? renderTag(
                'div',
                { class: 'portal-chip-grid' },
                skills.map((skill) => renderTag('span', { class: 'portal-chip' }, escapeHtml(skill))).join('')
              )
            : renderTag(
                'div',
                { class: 'portal-empty-state' },
                renderTag(
                  'p',
                  withI18nAttr({}, 'portal.about.emptySkills', 'No skills configured yet.'),
                  escapeHtml(getLocaleText('portal.about.emptySkills', 'No skills configured yet.'))
                )
              )
        }`
      )}${renderTag(
        'section',
        { class: 'portal-section' },
        `${renderTag(
          'div',
          { class: 'portal-section-heading' },
          `${renderTag(
            'h2',
            withI18nAttr(
              {},
              'portal.about.experienceTitle',
              fallbackText(about.experience_title, 'Experience')
            ),
            escapeHtml(fallbackText(about.experience_title, 'Experience'))
          )}${renderTag(
            'p',
            withI18nAttr(
              {},
              'portal.about.experienceIntro',
              'Placeholder experience timeline seeded from site_profile.yml.'
            ),
            escapeHtml(
              getLocaleText(
                'portal.about.experienceIntro',
                'Placeholder experience timeline seeded from site_profile.yml.'
              )
            )
          )}`
        )}${experienceBody}`
      )}`
    )
  }

  const renderContact = ({ siteLocals } = {}) => {
    const { profile } = getPortalData(siteLocals)
    const contact = profile.contact || {}

    return renderTag(
      'div',
      { class: 'portal-page portal-contact' },
      `${renderTag(
        'section',
        { class: 'portal-section' },
        `${renderTag(
          'div',
          { class: 'portal-section-heading' },
          renderTag(
            'h1',
            withI18nAttr({}, 'portal.contact.title', 'Contact'),
            escapeHtml(getLocaleText('portal.contact.title', 'Contact'))
          )
        )}${renderTag(
          'div',
          { class: 'portal-card portal-copy-card portal-contact-info' },
          `${renderTag(
            'ul',
            { class: 'portal-meta-list' },
            `${renderTag(
              'li',
              {},
              `${renderTag(
                'strong',
                withI18nAttr({}, 'portal.contact.emailLabel', 'Email'),
                `${escapeHtml(getLocaleText('portal.contact.emailLabel', 'Email'))}:`
              )} ${escapeHtml(contact.email || '')}`
            )}${renderTag(
              'li',
              {},
              `${renderTag(
                'strong',
                withI18nAttr({}, 'brand.contactLocationLabel', 'Location'),
                `${escapeHtml(getLocaleText('brand.contactLocationLabel', 'Location'))}:`
              )} ${escapeHtml(contact.location || '')}`
            )}${renderTag(
              'li',
              {},
              `${renderTag(
                'strong',
                withI18nAttr({}, 'portal.contact.bestForLabel', 'Best for'),
                `${escapeHtml(getLocaleText('portal.contact.bestForLabel', 'Best for'))}:`
              )} ${escapeHtml(contact.availability_note || PORTAL_CONFIG.DEFAULT_DESCRIPTION)}`
            )}`
          )}${renderTag(
            'p',
            { class: 'portal-contact-checklist-hint' },
            `${escapeHtml(
              getLocaleText(
                'portal.contact.messageChecklistIntro',
                'The clearest messages usually include:'
              )
            )} ${escapeHtml(getLocaleText('portal.contact.checklist.who', 'who you are'))}, ${escapeHtml(getLocaleText('portal.contact.checklist.topic', 'what you are reaching out about'))}, ${escapeHtml(getLocaleText('portal.contact.checklist.context', 'useful links or context'))}, ${escapeHtml(getLocaleText('portal.contact.checklist.reply', 'how you would like me to reply'))}.`
          )}`
        )}`
      )}${renderTag(
        'section',
        { class: 'portal-section' },
        renderTag(
          'div',
          { class: 'portal-card portal-copy-card' },
          `<form class="portal-contact-form" action="${escapeHtml(
            contact.formspree_endpoint || 'https://formspree.io/f/mkgbpnbb'
          )}" method="POST">
            ${renderVoidTag('input', {
              type: 'hidden',
              name: '_subject',
              value: 'Portal Contact Message',
            })}
            <div class="portal-contact-field">
              <label>
                <span data-i18n="portal.contact.nameLabel" data-i18n-fallback="${escapeHtml(
                  getLocaleText('portal.contact.nameLabel', 'Name')
                )}">${escapeHtml(getLocaleText('portal.contact.nameLabel', 'Name'))}</span>
                ${renderVoidTag('input', {
                  type: 'text',
                  name: 'name',
                  placeholder: getLocaleText('portal.contact.namePlaceholder', 'Your name'),
                  'data-i18n-placeholder': 'portal.contact.namePlaceholder',
                })}
              </label>
            </div>
            <div class="portal-contact-field">
              <label>
                <span data-i18n="portal.contact.emailLabel" data-i18n-fallback="${escapeHtml(
                  getLocaleText('portal.contact.emailLabel', 'Email')
                )}">${escapeHtml(getLocaleText('portal.contact.emailLabel', 'Email'))}</span>
                ${renderVoidTag('input', {
                  type: 'email',
                  name: 'email',
                  placeholder: getLocaleText('portal.contact.emailPlaceholder', 'you@example.com'),
                  'data-i18n-placeholder': 'portal.contact.emailPlaceholder',
                })}
              </label>
            </div>
            <div class="portal-contact-field">
              <label>
                <span data-i18n="portal.contact.topicLabel" data-i18n-fallback="${escapeHtml(
                  getLocaleText('portal.contact.topicLabel', 'Topic')
                )}">${escapeHtml(getLocaleText('portal.contact.topicLabel', 'Topic'))}</span>
                ${renderVoidTag('input', {
                  type: 'text',
                  name: 'topic',
                  placeholder: getLocaleText(
                    'portal.contact.topicPlaceholder',
                    'Project, collaboration, or a quick hello'
                  ),
                  'data-i18n-placeholder': 'portal.contact.topicPlaceholder',
                })}
              </label>
            </div>
            <div class="portal-contact-field">
              <label>
                <span data-i18n="portal.contact.messageLabel" data-i18n-fallback="${escapeHtml(
                  getLocaleText('portal.contact.messageLabel', 'Message')
                )}">${escapeHtml(getLocaleText('portal.contact.messageLabel', 'Message'))}</span>
                <textarea
                  name="message"
                  rows="6"
                  placeholder="${escapeHtml(
                    getLocaleText(
                      'portal.contact.messagePlaceholder',
                      'A short introduction and your message'
                    )
                  )}"
                  data-i18n-placeholder="portal.contact.messagePlaceholder"
                ></textarea>
              </label>
            </div>
            <button
              type="submit"
              class="portal-button portal-contact-submit"
              data-i18n="portal.contact.sendButton"
              data-i18n-fallback="${escapeHtml(
                getLocaleText('portal.contact.sendButton', 'Send Message')
              )}"
            >${escapeHtml(getLocaleText('portal.contact.sendButton', 'Send Message'))}</button>
          </form>`
        )
      )}`
    )
  }

  return {
    PORTAL_CONFIG,
    renderHero,
    renderRecentPosts,
    renderPortfolioPreview,
    renderFooter,
    renderHome,
    renderBlog,
    renderPortfolio,
    renderAbout,
    renderContact,
  }
}
