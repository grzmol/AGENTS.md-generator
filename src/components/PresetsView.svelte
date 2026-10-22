<script lang="ts">
  import { presets } from '../lib/content'
  import { workbench as wb } from '../lib/workbench.svelte'

  function apply(id: string) {
    const preset = presets.find((candidate) => candidate.id === id)
    if (!preset) return
    wb.applyPreset(preset)
    wb.mobilePane = 'file'
  }
</script>

<article class="pane">
  <p class="eyebrow">Step one</p>
  <h1 class="pane-title display">Brief your coding agent before it writes a line.</h1>
  <p class="lede">
    AGENTS.md is the file agents read first. Start from a preset, adjust packs on the left, and copy the result.
    Everything runs in your browser.
  </p>

  <h2 class="section-label">Presets</h2>
  <ul class="presets">
    {#each presets as preset (preset.id)}
      <li>
        <button class="preset" onclick={() => apply(preset.id)}>
          <span class="preset-title">{preset.title}</span>
          <span class="preset-text">{preset.description}</span>
          <span class="preset-meta">{preset.rules.length} rules</span>
        </button>
      </li>
    {/each}
  </ul>
  <p class="foot-note">Applying a preset replaces the selection for the file you are editing.</p>
</article>
