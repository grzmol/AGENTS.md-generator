import type { Pack, Rule } from './types'

export interface SearchHit {
  pack: Pack
  rules: Rule[]
}

export function searchPacks(packs: Pack[], query: string): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  const hits: SearchHit[] = []
  for (const pack of packs) {
    const packText = `${pack.title} ${pack.family ?? ''}`.toLowerCase()
    const rules = pack.rules.filter((rule) => {
      const haystack = `${packText} ${rule.title} ${rule.text}`.toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
    if (rules.length > 0) hits.push({ pack, rules })
  }
  return hits
}
