export interface Source {
  name: string
  url: string
  license?: string
}

export interface Rule {
  id: string
  title: string
  text: string
  recommended?: boolean
  group?: string
  url?: string
}

export type PackKind = 'general' | 'technology' | 'skills'

export interface Pack {
  id: string
  title: string
  kind: PackKind
  order: number
  family?: string
  description?: string
  sources?: Source[]
  rules: Rule[]
}

export interface Preset {
  id: string
  title: string
  description: string
  rules: string[]
}

export interface ProjectInfo {
  name: string
  description: string
  install: string
  dev: string
  build: string
  test: string
  lint: string
}

export type ExportFormat = 'agents' | 'claude' | 'cursor' | 'copilot'

export interface FormatSpec {
  id: ExportFormat
  label: string
  filename: string
}

export interface Scope {
  id: string
  path: string
  project: ProjectInfo
  selected: Set<string>
}

export interface OutputFile {
  path: string
  content: string
}
