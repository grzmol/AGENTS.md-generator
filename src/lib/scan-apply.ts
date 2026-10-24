import type { Pack } from './types'
import type { ScanResult } from './scan'
import { applyIds } from './selection'

const BASE = ['agent-behavior', 'workflow', 'testing', 'git', 'security']
const WEB = new Set(['react', 'nextjs', 'vue', 'nuxt', 'svelte', 'angular', 'astro', 'react-router', 'tailwind', 'react-native', 'electron', 'flutter', 'android', 'swift', 'shadcn', 'html', 'css'])
const SERVICE = new Set(['express', 'nestjs', 'fastapi', 'django', 'flask', 'go', 'java', 'dotnet', 'laravel', 'rails', 'elixir', 'graphql', 'trpc', 'kafka', 'rabbitmq-sqs', 'serverless'])

export function packsForScan(packs: Pack[], packIds: string[], monorepo = false, nested = false): string[] {
  const wanted = new Set(packIds)
  if (!nested) {
    for (const id of BASE) wanted.add(id)
    if ([...wanted].some((id) => WEB.has(id))) {
      wanted.add('design-system')
      wanted.add('a11y')
    }
    if ([...wanted].some((id) => SERVICE.has(id))) {
      wanted.add('logging')
      wanted.add('api-design')
    }
    if (monorepo) wanted.add('monorepo')
  }
  const known = new Set(packs.map((pack) => pack.id))
  return [...wanted].filter((id) => known.has(id))
}

export function selectionForScan(packs: Pack[], packIds: string[], monorepo = false, nested = false): Set<string> {
  const ids = new Set(packsForScan(packs, packIds, monorepo, nested))
  const rules = packs.filter((pack) => ids.has(pack.id)).flatMap((pack) => pack.rules.filter((rule) => rule.recommended).map((rule) => rule.id))
  return applyIds(packs, rules)
}

export function summarize(result: ScanResult): string {
  const labels = result.findings.filter((finding) => finding.packId !== 'monorepo').map((finding) => finding.label)
  return labels.length === 0 ? 'No known technologies detected' : labels.slice(0, 8).join(', ') + (labels.length > 8 ? ` and ${labels.length - 8} more` : '')
}
