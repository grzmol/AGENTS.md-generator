import { describe, expect, it } from 'vitest'
import seo from '../../content/seo.json'

describe('seo content', () => {
  it('keeps the primary keyword in the title, description and heading', () => {
    expect(seo.site.title.toLowerCase()).toContain('agents.md generator')
    expect(seo.site.description.toLowerCase()).toContain('agents.md generator')
    expect(seo.hero.h1.toLowerCase()).toContain('agents.md generator')
  })

  it('keeps titles and descriptions within search result limits', () => {
    expect(seo.site.title.length).toBeLessThanOrEqual(62)
    expect(seo.site.description.length).toBeLessThanOrEqual(160)
    for (const guide of seo.guides) {
      expect(guide.title.length).toBeLessThanOrEqual(75)
      expect(guide.description.length).toBeLessThanOrEqual(170)
    }
  })

  it('has unique guide slugs and a complete faq', () => {
    expect(new Set(seo.guides.map((guide) => guide.slug)).size).toBe(seo.guides.length)
    expect(seo.faq.length).toBeGreaterThanOrEqual(5)
    for (const item of seo.faq) {
      expect(item.q.endsWith('?')).toBe(true)
      expect(item.a.length).toBeGreaterThan(40)
    }
  })

  it('avoids em dashes', () => {
    expect(JSON.stringify(seo)).not.toContain('—')
  })
})
