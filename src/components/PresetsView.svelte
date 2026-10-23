<script lang="ts">
  import seo from '../../content/seo.json'
  import { packs, presets } from '../lib/content'
  import { workbench as wb } from '../lib/workbench.svelte'

  const totalRules = packs.reduce((sum, pack) => sum + pack.rules.length, 0)
  const fill = (text: string) => text.replace('{rules}', String(totalRules)).replace('{packs}', String(packs.length)).replace('{presets}', String(presets.length))

  function apply(id: string) {
    const preset = presets.find((candidate) => candidate.id === id)
    if (!preset) return
    wb.applyPreset(preset)
    wb.mobilePane = 'file'
  }
</script>

<article class="pane wide">
  <p class="eyebrow">{totalRules} rules in {packs.length} packs</p>
  <h1 class="hero">{seo.hero.h1}</h1>
  <p class="hero-sub">{seo.hero.lead}</p>

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

  <h2 class="section-title">What you get</h2>
  <ul class="group about">
    {#each seo.features as feature (feature)}
      <li class="about-row">{fill(feature)}</li>
    {/each}
  </ul>

  <h2 class="section-title">Guides and templates</h2>
  <ul class="link-list">
    {#each seo.guides as guide (guide.slug)}
      <li><a href={`./guides/${guide.slug}/`}>{guide.h1}</a></li>
    {/each}
    <li><a href="./templates/">AGENTS.md templates by stack</a></li>
  </ul>

  <h2 class="section-title">Questions</h2>
  <div class="faq">
    {#each seo.faq as item (item.q)}
      <details>
        <summary>{item.q}</summary>
        <p>{item.a}</p>
      </details>
    {/each}
  </div>
</article>
