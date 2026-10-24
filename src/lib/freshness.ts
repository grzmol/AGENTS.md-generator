import type { Pack } from './types'

export interface FreshnessReport {
  stale: Array<{ id: string; title: string; reviewed: string; months: number }>
  unreviewed: Array<{ id: string; title: string }>
  total: number
  reviewed: number
}

export function monthsBetween(reviewed: string, now: Date): number {
  const [year, month] = reviewed.split('-').map(Number)
  if (!year || !month) return Number.POSITIVE_INFINITY
  return (now.getUTCFullYear() - year) * 12 + (now.getUTCMonth() + 1 - month)
}

export function freshness(packs: Pack[], now: Date, maxMonths = 6): FreshnessReport {
  const stale: FreshnessReport['stale'] = []
  const unreviewed: FreshnessReport['unreviewed'] = []
  let reviewed = 0
  for (const pack of packs) {
    if (pack.reviewed) {
      reviewed++
      const months = monthsBetween(pack.reviewed, now)
      if (months > maxMonths) stale.push({ id: pack.id, title: pack.title, reviewed: pack.reviewed, months })
    } else if (pack.kind !== 'general') {
      unreviewed.push({ id: pack.id, title: pack.title })
    }
  }
  stale.sort((a, b) => b.months - a.months)
  return { stale, unreviewed, total: packs.length, reviewed }
}

export function renderReport(report: FreshnessReport, broken: Array<{ pack: string; url: string; status: string }>, now: Date): string {
  const lines = [
    `Generated ${now.toISOString().slice(0, 10)}. ${report.reviewed} of ${report.total} packs have a review date.`,
    '',
    `## Packs reviewed more than 6 months ago (${report.stale.length})`,
    '',
    ...(report.stale.length === 0 ? ['None.'] : report.stale.map((item) => `- [ ] \`${item.id}\` (${item.title}), reviewed ${item.reviewed}, ${item.months} months ago`)),
    '',
    `## Broken or unreachable source links (${broken.length})`,
    '',
    ...(broken.length === 0 ? ['None.'] : broken.map((item) => `- [ ] \`${item.pack}\`: ${item.url} (${item.status})`)),
    '',
    `## Technology packs never reviewed (${report.unreviewed.length})`,
    '',
    ...(report.unreviewed.length === 0 ? ['None.'] : report.unreviewed.map((item) => `- \`${item.id}\` (${item.title})`)),
    '',
    'To review a pack, check its rules against the official documentation, then set `reviewed` and add the source in `content/packs`.'
  ]
  return lines.join('\n')
}
