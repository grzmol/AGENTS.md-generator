<script lang="ts">
  import { FORMATS, LENGTH_WARNING_LINES, estimateTokens, lineCount } from '../lib/generator'
  import { createZip } from '../lib/zip'
  import { workbench as wb } from '../lib/workbench.svelte'

  type Row = { number: number; text: string; kind: 'h1' | 'h2' | 'item' | 'meta' | 'plain' | 'blank' }

  let status = $state('')
  let timer: ReturnType<typeof setTimeout> | undefined

  const content = $derived(wb.activeContent)
  const lines = $derived(lineCount(content))
  const tokens = $derived(estimateTokens(content))
  const over = $derived(lines > LENGTH_WARNING_LINES)
  const gauge = $derived(Math.min(100, Math.round((lines / LENGTH_WARNING_LINES) * 100)))

  const rows = $derived.by<Row[]>(() => {
    let inFrontmatter = false
    return content
      .trimEnd()
      .split('\n')
      .map((text, index) => {
        let kind: Row['kind'] = 'plain'
        if (text === '---') {
          inFrontmatter = index === 0 ? true : false
          kind = 'meta'
        } else if (inFrontmatter) kind = 'meta'
        else if (text.startsWith('## ')) kind = 'h2'
        else if (text.startsWith('# ')) kind = 'h1'
        else if (text.startsWith('- ')) kind = 'item'
        else if (text === '') kind = 'blank'
        return { number: index + 1, text, kind }
      })
  })

  const hint = $derived(
    wb.format === 'cursor'
      ? 'Cursor reads project rules from .cursor/rules.'
      : wb.format === 'copilot'
        ? 'GitHub Copilot reads repository instructions from .github.'
        : wb.format === 'claude'
          ? 'Claude Code reads AGENTS.md when no CLAUDE.md exists above the working directory. To keep one shared file next to a CLAUDE.md, import it with @AGENTS.md.'
          : 'Place it at this path in your repository.'
  )

  function flash(message: string) {
    status = message
    clearTimeout(timer)
    timer = setTimeout(() => (status = ''), 2200)
  }

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text)
      flash(message)
    } catch {
      flash('Copy blocked by the browser. Select the text instead.')
    }
  }

  function save(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }

  function downloadFile() {
    const name = wb.activePath.split('/').pop() ?? 'AGENTS.md'
    save(new Blob([content], { type: 'text/markdown;charset=utf-8' }), name)
    flash(`Saved ${name}`)
  }

  function downloadZip() {
    const bytes = createZip(wb.files)
    save(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' }), 'agent-instructions.zip')
    flash(`Saved ${wb.files.length} files`)
  }
</script>

<section class="preview" aria-label="Generated file">
  <div class="format-tabs" role="tablist" aria-label="Output format">
    {#each FORMATS as item (item.id)}
      <button role="tab" aria-selected={wb.format === item.id} class:active={wb.format === item.id} onclick={() => (wb.format = item.id)}>{item.label}</button>
    {/each}
  </div>

  <div class="file">
    <div class="file-head">
      <span class="file-path mono">{wb.activePath}</span>
      <span class="file-stat">{lines} lines · ~{tokens.toLocaleString('en-US')} tokens</span>
    </div>
    <div class="gauge" class:over aria-hidden="true"><span style:width="{gauge}%"></span></div>
    <div class="paper" tabindex="0" role="textbox" aria-readonly="true" aria-multiline="true" aria-label="Preview of {wb.activePath}">
      {#each rows as row (row.number)}
        <div class="ln {row.kind}"><span class="num" aria-hidden="true">{row.number}</span><span class="txt">{row.text === '' ? ' ' : row.text}</span></div>
      {/each}
    </div>
    {#if over}<p class="warn">Anthropic suggests keeping instruction files under {LENGTH_WARNING_LINES} lines; longer files reduce adherence. Trim to what a new teammate needs on day one.</p>{/if}
  </div>

  <div class="preview-actions">
    <button class="solid" onclick={() => copy(content, 'Copied to clipboard')}>Copy file</button>
    <button class="outline" onclick={downloadFile}>Download</button>
    {#if wb.files.length > 1}<button class="outline" onclick={downloadZip}>All {wb.files.length} files (.zip)</button>{/if}
    <button class="text-button" onclick={() => copy(location.href, 'Link copied')}>Copy share link</button>
  </div>
  <p class="status" aria-live="polite">{status}</p>
  <p class="hint">{hint}</p>
  {#if wb.scopes.length > 1}
    <ul class="file-list">
      {#each wb.files as file (file.path)}<li class="mono">{file.path}</li>{/each}
    </ul>
    <p class="hint">Nested files add to the root one for their folder. Check whether your agent merges them or reads only the closest.</p>
  {/if}
</section>
