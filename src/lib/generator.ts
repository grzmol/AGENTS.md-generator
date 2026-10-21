import type { ExportFormat, FormatSpec, Pack, ProjectInfo } from './types'

export const FORMATS: FormatSpec[] = [
  { id: 'agents', label: 'AGENTS.md', filename: 'AGENTS.md' },
  { id: 'claude', label: 'CLAUDE.md', filename: 'CLAUDE.md' },
  { id: 'cursor', label: 'Cursor rule', filename: 'agents.mdc' },
  { id: 'copilot', label: 'Copilot', filename: 'copilot-instructions.md' }
]

export const EMPTY_PROJECT: ProjectInfo = {
  name: '',
  description: '',
  install: '',
  dev: '',
  build: '',
  test: '',
  lint: ''
}

const COMMAND_LABELS: Array<[keyof ProjectInfo, string]> = [
  ['install', 'Install'],
  ['dev', 'Dev server'],
  ['build', 'Build'],
  ['test', 'Test'],
  ['lint', 'Lint']
]

function titleFor(format: ExportFormat, project: ProjectInfo): string {
  const name = project.name.trim()
  if (format === 'claude') return name ? `${name}: CLAUDE.md` : 'CLAUDE.md'
  if (format === 'copilot') return name ? `${name}: Copilot instructions` : 'Copilot instructions'
  return name ? `${name}: AGENTS.md` : 'AGENTS.md'
}

export function buildBody(packs: Pack[], selected: ReadonlySet<string>, project: ProjectInfo, format: ExportFormat = 'agents'): string {
  const lines: string[] = [`# ${titleFor(format, project)}`, '']

  const description = project.description.trim()
  if (description) lines.push(description, '')

  const commands = COMMAND_LABELS.filter(([key]) => project[key].trim() !== '')
  if (commands.length > 0) {
    lines.push('## Commands', '')
    for (const [key, label] of commands) lines.push(`- ${label}: \`${project[key].trim()}\``)
    lines.push('')
  }

  const ordered = [...packs].sort((a, b) => a.order - b.order)
  for (const pack of ordered) {
    const chosen = pack.rules.filter((rule) => selected.has(rule.id))
    if (chosen.length === 0) continue
    const heading = pack.kind === 'technology' ? `${pack.title} conventions` : pack.title
    lines.push(`## ${heading}`, '')
    for (const rule of chosen) {
      const suffix = pack.kind === 'skills' && rule.url ? ` (${rule.url})` : ''
      lines.push(`- ${rule.text}${suffix}`)
    }
    lines.push('')
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

export function generate(packs: Pack[], selected: ReadonlySet<string>, project: ProjectInfo, format: ExportFormat = 'agents'): string {
  const body = buildBody(packs, selected, project, format)
  if (format === 'cursor') {
    const description = project.description.trim().split('\n')[0] || 'Project conventions for AI coding agents'
    return `---\ndescription: ${description}\nalwaysApply: true\n---\n\n${body}`
  }
  return body
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function lineCount(text: string): number {
  return text.trimEnd().split('\n').length
}

export const LENGTH_WARNING_LINES = 300
