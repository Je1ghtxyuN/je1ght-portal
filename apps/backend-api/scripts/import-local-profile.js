import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '../src/db/client.js'
import yaml from 'js-yaml'

const PROFILE_PATH = join('/portal-source', 'source', '_data', 'site_profile.yml')
const MANAGED_MARKER = '# managed-by-backend-api'

function parseYaml(content) {
  return yaml.load(content) || {}
}

async function importLocalProfile() {
  let content
  try {
    content = await readFile(PROFILE_PATH, 'utf-8')
  } catch {
    console.log('import-local-profile: site_profile.yml not found, skipping')
    return { imported: false }
  }

  // Strip managed marker if present
  const yamlContent = content.startsWith(MANAGED_MARKER)
    ? content.slice(MANAGED_MARKER.length).trim()
    : content.trim()

  if (!yamlContent) {
    console.log('import-local-profile: empty profile, skipping')
    return { imported: false }
  }

  const data = parseYaml(yamlContent)

  // Validate
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    console.log('import-local-profile: parsed empty data, skipping')
    return { imported: false }
  }

  const existing = await prisma.siteProfile.findUnique({ where: { id: 'default' } })

  if (existing) {
    // Full replace: local site_profile.yml is the source of truth
    await prisma.siteProfile.update({
      where: { id: 'default' },
      data: { data },
    })
    console.log('import-local-profile: updated from local site_profile.yml')
  } else {
    await prisma.siteProfile.create({
      data: { id: 'default', data },
    })
    console.log('import-local-profile: created from local site_profile.yml')
  }

  return { imported: true }
}

importLocalProfile()
  .then((result) => {
    console.log(`import-local-profile: ${result.imported ? 'synced' : 'skipped'}`)
    process.exit(0)
  })
  .catch((err) => {
    console.error('import-local-profile error:', err.stack)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
