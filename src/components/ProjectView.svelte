<script lang="ts">
  import { workbench as wb } from '../lib/workbench.svelte'

  let pathError = $state('')

  function rename(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value
    pathError = wb.renameScope(wb.active.id, value) ?? ''
  }
</script>

<article class="pane">
  <button class="back link-button" onclick={() => (wb.mobileDetail = false)}>Packs</button>
  <p class="eyebrow">{wb.active.path === '' ? 'Repository root' : wb.active.path}</p>
  <h1 class="pane-title">Project</h1>
  <p class="lede">Context an agent cannot guess. Commands are the most useful lines in any AGENTS.md.</p>

  <form onsubmit={(event) => event.preventDefault()}>
    <h2 class="section-title">About</h2>
    <div class="group form-group">
      {#if wb.active.id !== 'root'}
        <label class="field">
          <span>Folder</span>
          <input class="mono" value={wb.active.path} onchange={rename} spellcheck="false" />
        </label>
        {#if pathError}<p class="field-error pad" role="alert">{pathError}</p>{/if}
      {:else}
        <label class="field">
          <span>Name</span>
          <input bind:value={wb.active.project.name} placeholder="Acme Shop" />
        </label>
      {/if}
      <label class="field top">
        <span>Description</span>
        <textarea rows="3" bind:value={wb.active.project.description} placeholder="One or two sentences on what this does and what stack it uses."></textarea>
      </label>
    </div>

    <h2 class="section-title">Commands</h2>
    <div class="group form-group">
      <label class="field"><span>Install</span><input class="mono" bind:value={wb.active.project.install} placeholder="npm install" spellcheck="false" /></label>
      <label class="field"><span>Dev server</span><input class="mono" bind:value={wb.active.project.dev} placeholder="npm run dev" spellcheck="false" /></label>
      <label class="field"><span>Build</span><input class="mono" bind:value={wb.active.project.build} placeholder="npm run build" spellcheck="false" /></label>
      <label class="field"><span>Test</span><input class="mono" bind:value={wb.active.project.test} placeholder="npm test" spellcheck="false" /></label>
      <label class="field"><span>Lint</span><input class="mono" bind:value={wb.active.project.lint} placeholder="npm run lint" spellcheck="false" /></label>
    </div>
  </form>
</article>
