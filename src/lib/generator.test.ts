import { describe, expect, it } from 'vitest'
import { EMPTY_PROJECT, filePathFor, generate, generateFiles, lineCount } from './generator'
import { normalizePath } from './paths'
import { applyIds, decodeWorkbench, encodeWorkbench, newScope, recommendedIds, toggleRule } from './selection'
import { createZip, crc32 } from './zip'
import type { Pack } from './types'

const packs: Pack[] = [
  {
    id: 'fmt',
    title: 'Formatting',
    kind: 'general',
    order: 1,
    rules: [
      { id: 'fmt-tabs', title: 'Tabs', text: 'Indent with tabs.', group: 'indent' },
      { id: 'fmt-spaces', title: 'Spaces', text: 'Indent with 2 spaces.', group: 'indent', recommended: true },
      { id: 'fmt-eof', title: 'EOF', text: 'End files with a newline.', recommended: true }
    ]
  },
  {
    id: 'ts',
    title: 'TypeScript',
    kind: 'technology',
    order: 2,
    rules: [{ id: 'ts-strict', title: 'Strict', text: 'Enable strict mode.', recommended: true }]
  },
  {
    id: 'skills',
    title: 'Skills and tools',
    kind: 'skills',
    order: 3,
    rules: [{ id: 'skills-x', title: 'X', text: 'Use the x skill.', url: 'https://example.com' }]
  }
]

describe('generate', () => {
  it('renders only selected rules grouped by pack in order', () => {
    const out = generate(packs, new Set(['ts-strict', 'fmt-eof']), EMPTY_PROJECT)
    expect(out).toBe('# AGENTS.md\n\n## Formatting\n\n- End files with a newline.\n\n## TypeScript conventions\n\n- Enable strict mode.\n')
  })

  it('includes project info and commands', () => {
    const out = generate(packs, new Set(), { ...EMPTY_PROJECT, name: 'Acme', description: 'A shop.', test: 'npm test' })
    expect(out).toContain('# Acme: AGENTS.md')
    expect(out).toContain('A shop.')
    expect(out).toContain('- Test: `npm test`')
  })

  it('appends skill urls', () => {
    expect(generate(packs, new Set(['skills-x']), EMPTY_PROJECT)).toContain('- Use the x skill. (https://example.com)')
  })

  it('wraps the cursor format in frontmatter', () => {
    const out = generate(packs, new Set(['fmt-eof']), EMPTY_PROJECT, 'cursor')
    expect(out.startsWith('---\ndescription: ')).toBe(true)
    expect(out).toContain('alwaysApply: true')
  })

  it('counts lines', () => {
    expect(lineCount('a\nb\n')).toBe(2)
  })
})

describe('selection', () => {
  it('replaces other options in the same radio group', () => {
    let selected = toggleRule(packs, new Set(), 'fmt-tabs')
    selected = toggleRule(packs, selected, 'fmt-spaces')
    expect([...selected]).toEqual(['fmt-spaces'])
  })

  it('toggles a rule off', () => {
    const selected = toggleRule(packs, new Set(['fmt-eof']), 'fmt-eof')
    expect(selected.size).toBe(0)
  })

  it('collects recommended ids', () => {
    expect([...recommendedIds(packs)].sort()).toEqual(['fmt-eof', 'fmt-spaces', 'ts-strict'])
  })

  it('round trips scopes through the url hash and drops unknown ids', () => {
    const root = newScope(0, '', { ...EMPTY_PROJECT, name: 'A&B', test: 'npm test' }, applyIds(packs, ['fmt-spaces', 'ts-strict']))
    const web = newScope(1, 'apps/web', EMPTY_PROJECT, applyIds(packs, ['fmt-eof']))
    const hash = encodeWorkbench(packs, [root, web], 'cursor')
    const decoded = decodeWorkbench(packs, `#${hash}&r0=${encodeURIComponent('ghost~x')}`)
    expect(decoded?.format).toBe('cursor')
    expect(decoded?.scopes.map((scope) => scope.path)).toEqual(['', 'apps/web'])
    expect([...decoded!.scopes[0].selected].sort()).toEqual(['fmt-spaces', 'ts-strict'])
    expect([...decoded!.scopes[1].selected]).toEqual(['fmt-eof'])
    expect(decoded?.scopes[0].project.name).toBe('A&B')
    expect(decoded?.scopes[0].project.test).toBe('npm test')
  })

  it('returns null for unknown hashes', () => {
    expect(decodeWorkbench(packs, '#v=1&r=x')).toBeNull()
    expect(decodeWorkbench(packs, '')).toBeNull()
  })
})

describe('scopes', () => {
  const root = newScope(0, '', EMPTY_PROJECT, ['fmt-spaces'])
  const web = newScope(1, 'apps/web', EMPTY_PROJECT, ['ts-strict'])

  it('maps each format to the right file path', () => {
    expect(filePathFor('agents', '')).toBe('AGENTS.md')
    expect(filePathFor('agents', 'apps/web')).toBe('apps/web/AGENTS.md')
    expect(filePathFor('claude', 'apps/web')).toBe('apps/web/CLAUDE.md')
    expect(filePathFor('cursor', 'apps/web')).toBe('.cursor/rules/apps-web.mdc')
    expect(filePathFor('copilot', '')).toBe('.github/copilot-instructions.md')
    expect(filePathFor('copilot', 'apps/web')).toBe('.github/instructions/apps-web.instructions.md')
  })

  it('generates one file per scope and skips empty nested scopes', () => {
    const empty = newScope(2, 'apps/empty')
    const files = generateFiles(packs, [root, web, empty], 'agents')
    expect(files.map((file) => file.path)).toEqual(['AGENTS.md', 'apps/web/AGENTS.md'])
    expect(files[1].content).toContain('# apps/web: AGENTS.md')
    expect(files[1].content).toContain('Applies to files under `apps/web/`')
  })

  it('scopes cursor and copilot rules with globs', () => {
    const cursor = generateFiles(packs, [root, web], 'cursor')
    expect(cursor[0].content).toContain('alwaysApply: true')
    expect(cursor[1].content).toContain('globs: apps/web/**')
    expect(cursor[1].content).toContain('alwaysApply: false')
    const copilot = generateFiles(packs, [root, web], 'copilot')
    expect(copilot[1].content.startsWith('---\napplyTo: "apps/web/**"\n---')).toBe(true)
    expect(copilot[0].content.startsWith('---')).toBe(false)
  })

  it('normalizes and validates folder paths', () => {
    expect(normalizePath('./apps/web/')).toBe('apps/web')
    expect(normalizePath('/services\\api')).toBe('services/api')
    expect(normalizePath('')).toBeNull()
    expect(normalizePath('../etc')).toBeNull()
    expect(normalizePath('a b')).toBeNull()
  })
})

describe('zip', () => {
  it('computes crc32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('writes a structurally valid archive', () => {
    const bytes = createZip([{ path: 'a/AGENTS.md', content: 'hello' }, { path: 'b.md', content: 'world' }], new Date(2026, 0, 2, 3, 4, 6))
    const view = new DataView(bytes.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50)
    expect(view.getUint16(bytes.length - 22 + 10, true)).toBe(2)
    const centralOffset = view.getUint32(bytes.length - 22 + 16, true)
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50)
  })
})
