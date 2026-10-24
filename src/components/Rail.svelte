<script lang="ts">
  import { packs } from '../lib/content'
  import { familyLabel } from '../lib/labels'
  import { searchPacks } from '../lib/search'
  import { workbench as wb } from '../lib/workbench.svelte'
  import type { Pack } from '../lib/types'

  const general = packs.filter((pack) => pack.kind === 'general')
  const skills = packs.filter((pack) => pack.kind === 'skills')
  const families = [...new Set(packs.filter((pack) => pack.kind === 'technology').map((pack) => pack.family ?? 'other'))]
    .map((family) => ({ family, label: familyLabel(family), packs: packs.filter((pack) => pack.kind === 'technology' && (pack.family ?? 'other') === family) }))
    .sort((a, b) => a.label.localeCompare(b.label))

  let open = $state<Set<string>>(new Set())

  const hits = $derived(searchPacks(packs, wb.query))
  const searching = $derived(wb.query.trim() !== '')
  const hitIds = $derived(new Set(hits.map((hit) => hit.pack.id)))

  function isOpen(family: string): boolean {
    if (searching) return families.find((item) => item.family === family)!.packs.some((pack) => hitIds.has(pack.id))
    if (open.has(family)) return true
    return wb.view.kind === 'pack' && families.find((item) => item.family === family)!.packs.some((pack) => pack.id === (wb.view as { id: string }).id)
  }

  function toggleFamily(family: string) {
    const next = new Set(open)
    if (isOpen(family)) next.delete(family)
    else next.add(family)
    open = next
  }

  function go(view: typeof wb.view) {
    wb.query = ''
    wb.view = view
    wb.mobileDetail = true
  }

  function current(pack: Pack): boolean {
    return !searching && wb.view.kind === 'pack' && wb.view.id === pack.id
  }

  function visible(pack: Pack): boolean {
    return !searching || hitIds.has(pack.id)
  }
</script>

{#snippet packButton(pack: Pack)}
  {#if visible(pack)}
    {@const count = wb.countIn(pack)}
    <li>
      <button class="rail-item" class:current={current(pack)} aria-current={current(pack) ? 'page' : undefined} onclick={() => go({ kind: 'pack', id: pack.id })}>
        <span class="rail-title">{pack.title}</span>
        <span class="rail-count" class:on={count > 0}>{count > 0 ? `${count}/${pack.rules.length}` : pack.rules.length}</span>
      </button>
    </li>
  {/if}
{/snippet}

<nav class="rail" aria-label="Rule packs">
  <div class="rail-search">
    <label class="visually-hidden" for="search">Search rules</label>
    <input id="search" type="search" bind:value={wb.query} placeholder="Search" autocomplete="off" />
  </div>

  {#if !searching}
    <ul class="rail-list rail-primary">
      <li>
        <button class="rail-item" class:current={wb.view.kind === 'scan'} onclick={() => go({ kind: 'scan' })}><span class="rail-title">Scan repository</span></button>
      </li>
      <li>
        <button class="rail-item" class:current={wb.view.kind === 'presets'} onclick={() => go({ kind: 'presets' })}><span class="rail-title">Presets</span></button>
      </li>
      <li>
        <button class="rail-item" class:current={wb.view.kind === 'automation'} onclick={() => go({ kind: 'automation' })}><span class="rail-title">Keep it updated</span></button>
      </li>
      <li>
        <button class="rail-item" class:current={wb.view.kind === 'project'} onclick={() => go({ kind: 'project' })}><span class="rail-title">Project</span></button>
      </li>
    </ul>
  {:else}
    <p class="rail-note">{hits.reduce((sum, hit) => sum + hit.rules.length, 0)} rules in {hits.length} packs</p>
  {/if}

  {#if !searching || general.some(visible)}
    <h2 class="rail-heading"><span>Conventions</span></h2>
    <ul class="rail-list">{#each general as pack (pack.id)}{@render packButton(pack)}{/each}</ul>
  {/if}

  {#each families as group (group.family)}
    {#if !searching || group.packs.some(visible)}
      <h2 class="rail-heading">
        <button class="rail-toggle" aria-expanded={isOpen(group.family)} onclick={() => toggleFamily(group.family)}>
          <span>{group.label}</span>
          <span class="rail-chevron" class:open={isOpen(group.family)} aria-hidden="true"></span>
        </button>
      </h2>
      {#if isOpen(group.family)}
        <ul class="rail-list">{#each group.packs as pack (pack.id)}{@render packButton(pack)}{/each}</ul>
      {/if}
    {/if}
  {/each}

  {#if !searching || skills.some(visible)}
    <h2 class="rail-heading"><span>Skills and tools</span></h2>
    <ul class="rail-list">{#each skills as pack (pack.id)}{@render packButton(pack)}{/each}</ul>
  {/if}
</nav>
