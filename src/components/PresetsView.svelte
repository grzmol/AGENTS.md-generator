<script lang="ts">
  import { packs, presets } from '../lib/content'
  import { workbench as wb } from '../lib/workbench.svelte'

  const totalRules = packs.reduce((sum, pack) => sum + pack.rules.length, 0)

  function apply(id: string) {
    const preset = presets.find((candidate) => candidate.id === id)
    if (!preset) return
    wb.applyPreset(preset)
    wb.mobilePane = 'file'
  }
</script>

<article class="pane wide">
  <p class="eyebrow">{totalRules} rules in {packs.length} packs</p>
  <h1 class="hero">Brief your coding agent before it writes a line.</h1>
  <p class="hero-sub">
    AGENTS.md is the file coding agents read first. Start from a preset, fine tune it pack by pack, then copy the result.
    Everything runs in your browser.
  </p>

  <h2 class="section-title">Presets</h2>
  <ul class="preset-grid">
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
  <p class="foot-note">Choosing a preset replaces the selection for the file you are editing.</p>
</article>
