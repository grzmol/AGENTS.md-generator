import { describe, expect, it } from 'vitest'
import { END, START, mergeManaged, splitTitle } from './managed'

const generated = '# shop: AGENTS.md\n\n## Commands\n\n- Test: `npm test`\n'

describe('managed blocks', () => {
  it('splits the title from the body', () => {
    expect(splitTitle(generated)).toEqual({ title: '# shop: AGENTS.md', body: '## Commands\n\n- Test: `npm test`' })
    expect(splitTitle('no title').title).toBe('')
  })

  it('creates a new file with a marked block', () => {
    const result = mergeManaged(null, generated)
    expect(result.status).toBe('created')
    expect(result.content.startsWith('# shop: AGENTS.md\n\n' + START)).toBe(true)
    expect(result.content.trimEnd().endsWith(END)).toBe(true)
  })

  it('replaces only the managed block and keeps hand-written text', () => {
    const existing = `# Notes\n\nKeep this.\n\n${START}\nold\n${END}\n\nAlso keep this.\n`
    const result = mergeManaged(existing, generated)
    expect(result.status).toBe('updated')
    expect(result.content).toContain('Keep this.')
    expect(result.content).toContain('Also keep this.')
    expect(result.content).toContain('- Test: `npm test`')
    expect(result.content).not.toContain('\nold\n')
  })

  it('reports unchanged when the block is already current', () => {
    const first = mergeManaged(null, generated).content
    expect(mergeManaged(first, generated).status).toBe('unchanged')
  })

  it('leaves unmanaged files alone unless asked to adopt', () => {
    const existing = '# Mine\n\nHand written.\n'
    expect(mergeManaged(existing, generated)).toEqual({ content: existing, status: 'unmanaged' })
    const adopted = mergeManaged(existing, generated, true)
    expect(adopted.status).toBe('adopted')
    expect(adopted.content.startsWith('# Mine')).toBe(true)
    expect(adopted.content).toContain(START)
  })
})
