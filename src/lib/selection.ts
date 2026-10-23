import type { ExportFormat, Pack, Preset, ProjectInfo, Scope } from './types'
import { EMPTY_PROJECT } from './generator'
import { normalizePath } from './paths'

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

const PROJECT_KEYS: Array<keyof ProjectInfo> = ['install', 'dev', 'build', 'test', 'lint']
const FORMAT_IDS: ExportFormat[] = ['agents', 'claude', 'cursor', 'copilot']

function parseCommands(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => (typeof item === 'string' ? item : '')) : []
  } catch {
    return []
  }
}

export function packRulesParam(packs: Pack[], selected: ReadonlySet<string>): string {
  const parts: string[] = []
  for (const pack of packs) {
    const suffixes = pack.rules.filter((rule) => selected.has(rule.id)).map((rule) => rule.id.slice(pack.id.length + 1))
    if (suffixes.length > 0) parts.push(`${pack.id}~${suffixes.join('.')}`)
  }
  return parts.join(',')
}

export function parseRulesParam(packs: Pack[], value: string): string[] {
  const known = ruleIndex(packs)
  const ids: string[] = []
  for (const part of value.split(',')) {
    const [packId, rest] = part.split('~')
    if (!packId || !rest) continue
    for (const suffix of rest.split('.')) {
      const id = `${packId}-${suffix}`
      if (known.has(id)) ids.push(id)
    }
  }
  return ids
}

export function newScope(index: number, path: string, project: ProjectInfo = EMPTY_PROJECT, selected: Iterable<string> = []): Scope {
  return { id: path === '' ? 'root' : `s${index}`, path, project: { ...project }, selected: new Set(selected) }
}

export function encodeWorkbench(packs: Pack[], scopes: Scope[], format: ExportFormat): string {
  const params = new URLSearchParams()
  params.set('v', '2')
  params.set('f', format)
  scopes.forEach((scope, index) => {
    if (index > 0) params.set(`p${index}`, scope.path)
    const rules = packRulesParam(packs, scope.selected)
    if (rules) params.set(`r${index}`, rules)
    if (scope.project.name.trim()) params.set(`n${index}`, scope.project.name.trim())
    if (scope.project.description.trim()) params.set(`d${index}`, scope.project.description.trim())
    const commands = PROJECT_KEYS.map((key) => scope.project[key].trim())
    if (commands.some(Boolean)) params.set(`k${index}`, JSON.stringify(commands))
  })
  return params.toString()
}

export function decodeWorkbench(packs: Pack[], hash: string): { scopes: Scope[]; format: ExportFormat } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (params.get('v') !== '2') return null
  const format = FORMAT_IDS.find((id) => id === params.get('f')) ?? 'agents'
  const scopes: Scope[] = []
  for (let index = 0; index < 50; index++) {
    const path = index === 0 ? '' : normalizePath(params.get(`p${index}`) ?? '')
    if (index > 0 && path === null) {
      if (!params.has(`p${index}`)) break
      continue
    }
    const project: ProjectInfo = { ...EMPTY_PROJECT, name: params.get(`n${index}`) ?? '', description: params.get(`d${index}`) ?? '' }
    const commands = parseCommands(params.get(`k${index}`))
    PROJECT_KEYS.forEach((key, position) => (project[key] = commands[position] ?? ''))
    const ids = parseRulesParam(packs, params.get(`r${index}`) ?? '')
    scopes.push(newScope(scopes.length, path ?? '', project, applyIds(packs, ids)))
  }
  if (scopes.length === 0) return null
  return { scopes, format }
}
