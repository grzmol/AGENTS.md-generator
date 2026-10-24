import { describe, expect, it } from 'vitest'
import { freshness, monthsBetween, renderReport } from './freshness'
import type { Pack } from './types'

const pack = (id: string, kind: Pack['kind'], reviewed?: string): Pack => ({ id, title: id, kind, order: 1, rules: [], ...(reviewed ? { reviewed } : {}) })
const now = new Date('2026-10-24T00:00:00Z')

describe('freshness', () => {
  it('counts whole months between a review month and now', () => {
    expect(monthsBetween('2026-10', now)).toBe(0)
    expect(monthsBetween('2026-04', now)).toBe(6)
    expect(monthsBetween('2025-10', now)).toBe(12)
    expect(monthsBetween('nope', now)).toBe(Number.POSITIVE_INFINITY)
  })

  it('flags stale reviews and unreviewed technology packs only', () => {
    const report = freshness([pack('a', 'technology', '2026-03'), pack('b', 'technology', '2026-09'), pack('c', 'technology'), pack('d', 'general')], now)
    expect(report.stale.map((item) => item.id)).toEqual(['a'])
    expect(report.unreviewed.map((item) => item.id)).toEqual(['c'])
    expect(report.reviewed).toBe(2)
    expect(report.total).toBe(4)
  })

  it('renders a markdown report with checklists', () => {
    const report = freshness([pack('a', 'technology', '2026-03')], now)
    const text = renderReport(report, [{ pack: 'a', url: 'https://example.com', status: '404' }], now)
    expect(text).toContain('- [ ] `a`')
    expect(text).toContain('https://example.com (404)')
    expect(text).not.toContain('—')
  })
})
