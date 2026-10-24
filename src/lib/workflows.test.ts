import { describe, expect, it } from 'vitest'
import { ACTION_REF, checkWorkflow, configSnippet, updateWorkflow } from './workflows'

describe('workflow templates', () => {
  it('builds an update workflow with schedule, permissions and the action', () => {
    const text = updateWorkflow({ adopt: false, weekday: 1 })
    expect(text).toContain('cron: "17 6 * * 1"')
    expect(text).toContain('pull-requests: write')
    expect(text).toContain(`uses: ${ACTION_REF}`)
    expect(text).not.toContain('adopt')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('adds the adopt input on request', () => {
    expect(updateWorkflow({ adopt: true, weekday: 3 })).toContain('adopt: "true"')
  })

  it('builds a read only check workflow', () => {
    const text = checkWorkflow()
    expect(text).toContain('mode: check')
    expect(text).toContain('contents: read')
    expect(text).not.toContain('pull-requests: write')
  })

  it('uses spaces only and a parseable config example', () => {
    for (const text of [updateWorkflow({ adopt: true, weekday: 1 }), checkWorkflow()]) expect(text).not.toContain('\t')
    expect(JSON.parse(configSnippet())).toHaveProperty('exclude')
  })
})
