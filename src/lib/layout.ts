import type { Rule } from './types'

export type RuleItem = { kind: 'rule'; rule: Rule } | { kind: 'group'; id: string; rules: Rule[] }

export function layoutRules(rules: Rule[]): RuleItem[] {
  const items: RuleItem[] = []
  const groups = new Map<string, Extract<RuleItem, { kind: 'group' }>>()
  for (const rule of rules) {
    if (!rule.group) {
      items.push({ kind: 'rule', rule })
      continue
    }
    let group = groups.get(rule.group)
    if (!group) {
      group = { kind: 'group', id: rule.group, rules: [] }
      groups.set(rule.group, group)
      items.push(group)
    }
    group.rules.push(rule)
  }
  return items
}
