<script lang="ts">
  import { packs, presets } from './lib/content'
  import { EMPTY_PROJECT, FORMATS, LENGTH_WARNING_LINES, estimateTokens, generate, lineCount } from './lib/generator'
  import { applyIds, applyPreset, decodeState, encodeState, recommendedIds, toggleRule } from './lib/selection'
  import type { ExportFormat, Pack, PackKind, ProjectInfo } from './lib/types'

  const initial = decodeState(packs, typeof location === 'undefined' ? '' : location.hash)
  const hasSavedState = typeof location !== 'undefined' && location.hash.includes('v=1')

  let selected = $state<Set<string>>(
    hasSavedState ? new Set(initial.selected) : recommendedIds(packs, (pack) => pack.kind === 'general')
  )
  let project = $state<ProjectInfo>(hasSavedState ? initial.project : { ...EMPTY_PROJECT })
  let format = $state<ExportFormat>('agents')
  let query = $state('')
  let kindFilter = $state<PackKind | 'all'>('all')
  let family = $state('')
  let status = $state('')
  let mobileTab = $state<'build' | 'preview'>('build')

  const kinds: Array<{ id: PackKind | 'all'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'general', label: 'General' },
    { id: 'technology', label: 'Technologies' },
    { id: 'skills', label: 'Skills' }
  ]

  const families = [...new Set(packs.map((pack) => pack.family).filter((value): value is string => !!value))].sort()
  const totalRules = packs.reduce((sum, pack) => sum + pack.rules.length, 0)

  const output = $derived(generate(packs, selected, project, format))
  const lines = $derived(lineCount(output))
  const tokens = $derived(estimateTokens(output))
  const spec = $derived(FORMATS.find((candidate) => candidate.id === format)!)

  const visiblePacks = $derived(
    packs
      .filter((pack) => kindFilter === 'all' || pack.kind === kindFilter)
      .filter((pack) => !family || pack.kind !== 'technology' || pack.family === family)
      .map((pack) => {
        const needle = query.trim().toLowerCase()
        if (!needle) return pack
        const titleMatch = pack.title.toLowerCase().includes(needle)
        const rules = pack.rules.filter(
          (rule) => titleMatch || rule.title.toLowerCase().includes(needle) || rule.text.toLowerCase().includes(needle)
        )
        return { ...pack, rules }
      })
      .filter((pack) => pack.rules.length > 0)
  )

  $effect(() => {
    const hash = encodeState(packs, selected, project)
    history.replaceState(null, '', `#${hash}`)
  })

  function flash(message: string) {
    status = message
    setTimeout(() => {
      if (status === message) status = ''
    }, 2000)
  }

  function toggle(id: string) {
    selected = toggleRule(packs, selected, id)
  }

  function countIn(pack: Pack): number {
    return pack.rules.filter((rule) => selected.has(rule.id)).length
  }

  function selectRecommended(pack: Pack) {
    const next = new Set(selected)
    for (const rule of pack.rules) next.delete(rule.id)
    selected = applyIds(
      packs,
      pack.rules.filter((rule) => rule.recommended).map((rule) => rule.id),
      next
    )
  }

  function clearPack(pack: Pack) {
    const next = new Set(selected)
    for (const rule of pack.rules) next.delete(rule.id)
    selected = next
  }

  function onPreset(event: Event) {
    const id = (event.currentTarget as HTMLSelectElement).value
    const preset = presets.find((candidate) => candidate.id === id)
    if (preset) selected = applyPreset(packs, preset)
    ;(event.currentTarget as HTMLSelectElement).value = ''
  }

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text)
      flash(message)
    } catch {
      flash('Copy failed, select the text manually')
    }
  }

  function download() {
    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = spec.filename
    link.click()
    URL.revokeObjectURL(url)
    flash(`Downloaded ${spec.filename}`)
  }
</script>

<header class="top">
  <div class="wrap top-inner">
    <div>
      <h1>AGENTS.md Generator</h1>
      <p class="muted">Pick conventions and skills, get a ready-to-commit instruction file for AI coding agents. {totalRules} rules in {packs.length} packs.</p>
    </div>
    <nav class="tabs mobile-only" aria-label="View">
      <button class:active={mobileTab === 'build'} onclick={() => (mobileTab = 'build')}>Build</button>
      <button class:active={mobileTab === 'preview'} onclick={() => (mobileTab = 'preview')}>Preview ({selected.size})</button>
    </nav>
  </div>
</header>

<main class="wrap layout">
  <section class="builder" class:hidden-mobile={mobileTab !== 'build'} aria-label="Rule picker">
    <div class="card">
      <h2>Project</h2>
      <div class="grid2">
        <label>Name<input bind:value={project.name} placeholder="Acme Shop" /></label>
        <label>Start from a preset
          <select onchange={onPreset}>
            <option value="">Choose a preset…</option>
            {#each presets as preset (preset.id)}
              <option value={preset.id}>{preset.title}</option>
            {/each}
          </select>
        </label>
      </div>
      <label>Description<textarea rows="2" bind:value={project.description} placeholder="One or two sentences about what this project does"></textarea></label>
      <div class="grid3">
        <label>Install<input bind:value={project.install} placeholder="npm install" /></label>
        <label>Dev<input bind:value={project.dev} placeholder="npm run dev" /></label>
        <label>Build<input bind:value={project.build} placeholder="npm run build" /></label>
        <label>Test<input bind:value={project.test} placeholder="npm test" /></label>
        <label>Lint<input bind:value={project.lint} placeholder="npm run lint" /></label>
      </div>
    </div>

    <div class="toolbar">
      <input type="search" bind:value={query} placeholder="Search rules" aria-label="Search rules" />
      <select bind:value={family} aria-label="Technology family">
        <option value="">All technology families</option>
        {#each families as item (item)}
          <option value={item}>{item}</option>
        {/each}
      </select>
      <div class="chips" role="group" aria-label="Filter by type">
        {#each kinds as kind (kind.id)}
          <button class="chip" class:active={kindFilter === kind.id} aria-pressed={kindFilter === kind.id} onclick={() => (kindFilter = kind.id)}>{kind.label}</button>
        {/each}
      </div>
      <div class="actions">
        <button onclick={() => (selected = recommendedIds(packs))}>All recommended</button>
        <button onclick={() => (selected = new Set())}>Clear all</button>
      </div>
    </div>

    {#each visiblePacks as pack (pack.id)}
      {@const full = packs.find((candidate) => candidate.id === pack.id)!}
      <details class="card pack" open={query.trim() !== '' || pack.kind === 'general'}>
        <summary>
          <span class="pack-title">{pack.title}</span>
          <span class="badge" class:badge-on={countIn(full) > 0}>{countIn(full)}/{full.rules.length}</span>
        </summary>
        {#if pack.description}<p class="muted small">{pack.description}</p>{/if}
        <div class="pack-actions">
          <button class="link" onclick={() => selectRecommended(full)}>Recommended</button>
          <button class="link" onclick={() => clearPack(full)}>Clear</button>
        </div>
        <ul class="rules">
          {#each pack.rules as rule (rule.id)}
            <li>
              <label class="rule">
                <input
                  type={rule.group ? 'radio' : 'checkbox'}
                  name={rule.group ? `${pack.id}-${rule.group}` : undefined}
                  checked={selected.has(rule.id)}
                  onclick={() => toggle(rule.id)}
                  onkeydown={(event) => {
                    if (rule.group && event.key === ' ') {
                      event.preventDefault()
                      toggle(rule.id)
                    }
                  }}
                />
                <span>
                  <strong>{rule.title}</strong>
                  {#if rule.recommended}<span class="tag">recommended</span>{/if}
                  <span class="muted small block">{rule.text}</span>
                </span>
              </label>
            </li>
          {/each}
        </ul>
        {#if pack.sources?.length}
          <p class="small muted">Sources:
            {#each pack.sources as source, index (source.url)}{index > 0 ? ', ' : ' '}<a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>{/each}
          </p>
        {/if}
      </details>
    {:else}
      <p class="muted">No rules match your search.</p>
    {/each}
  </section>

  <aside class="preview" class:hidden-mobile={mobileTab !== 'preview'} aria-label="Generated file">
    <div class="card sticky">
      <div class="chips" role="tablist" aria-label="Export format">
        {#each FORMATS as item (item.id)}
          <button class="chip" role="tab" aria-selected={format === item.id} class:active={format === item.id} onclick={() => (format = item.id)}>{item.label}</button>
        {/each}
      </div>
      <p class="small muted">
        {selected.size} rules, {lines} lines, ~{tokens} tokens
        {#if lines > LENGTH_WARNING_LINES}<span class="warn">Long files dilute agent attention, consider trimming.</span>{/if}
      </p>
      <textarea class="output" readonly value={output} aria-label="Generated file contents"></textarea>
      <div class="actions">
        <button class="primary" onclick={() => copyText(output, 'Copied to clipboard')}>Copy</button>
        <button onclick={download}>Download {spec.filename}</button>
        <button onclick={() => copyText(location.href, 'Share link copied')}>Share link</button>
      </div>
      <p class="small muted" aria-live="polite">{status}&nbsp;</p>
      <p class="small muted">
        {#if format === 'cursor'}Save as <code>.cursor/rules/agents.mdc</code>.
        {:else if format === 'copilot'}Save as <code>.github/copilot-instructions.md</code>.
        {:else if format === 'claude'}Save in the repo root as <code>CLAUDE.md</code>, or keep AGENTS.md and import it from CLAUDE.md.
        {:else}Save in the repo root as <code>AGENTS.md</code>.{/if}
      </p>
    </div>
  </aside>
</main>

<footer class="wrap muted small foot">
  Everything runs in your browser; nothing is uploaded. Rule texts are original and released under CC0, code under MIT.
</footer>
