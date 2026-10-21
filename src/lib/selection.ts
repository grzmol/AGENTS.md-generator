import type { Pack, Preset, ProjectInfo } from './types'
import { EMPTY_PROJECT } from './generator'

export function ruleIndex(packs: Pack[]): Map<string, { packId: string; group?: string }> {
  const index = new Map<string, { packId: string; group?: string }>()
  for (const pack of packs) {
    for (const rule of pack.rules) index.set(rule.id, { packId: pack.id, group: rule.group })
  }
  return index
}

export function toggleRule(packs: Pack[], selected: ReadonlySet<string>, ruleId: string): Set<string> {
  const next = new Set(selected)
  if (next.has(ruleId)) {
    next.delete(ruleId)
    return next
  }
  for (const pack of packs) {
    const rule = pack.rules.find((candidate) => candidate.id === ruleId)
    if (!rule) continue
    if (rule.group) {
      for (const sibling of pack.rules) {
        if (sibling.group === rule.group) next.delete(sibling.id)
      }
    }
    next.add(ruleId)
    break
  }
  return next
}

export function applyIds(packs: Pack[], ids: Iterable<string>, base: ReadonlySet<string> = new Set()): Set<string> {
  let next = new Set(base)
  for (const id of ids) next = toggleRuleOn(packs, next, id)
  return next
}

function toggleRuleOn(packs: Pack[], selected: Set<string>, ruleId: string): Set<string> {
  return selected.has(ruleId) ? selected : toggleRule(packs, selected, ruleId)
}

export function applyPreset(packs: Pack[], preset: Preset): Set<string> {
  return applyIds(packs, preset.rules)
}

export function recommendedIds(packs: Pack[], only?: (pack: Pack) => boolean): Set<string> {
  const ids: string[] = []
  for (const pack of packs) {
    if (only && !only(pack)) continue
    for (const rule of pack.rules) if (rule.recommended) ids.push(rule.id)
  }
  return applyIds(packs, ids)
}

export interface Snapshot {
  selected: string[]
  project: ProjectInfo
}

export function encodeState(packs: Pack[], selected: ReadonlySet<string>, project: ProjectInfo): string {
  const known = ruleIndex(packs)
  const ids = [...selected].filter((id) => known.has(id))
  const params = new URLSearchParams()
  params.set('v', '1')
  if (ids.length > 0) params.set('r', ids.join('.'))
  for (const key of Object.keys(EMPTY_PROJECT) as Array<keyof ProjectInfo>) {
    const value = project[key].trim()
    if (value) params.set(key, value)
  }
  return params.toString()
}

export function decodeState(packs: Pack[], hash: string): Snapshot {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const known = ruleIndex(packs)
  const selected = (params.get('r') ?? '').split('.').filter((id) => id && known.has(id))
  const project: ProjectInfo = { ...EMPTY_PROJECT }
  for (const key of Object.keys(EMPTY_PROJECT) as Array<keyof ProjectInfo>) {
    project[key] = params.get(key) ?? ''
  }
  return { selected, project }
}
