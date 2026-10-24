<script lang="ts">
  import { ACTION_REF, checkWorkflow, configSnippet, updateWorkflow } from '../lib/workflows'
  import { workbench as wb } from '../lib/workbench.svelte'

  let adopt = $state(false)
  let weekday = $state(1)
  let status = $state('')
  let timer: ReturnType<typeof setTimeout> | undefined

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const update = $derived(updateWorkflow({ adopt, weekday }))
  const check = checkWorkflow()
  const config = configSnippet()

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      status = `${label} copied`
    } catch {
      status = 'Copy blocked by the browser. Select the text instead.'
    }
    clearTimeout(timer)
    timer = setTimeout(() => (status = ''), 2200)
  }
</script>

<article class="pane">
  <button class="back link-button" onclick={() => (wb.mobileDetail = false)}>Packs</button>
  <p class="eyebrow">Automation</p>
  <h1 class="pane-title">Keep it updated</h1>
  <p class="lede">
    An AGENTS.md goes stale when dependencies and tools change. A GitHub Action rescans your repository on a schedule, rewrites only the generated block and opens a pull request for you to review.
  </p>

  <h2 class="section-title">How it works</h2>
  <ul class="group">
    <li class="row static"><span class="row-body"><span class="row-title">Marked block</span><span class="row-text">The generated rules sit between <span class="mono">agents-md-generator</span> comment markers. Everything you write outside them is never touched.</span></span></li>
    <li class="row static"><span class="row-body"><span class="row-title">Same detection as the scan</span><span class="row-text">Manifests, lockfiles and file names decide the packs and commands, so new frameworks and scripts appear after a dependency change.</span></span></li>
    <li class="row static"><span class="row-body"><span class="row-title">Pull request, not a push</span><span class="row-text">Changes arrive as a pull request. A separate check workflow can fail a pull request when the file has drifted.</span></span></li>
  </ul>

  <h2 class="section-title">Weekly update pull request</h2>
  <div class="group form-group">
    <label class="field">
      <span>Run on</span>
      <select bind:value={weekday}>
        {#each days as day, index (day)}
          <option value={index}>{day}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span class="row-body"><span class="row-title">Adopt an existing AGENTS.md</span><span class="row-text">Append a managed block to a file that has none, instead of skipping it.</span></span>
      <input class="switch" type="checkbox" role="switch" bind:checked={adopt} />
    </label>
  </div>
  <div class="code-card">
    <div class="code-head"><span class="mono">.github/workflows/update-agents-md.yml</span><button class="link-button" onclick={() => copy(update, 'Workflow')}>Copy</button></div>
    <pre class="code">{update}</pre>
  </div>

  <h2 class="section-title">Drift check on pull requests</h2>
  <div class="code-card">
    <div class="code-head"><span class="mono">.github/workflows/agents-md-check.yml</span><button class="link-button" onclick={() => copy(check, 'Workflow')}>Copy</button></div>
    <pre class="code">{check}</pre>
  </div>

  <h2 class="section-title">Tune the result</h2>
  <p class="scan-copy pad">Commit an optional <span class="mono">.agents-md.json</span> next to AGENTS.md to add or drop packs and override commands.</p>
  <div class="code-card">
    <div class="code-head"><span class="mono">.agents-md.json</span><button class="link-button" onclick={() => copy(config, 'Config')}>Copy</button></div>
    <pre class="code">{config}</pre>
  </div>

  <p class="status" aria-live="polite">{status}</p>
  <p class="foot-note">The workflows use <span class="mono">{ACTION_REF}</span>. In the repository settings, allow GitHub Actions to create pull requests (Settings, Actions, General). Pin a release tag once one exists. You can also run the CLI locally with <span class="mono">npx tsx cli/agents-md.ts</span> from a checkout of this project.</p>
</article>
