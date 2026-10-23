<script lang="ts">
  import { packs } from '../lib/content'
  import { familyLabel } from '../lib/labels'
  import { workbench as wb } from '../lib/workbench.svelte'
  import RuleRows from './RuleRows.svelte'

  let { id }: { id: string } = $props()

  const pack = $derived(packs.find((candidate) => candidate.id === id) ?? packs[0])
  const count = $derived(wb.countIn(pack))
  const reviewedLabel = $derived(pack.reviewed ? new Date(`${pack.reviewed}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '')
  const kindLabel = $derived(pack.kind === 'technology' ? familyLabel(pack.family ?? '') : pack.kind === 'skills' ? 'Skills' : 'Conventions')
</script>

<article class="pane">
  <button class="back link-button" onclick={() => (wb.mobileDetail = false)}>Packs</button>
  <p class="eyebrow">{kindLabel}</p>
  <h1 class="pane-title">{pack.title}</h1>
  {#if pack.description}<p class="lede">{pack.description}</p>{/if}
  {#if pack.reviewed}<p class="reviewed">Checked against official documentation, {reviewedLabel}.</p>{/if}

  <div class="pane-bar">
    <p class="pane-stat"><strong>{count}</strong> of {pack.rules.length} selected for <span class="mono">{wb.active.path || 'root'}</span></p>
    <div class="pane-actions">
      <button class="link-button" onclick={() => wb.selectRecommended(pack)}>Select recommended</button>
      <button class="link-button" onclick={() => wb.clearPack(pack)}>Clear</button>
    </div>
  </div>

  <RuleRows rules={pack.rules} />

  {#if pack.sources?.length}
    <p class="sources">Sources:
      {#each pack.sources as source, index (source.url + index)}{index > 0 ? ', ' : ' '}<a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>{/each}
    </p>
  {/if}
</article>
