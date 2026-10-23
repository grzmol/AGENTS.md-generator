<script lang="ts">
  import type { Snippet } from 'svelte'

  type Theme = 'auto' | 'light' | 'dark'

  let { center }: { center?: Snippet } = $props()

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

  const labels: Record<Theme, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' }

  function cycle() {
    theme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
  }
</script>

<header class="toolbar">
  <a class="brand" href="./" aria-label="AGENTS.md generator">
    <span class="brand-mark" aria-hidden="true">@</span>
    <span class="brand-name">AGENTS.md</span>
  </a>
  <div class="toolbar-center">{@render center?.()}</div>
  <nav class="toolbar-actions" aria-label="Site">
    <a href="https://agents.md" target="_blank" rel="noreferrer">Spec</a>
    <a href="https://github.com/grzmol/AGENTS.md-generator" target="_blank" rel="noreferrer">GitHub</a>
    <button class="link-button" onclick={cycle} aria-label="Appearance, currently {labels[theme]}">{labels[theme]}</button>
  </nav>
</header>
