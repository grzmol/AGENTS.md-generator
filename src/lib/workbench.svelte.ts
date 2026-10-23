import { packs } from './content'
import { EMPTY_PROJECT, filePathFor, generateFiles, generateScope } from './generator'
import { normalizePath } from './paths'
import { applyIds, applyPreset, decodeWorkbench, encodeWorkbench, newScope, recommendedIds, toggleRule } from './selection'
import type { ExportFormat, Pack, Preset, Scope } from './types'

export type View = { kind: 'presets' } | { kind: 'project' } | { kind: 'pack'; id: string } | { kind: 'search' }

function initialScopes(): { scopes: Scope[]; format: ExportFormat } {
  const hash = typeof location === 'undefined' ? '' : location.hash
  const decoded = decodeWorkbench(packs, hash)
  if (decoded) return decoded
  const root = newScope(0, '', EMPTY_PROJECT, recommendedIds(packs, (pack) => pack.id === 'agent-behavior' || pack.id === 'git'))
  return { scopes: [root], format: 'agents' }
}

class Workbench {
  scopes = $state<Scope[]>([])
  activeId = $state('root')
  format = $state<ExportFormat>('agents')
  view = $state<View>({ kind: 'presets' })
  query = $state('')
  mobilePane = $state<'build' | 'file'>('build')
  mobileDetail = $state(false)
  counter = 1

  active = $derived(this.scopes.find((scope) => scope.id === this.activeId) ?? this.scopes[0])
  files = $derived(generateFiles(packs, this.scopes, this.format))
  activePath = $derived(filePathFor(this.format, this.active.path))
  activeContent = $derived(generateScope(packs, this.active, this.format))

  constructor() {
    const initial = initialScopes()
    this.scopes = initial.scopes
    this.format = initial.format
    this.counter = initial.scopes.length
  }

  hash(): string {
    return encodeWorkbench(packs, this.scopes, this.format)
  }

  toggle(ruleId: string) {
    this.active.selected = toggleRule(packs, this.active.selected, ruleId)
  }

  selectRecommended(pack: Pack) {
    const next = new Set(this.active.selected)
    for (const rule of pack.rules) next.delete(rule.id)
    this.active.selected = applyIds(
      packs,
      pack.rules.filter((rule) => rule.recommended).map((rule) => rule.id),
      next
    )
  }

  clearPack(pack: Pack) {
    const next = new Set(this.active.selected)
    for (const rule of pack.rules) next.delete(rule.id)
    this.active.selected = next
  }

  recommendedEverywhere() {
    this.active.selected = recommendedIds(packs)
  }

  clearAll() {
    this.active.selected = new Set()
  }

  presetSelection(preset: Preset, nested: boolean): Set<string> {
    const full = applyPreset(packs, preset)
    if (!nested) return full
    const general = new Set(packs.filter((pack) => pack.kind === 'general').flatMap((pack) => pack.rules.map((rule) => rule.id)))
    return new Set([...full].filter((id) => !general.has(id)))
  }

  applyPreset(preset: Preset) {
    this.active.selected = this.presetSelection(preset, this.active.path !== '')
  }

  countIn(pack: Pack, scope: Scope = this.active): number {
    let count = 0
    for (const rule of pack.rules) if (scope.selected.has(rule.id)) count++
    return count
  }

  addScope(rawPath: string, preset?: Preset): string | null {
    const path = normalizePath(rawPath)
    if (path === null) return 'Use a relative folder such as apps/web'
    if (this.scopes.some((scope) => scope.path === path)) return 'That folder already has a file'
    const scope = newScope(this.counter++, path, EMPTY_PROJECT, preset ? this.presetSelection(preset, true) : [])
    this.scopes = [...this.scopes, scope]
    this.activeId = scope.id
    return null
  }

  renameScope(id: string, rawPath: string): string | null {
    const path = normalizePath(rawPath)
    if (path === null) return 'Use a relative folder such as apps/web'
    if (this.scopes.some((scope) => scope.id !== id && scope.path === path)) return 'That folder already has a file'
    const scope = this.scopes.find((candidate) => candidate.id === id)
    if (scope && scope.path !== '') scope.path = path
    return null
  }

  removeScope(id: string) {
    if (id === 'root') return
    this.scopes = this.scopes.filter((scope) => scope.id !== id)
    if (this.activeId === id) this.activeId = 'root'
  }
}

export const workbench = new Workbench()
