const { array, CONFIG, text } = require('./data')
const { escapeHtml, stripHtml, tag } = require('./html')
const { uiText } = require('./ui')

function date(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function projectCard(context, card = {}) {
  const links = card.links || {}
  const actions = [
    ['portfolio.demo', 'Demo', links.demo],
    ['portfolio.repository', 'Repository', links.repo],
    ['portfolio.article', 'Article', links.article],
  ]
    .filter(([, , url]) => url)
    .map(([key, label, url]) =>
      uiText(key, label, {
        name: 'a',
        attrs: {
          class: 'portal-button',
          href: context.href(url),
          rel: context.external(url) ? 'noopener noreferrer' : null,
          target: context.external(url) ? '_blank' : null,
        },
      }),
    )
    .join('')

  return tag(
    'article',
    { class: 'portal-card portal-project-card' },
    `${tag(
      'div',
      { class: 'portal-project-card__cover' },
      `<img src="${escapeHtml(context.href(text(card.cover_image, CONFIG.DEFAULT_IMAGE_PATH)))}" alt="${escapeHtml(text(card.title, 'Untitled project'))}">`,
    )}${tag(
      'div',
      { class: 'portal-project-card__body' },
      `${tag('h3', { class: 'portal-card__title' }, escapeHtml(text(card.title, 'Untitled project')))}
      ${card.year ? tag('span', { class: 'portal-badge' }, escapeHtml(card.year)) : ''}
      ${card.status ? tag('p', { class: 'portal-card__meta' }, escapeHtml(card.status)) : ''}
      ${card.summary ? tag('p', { class: 'portal-card__copy' }, escapeHtml(card.summary)) : ''}
      ${array(card.tags).length ? tag('div', { class: 'portal-chip-grid portal-chip-grid--compact' }, array(card.tags).map((item) => tag('span', { class: 'portal-chip' }, escapeHtml(item))).join('')) : ''}
      ${actions ? tag('div', { class: 'portal-action-row' }, actions) : ''}`,
    )}`,
  )
}

function recentPosts(context, siteLocals, home = {}) {
  const posts = context.latestPosts(siteLocals)
  const body = posts.length
    ? tag(
        'div',
        { class: 'portal-post-list' },
        posts
          .map((post) => {
            const excerpt = stripHtml(post.description || post.excerpt || post.content || '')
            return tag(
              'article',
              { class: 'portal-card portal-post-card' },
              `${tag('time', { class: 'portal-post-card__meta', datetime: date(post.date) }, date(post.date))}
              ${tag('h3', { class: 'portal-card__title' }, tag('a', { href: context.href(post.path) }, escapeHtml(text(post.title, 'Untitled entry'))))}
              ${excerpt ? tag('p', { class: 'portal-card__copy' }, escapeHtml(excerpt.length > 160 ? `${excerpt.slice(0, 160)}…` : excerpt)) : ''}`,
            )
          })
          .join(''),
      )
    : tag(
        'div',
        { class: 'portal-empty-state' },
        uiText('home.emptyPosts', text(home.recent_posts_empty_text, 'No posts yet'), {
          name: 'p',
        }),
      )

  return tag(
    'section',
    { class: 'portal-section portal-recent-writing' },
    `${tag('div', { class: 'portal-section-heading' }, uiText('home.recentPostsTitle', text(home.recent_posts_title, 'Recent posts'), { name: 'h2' }))}${body}`,
  )
}

module.exports = { projectCard, recentPosts }
