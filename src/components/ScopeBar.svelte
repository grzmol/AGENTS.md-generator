<script lang="ts">
  import { presets } from '../lib/content'
  import { workbench as wb } from '../lib/workbench.svelte'

  let adding = $state(false)
  let path = $state('')
  let presetId = $state('')
  let error = $state('')

  function submit(event: SubmitEvent) {
    event.preventDefault()
    const preset = presets.find((candidate) => candidate.id === presetId)
    const result = wb.addScope(path, preset)
    if (result) {
      error = result
      return
    }
    path = ''
    presetId = ''
    error = ''
    adding = false
    wb.view = { kind: 'pack', id: 'agent-behavior' }
  }

  function cancel() {
    adding = false
    error = ''
    path = ''
  }
</script>

<div class="scopes">
  <div class="segmented scroll" role="tablist" aria-label="Files in this repository">
    {#each wb.scopes as scope (scope.id)}
      <button role="tab" aria-selected={wb.activeId === scope.id} onclick={() => (wb.activeId = scope.id)}>
        <span>{scope.path === '' ? 'Root' : scope.path}</span>
        <span class="seg-count">{scope.selected.size}</span>
      </button>
    {/each}
  </div>
  <button class="icon-button" aria-label="Add a folder for a monorepo" aria-expanded={adding} title="Add a folder for a monorepo" onclick={() => (adding = !adding)}>
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
  </button>
  {#if wb.activeId !== 'root'}
    <button class="link-button danger" onclick={() => wb.removeScope(wb.activeId)}>Remove folder</button>
  {/if}

  {#if adding}
    <form class="popover" onsubmit={submit}>
      <p class="popover-title">New folder file</p>
      <p class="popover-text">Adds a nested AGENTS.md for one folder of a monorepo. Agents read the closest file to the code they edit.</p>
      <label class="visually-hidden" for="scope-path">Folder path</label>
      <input id="scope-path" bind:value={path} placeholder="apps/web" autocomplete="off" spellcheck="false" />
      <label class="visually-hidden" for="scope-preset">Start from</label>
      <select id="scope-preset" bind:value={presetId}>
        <option value="">Start empty</option>
        {#each presets as preset (preset.id)}
          <option value={preset.id}>{preset.title}</option>
        {/each}
      </select>
      {#if error}<p class="field-error" role="alert">{error}</p>{/if}
      <div class="popover-actions">
        <button class="pill gray" type="button" onclick={cancel}>Cancel</button>
        <button class="pill blue" type="submit">Add file</button>
      </div>
    </form>
  {/if}
</div>
