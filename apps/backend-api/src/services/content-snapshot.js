import yaml from 'js-yaml'

const MANAGED_MARKER = '# managed-by-backend-api'

function serializeSnapshot(data) {
  return `${MANAGED_MARKER}\n${yaml.dump(data, {
    lineWidth: -1,
    noCompatMode: true,
    noRefs: true,
    quotingType: '"',
  })}`
}

export function normalizeSiteProfile(profile) {
  return structuredClone(profile || {})
}

export function serializeSiteProfile(profile) {
  return serializeSnapshot(normalizeSiteProfile(profile))
}

export function serializePortfolio(items) {
  const data = {
    section: {
      title: 'Portfolio',
      intro: '',
      home_preview_title: 'Selected Projects',
      home_preview_intro: '',
      page_link_label: 'View Project',
    },
    cards: items.map((item) => ({
      slug: item.slug,
      title: item.title,
      year: item.year || '',
      status: item.status || '',
      summary: item.summary,
      cover_image: item.coverImage || '/shared-assets/images/background.jpg',
      gallery: Array.isArray(item.gallery) ? item.gallery : [],
      tech_stack: Array.isArray(item.techStack) ? item.techStack : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      links: item.links && typeof item.links === 'object' ? item.links : {},
    })),
  }

  return serializeSnapshot(data)
}
