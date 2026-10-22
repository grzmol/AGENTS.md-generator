<script lang="ts">
  import { packs } from '../lib/content'
  import { searchPacks } from '../lib/search'
  import { workbench as wb } from '../lib/workbench.svelte'
  import RuleRows from './RuleRows.svelte'

  const hits = $derived(searchPacks(packs, wb.query))
  const total = $derived(hits.reduce((sum, hit) => sum + hit.rules.length, 0))
</script>

<article class="pane">
  <button class="back text-button" onclick={() => (wb.mobileDetail = false)}>All packs</button>
  <p class="eyebrow">Search</p>
  <h1 class="pane-title">“{wb.query.trim()}”</h1>
  <p class="lede">{total} {total === 1 ? 'rule' : 'rules'} across {hits.length} {hits.length === 1 ? 'pack' : 'packs'}.</p>

  {#each hits as hit (hit.pack.id)}
    <section class="hit">
      <h2 class="hit-title">{hit.pack.title}</h2>
      <RuleRows rules={hit.rules} />
    </section>
  {:else}
    <p class="empty">Nothing matches. Try a technology name or a topic such as “logging”.</p>
  {/each}
</article>
