<script lang="ts">
  import Masthead from './components/Masthead.svelte'
  import PackView from './components/PackView.svelte'
  import Preview from './components/Preview.svelte'
  import PresetsView from './components/PresetsView.svelte'
  import ProjectView from './components/ProjectView.svelte'
  import Rail from './components/Rail.svelte'
  import ScopeBar from './components/ScopeBar.svelte'
  import SearchView from './components/SearchView.svelte'
  import { workbench as wb } from './lib/workbench.svelte'

  $effect(() => {
    history.replaceState(null, '', `#${wb.hash()}`)
  })

  const searching = $derived(wb.query.trim() !== '')
</script>

<div class="shell" data-pane={wb.mobilePane} data-detail={wb.mobileDetail}>
  <Masthead>
    {#snippet center()}<ScopeBar />{/snippet}
  </Masthead>

  <div class="workbench">
    <aside class="col-rail"><Rail /></aside>

    <main class="col-main">
      {#key `${wb.activeId}-${searching ? 'search' : wb.view.kind === 'pack' ? wb.view.id : wb.view.kind}`}
        <div class="enter">
          {#if searching}
            <SearchView />
          {:else if wb.view.kind === 'pack'}
            <PackView id={wb.view.id} />
          {:else if wb.view.kind === 'project'}
            <ProjectView />
          {:else}
            <PresetsView />
          {/if}
        </div>
      {/key}
    </main>

    <aside class="col-preview"><Preview /></aside>
  </div>

  <nav class="mobile-bar" aria-label="View">
    <button class:active={wb.mobilePane === 'build'} onclick={() => (wb.mobilePane = 'build')}>Build</button>
    <button class:active={wb.mobilePane === 'file'} onclick={() => (wb.mobilePane = 'file')}>File<span class="tab-count">{wb.active.selected.size}</span></button>
  </nav>
</div>
