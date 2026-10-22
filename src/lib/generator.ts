import { slugFromPath } from './paths'
import type { ExportFormat, FormatSpec, OutputFile, Pack, ProjectInfo, Scope } from './types'

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

function titleFor(format: ExportFormat, project: ProjectInfo, scopePath: string): string {
  const name = scopePath || project.name.trim()
  const label = format === 'claude' ? 'CLAUDE.md' : format === 'copilot' ? 'Copilot instructions' : 'AGENTS.md'
  return name ? `${name}: ${label}` : label
}

export function buildBody(
  packs: Pack[],
  selected: ReadonlySet<string>,
  project: ProjectInfo,
  format: ExportFormat = 'agents',
  scopePath = ''
): string {
  const lines: string[] = [`# ${titleFor(format, project, scopePath)}`, '']

  if (scopePath) {
    lines.push(`Applies to files under \`${scopePath}/\`. Follow the repository root instructions as well; where they conflict, the rules in this file take precedence for this folder.`, '')
  }

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

export function filePathFor(format: ExportFormat, scopePath: string): string {
  const slug = slugFromPath(scopePath)
  switch (format) {
    case 'claude':
      return scopePath ? `${scopePath}/CLAUDE.md` : 'CLAUDE.md'
    case 'cursor':
      return scopePath ? `.cursor/rules/${slug}.mdc` : '.cursor/rules/agents.mdc'
    case 'copilot':
      return scopePath ? `.github/instructions/${slug}.instructions.md` : '.github/copilot-instructions.md'
    default:
      return scopePath ? `${scopePath}/AGENTS.md` : 'AGENTS.md'
  }
}

function frontmatter(format: ExportFormat, project: ProjectInfo, scopePath: string): string {
  if (format === 'cursor') {
    const description = project.description.trim().split('\n')[0] || (scopePath ? `Conventions for ${scopePath}` : 'Project conventions for AI coding agents')
    const rule = scopePath ? `globs: ${scopePath}/**\nalwaysApply: false` : 'alwaysApply: true'
    return `---\ndescription: ${description}\n${rule}\n---\n\n`
  }
  if (format === 'copilot' && scopePath) return `---\napplyTo: "${scopePath}/**"\n---\n\n`
  return ''
}

export function generateScope(packs: Pack[], scope: Pick<Scope, 'path' | 'project' | 'selected'>, format: ExportFormat = 'agents'): string {
  return frontmatter(format, scope.project, scope.path) + buildBody(packs, scope.selected, scope.project, format, scope.path)
}

export function generate(packs: Pack[], selected: ReadonlySet<string>, project: ProjectInfo, format: ExportFormat = 'agents'): string {
  return generateScope(packs, { path: '', project, selected: selected as Set<string> }, format)
}

export function generateFiles(packs: Pack[], scopes: Array<Pick<Scope, 'path' | 'project' | 'selected'>>, format: ExportFormat): OutputFile[] {
  return scopes
    .filter((scope) => scope.path === '' || scope.selected.size > 0 || scope.project.description.trim() !== '')
    .map((scope) => ({ path: filePathFor(format, scope.path), content: generateScope(packs, scope, format) }))
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function lineCount(text: string): number {
  return text.trimEnd().split('\n').length
}

export const LENGTH_WARNING_LINES = 300
