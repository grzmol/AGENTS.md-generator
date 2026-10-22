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

<div class="scopebar">
  <div class="scope-tabs" role="tablist" aria-label="Files in this repository">
    {#each wb.scopes as scope (scope.id)}
      <div class="scope-tab" class:active={wb.activeId === scope.id}>
        <button role="tab" aria-selected={wb.activeId === scope.id} onclick={() => (wb.activeId = scope.id)}>
          <span class="scope-path">{scope.path === '' ? 'Repository root' : scope.path}</span>
          <span class="scope-count">{scope.selected.size}</span>
        </button>
        {#if scope.id !== 'root'}
          <button class="scope-remove" aria-label="Remove {scope.path}" onclick={() => wb.removeScope(scope.id)}>Remove</button>
        {/if}
      </div>
    {/each}
  </div>

  {#if adding}
    <form class="scope-form" onsubmit={submit}>
      <label class="visually-hidden" for="scope-path">Folder path</label>
      <input id="scope-path" bind:value={path} placeholder="apps/web" autocomplete="off" spellcheck="false" />
      <label class="visually-hidden" for="scope-preset">Start from</label>
      <select id="scope-preset" bind:value={presetId}>
        <option value="">Empty</option>
        {#each presets as preset (preset.id)}
          <option value={preset.id}>{preset.title}</option>
        {/each}
      </select>
      <button class="solid small" type="submit">Add file</button>
      <button class="text-button" type="button" onclick={cancel}>Cancel</button>
      {#if error}<span class="field-error" role="alert">{error}</span>{/if}
    </form>
  {:else}
    <button class="text-button add-scope" onclick={() => (adding = true)}>
      Add a folder for a monorepo
    </button>
  {/if}
</div>
