import { describe, expect, it } from 'vitest'
import { packs, presets } from './content'

const allRules = packs.flatMap((pack) => pack.rules.map((rule) => ({ pack, rule })))

describe('content', () => {
  it('has unique rule ids prefixed by their pack', () => {
    const seen = new Set<string>()
    for (const { pack, rule } of allRules) {
      expect(rule.id.startsWith(`${pack.id}-`)).toBe(true)
      expect(seen.has(rule.id)).toBe(false)
      seen.add(rule.id)
    }
  })

  it('has unique pack ids and orders', () => {
    expect(new Set(packs.map((pack) => pack.id)).size).toBe(packs.length)
    expect(new Set(packs.map((pack) => pack.order)).size).toBe(packs.length)
  })

  it('keeps rule text to a single concise line without em dashes', () => {
    for (const { rule } of allRules) {
      expect(rule.text.trim()).toBe(rule.text)
      expect(rule.text).not.toContain('\n')
      expect(rule.text.length).toBeLessThanOrEqual(220)
      expect(rule.text).not.toContain('—')
      expect(rule.title).not.toContain('—')
    }
  })

  it('has at least two options in every radio group and at most one recommended', () => {
    for (const pack of packs) {
      const groups = new Map<string, typeof pack.rules>()
      for (const rule of pack.rules) {
        if (!rule.group) continue
        groups.set(rule.group, [...(groups.get(rule.group) ?? []), rule])
      }
      for (const rules of groups.values()) {
        expect(rules.length).toBeGreaterThanOrEqual(2)
        expect(rules.filter((rule) => rule.recommended).length).toBeLessThanOrEqual(1)
      }
    }
  })

  it('has presets that reference existing rules and respect radio groups', () => {
    const ids = new Map(allRules.map(({ rule }) => [rule.id, rule]))
    for (const preset of presets) {
      const groups = new Set<string>()
      for (const id of preset.rules) {
        const rule = ids.get(id)
        expect(rule, `${preset.id} -> ${id}`).toBeDefined()
        if (rule?.group) {
          expect(groups.has(rule.group), `${preset.id} duplicate group ${rule.group}`).toBe(false)
          groups.add(rule.group)
        }
      }
    }
  })
})
