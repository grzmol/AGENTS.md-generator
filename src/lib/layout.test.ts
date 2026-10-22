import { describe, expect, it } from 'vitest'
import { groupLabel } from './labels'
import { layoutRules } from './layout'
import { searchPacks } from './search'
import type { Pack } from './types'

describe('layoutRules', () => {
  it('collects grouped rules at the position of their first member', () => {
    const items = layoutRules([
      { id: 'a', title: 'A', text: 'a' },
      { id: 'b', title: 'B', text: 'b', group: 'g' },
      { id: 'c', title: 'C', text: 'c' },
      { id: 'd', title: 'D', text: 'd', group: 'g' }
    ])
    expect(items.map((item) => item.kind)).toEqual(['rule', 'group', 'rule'])
    const group = items[1]
    expect(group.kind === 'group' && group.rules.map((rule) => rule.id)).toEqual(['b', 'd'])
  })
})

describe('groupLabel', () => {
  it('humanizes group ids', () => {
    expect(groupLabel('indent')).toBe('Indentation')
    expect(groupLabel('some-group')).toBe('Some group')
    expect(groupLabel('log-format')).toBe('Log format')
  })
})

describe('searchPacks', () => {
  const packs: Pack[] = [
    { id: 'git', title: 'Git', kind: 'general', order: 1, rules: [{ id: 'git-a', title: 'Conventional Commits', text: 'Write commit messages.' }] },
    { id: 'ts', title: 'TypeScript', kind: 'technology', order: 2, rules: [{ id: 'ts-a', title: 'Strict', text: 'Enable strict mode.' }] }
  ]

  it('matches all terms across pack and rule text', () => {
    expect(searchPacks(packs, 'commit git').map((hit) => hit.pack.id)).toEqual(['git'])
    expect(searchPacks(packs, 'typescript strict')[0].rules).toHaveLength(1)
  })

  it('returns nothing for empty or unmatched queries', () => {
    expect(searchPacks(packs, '  ')).toEqual([])
    expect(searchPacks(packs, 'zzz')).toEqual([])
  })
})
