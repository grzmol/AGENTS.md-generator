<script lang="ts">
  import { packs } from '../lib/content'

  type Theme = 'auto' | 'light' | 'dark'
  const totalRules = packs.reduce((sum, pack) => sum + pack.rules.length, 0)

  function readTheme(): Theme {
    try {
      const stored = localStorage.getItem('theme')
      return stored === 'light' || stored === 'dark' ? stored : 'auto'
    } catch {
      return 'auto'
    }
  }

  let theme = $state<Theme>(readTheme())

  $effect(() => {
    const root = document.documentElement
    if (theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      if (theme === 'auto') localStorage.removeItem('theme')
      else localStorage.setItem('theme', theme)
    } catch {
      return
    }
  })

  function cycle() {
    theme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
  }
</script>

<header class="masthead">
  <a class="wordmark" href="./" aria-label="AGENTS.md generator">
    <span class="wordmark-name">AGENTS<span class="wordmark-dot">.</span>md</span>
    <span class="wordmark-sub">generator</span>
  </a>
  <p class="masthead-meta">{totalRules} rules in {packs.length} packs</p>
  <nav class="masthead-actions" aria-label="Site">
    <a href="https://agents.md" target="_blank" rel="noreferrer">Spec</a>
    <a href="https://github.com/grzmol/AGENTS.md-generator" target="_blank" rel="noreferrer">Source</a>
    <button class="text-button" onclick={cycle} aria-label="Switch color theme, currently {theme}">Theme: {theme}</button>
  </nav>
</header>
