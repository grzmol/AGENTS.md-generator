<script lang="ts">
  import { workbench as wb } from '../lib/workbench.svelte'

  let pathError = $state('')

  function rename(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value
    pathError = wb.renameScope(wb.active.id, value) ?? ''
  }
</script>

<article class="pane">
  <button class="back text-button" onclick={() => (wb.mobileDetail = false)}>All packs</button>
  <p class="eyebrow">{wb.active.path === '' ? 'Repository root' : wb.active.path}</p>
  <h1 class="pane-title">Project details</h1>
  <p class="lede">Context the agent cannot guess. Commands are the highest value lines in any AGENTS.md.</p>

  <form class="form" onsubmit={(event) => event.preventDefault()}>
    {#if wb.active.id !== 'root'}
      <label>Folder
        <input class="mono" value={wb.active.path} onchange={rename} spellcheck="false" />
        {#if pathError}<span class="field-error" role="alert">{pathError}</span>{/if}
      </label>
    {:else}
      <label>Project name<input bind:value={wb.active.project.name} placeholder="Acme Shop" /></label>
    {/if}
    <label>What it does
      <textarea rows="3" bind:value={wb.active.project.description} placeholder="One or two sentences. Stack, audience, anything that explains the code."></textarea>
    </label>
    <fieldset>
      <legend>Commands</legend>
      <div class="cmd-grid">
        <label>Install<input class="mono" bind:value={wb.active.project.install} placeholder="npm install" spellcheck="false" /></label>
        <label>Dev server<input class="mono" bind:value={wb.active.project.dev} placeholder="npm run dev" spellcheck="false" /></label>
        <label>Build<input class="mono" bind:value={wb.active.project.build} placeholder="npm run build" spellcheck="false" /></label>
        <label>Test<input class="mono" bind:value={wb.active.project.test} placeholder="npm test" spellcheck="false" /></label>
        <label>Lint<input class="mono" bind:value={wb.active.project.lint} placeholder="npm run lint" spellcheck="false" /></label>
      </div>
    </fieldset>
  </form>
</article>
