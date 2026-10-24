export const START = '<!-- agents-md-generator:start -->'
export const END = '<!-- agents-md-generator:end -->'

export type MergeStatus = 'created' | 'updated' | 'unchanged' | 'unmanaged' | 'adopted'

export function splitTitle(generated: string): { title: string; body: string } {
  const lines = generated.trimEnd().split('\n')
  if (lines[0]?.startsWith('# ')) {
    const rest = lines.slice(1)
    while (rest[0] === '') rest.shift()
    return { title: lines[0], body: rest.join('\n') }
  }
  return { title: '', body: lines.join('\n') }
}

export function wrapManaged(body: string): string {
  return `${START}\n${body.trim()}\n${END}`
}

export function mergeManaged(existing: string | null, generated: string, adopt = false): { content: string; status: MergeStatus } {
  const { title, body } = splitTitle(generated)
  const block = wrapManaged(body)
  if (existing === null) return { content: `${title}\n\n${block}\n`, status: 'created' }
  const start = existing.indexOf(START)
  const end = existing.indexOf(END)
  if (start >= 0 && end > start) {
    const content = `${existing.slice(0, start)}${block}${existing.slice(end + END.length)}`
    return { content, status: content === existing ? 'unchanged' : 'updated' }
  }
  if (!adopt) return { content: existing, status: 'unmanaged' }
  return { content: `${existing.trimEnd()}\n\n${block}\n`, status: 'adopted' }
}
