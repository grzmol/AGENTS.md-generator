<script lang="ts">
  import { packs } from '../lib/content'
  import { detect, type ScanResult } from '../lib/scan'
  import { summarize } from '../lib/scan-apply'
  import { ScanError, loadDirectoryHandle, loadFileList, loadGithub, parseRepoInput, type ScanSource } from '../lib/scan-sources'
  import { workbench as wb } from '../lib/workbench.svelte'

  let input = $state('')
  let status = $state<'idle' | 'scanning' | 'done' | 'error'>('idle')
  let message = $state('')
  let source = $state('')
  let truncated = $state(false)
  let result = $state<ScanResult | null>(null)
  let withFolders = $state(true)
  let applied = $state('')
  let fileInput = $state<HTMLInputElement | undefined>()

  const supportsPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window
  const titleOf = (id: string) => packs.find((pack) => pack.id === id)?.title ?? id

  async function run(load: () => Promise<ScanSource>) {
    status = 'scanning'
    applied = ''
    result = null
    message = 'Starting'
    try {
      const loaded = await load()
      message = 'Detecting technologies'
      result = await detect(loaded.paths, loaded.read)
      source = loaded.label
      truncated = loaded.truncated
      status = 'done'
    } catch (error) {
      status = 'error'
      message = error instanceof ScanError ? error.message : error instanceof DOMException && error.name === 'AbortError' ? 'Folder selection was cancelled.' : 'The scan failed. Check the address and try again.'
    }
  }

  function scanGithub(event: SubmitEvent) {
    event.preventDefault()
    const ref = parseRepoInput(input)
    if (!ref) {
      status = 'error'
      message = 'Enter a GitHub URL such as https://github.com/vercel/next.js or owner/repo.'
      return
    }
    run(() => loadGithub(ref, (text) => (message = text)))
  }

  async function chooseFolder() {
    if (supportsPicker) {
      try {
        const handle = await (window as unknown as { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker()
        run(() => loadDirectoryHandle(handle, (text) => (message = text)))
      } catch {
        return
      }
    } else {
      fileInput?.click()
    }
  }

  function onFiles(event: Event) {
    const files = (event.currentTarget as HTMLInputElement).files
    if (files && files.length > 0) run(async () => loadFileList(files))
  }

  function apply() {
    if (!result) return
    const outcome = wb.applyScan(result, withFolders)
    applied = `Applied to ${wb.active.path || 'the root file'}. ${outcome.filled} project fields filled${outcome.folders ? `, ${outcome.folders} folder files added` : ''}.`
    wb.mobilePane = 'file'
  }
</script>

<article class="pane">
  <button class="back link-button" onclick={() => (wb.mobileDetail = false)}>Packs</button>
  <p class="eyebrow">Step one</p>
  <h1 class="pane-title">Scan a repository</h1>
  <p class="lede">Detect the stack from manifests and file names, preselect matching rules and fill in the project commands. Review everything before you copy it.</p>

  <h2 class="section-title">Public GitHub repository</h2>
  <form class="group scan-form" onsubmit={scanGithub}>
    <label class="visually-hidden" for="repo-input">GitHub repository</label>
    <input id="repo-input" bind:value={input} placeholder="https://github.com/owner/repo" autocomplete="off" spellcheck="false" />
    <button class="pill blue" type="submit" disabled={status === 'scanning'}>Scan</button>
  </form>

  <h2 class="section-title">Local folder, including private code</h2>
  <div class="group scan-form">
    <p class="scan-copy">Reads file names and a few manifests in your browser. Nothing is uploaded.</p>
    <button class="pill gray" onclick={chooseFolder} disabled={status === 'scanning'}>Choose folder</button>
    <input bind:this={fileInput} class="visually-hidden" type="file" webkitdirectory multiple onchange={onFiles} tabindex="-1" aria-hidden="true" />
  </div>

  {#if status === 'scanning'}
    <p class="scan-status" role="status">{message}…</p>
  {:else if status === 'error'}
    <p class="field-error scan-status" role="alert">{message}</p>
  {/if}

  {#if status === 'done' && result}
    <h2 class="section-title">Detected in {source}</h2>
    <p class="scan-copy pad">{result.fileCount.toLocaleString('en-US')} files scanned. {summarize(result)}.{truncated ? ' The repository is large, so the file list was truncated.' : ''}</p>

    {#if result.findings.length > 0}
      <ul class="group">
        {#each result.findings as finding (finding.packId)}
          <li class="row static">
            <span class="row-body">
              <span class="row-title">{finding.label}</span>
              <span class="row-text">Found in <span class="mono">{finding.evidence}</span>. Adds the {titleOf(finding.packId)} pack.</span>
            </span>
          </li>
        {/each}
      </ul>
    {/if}

    {#if Object.values(result.project).some(Boolean)}
      <h2 class="section-title">Project details found</h2>
      <ul class="group">
        {#each Object.entries(result.project) as [key, value] (key)}
          {#if value}
            <li class="row static"><span class="row-title cap">{key}</span><span class="mono scan-value">{value}</span></li>
          {/if}
        {/each}
      </ul>
    {/if}

    {#if result.folders.length > 0}
      <h2 class="section-title">Monorepo folders</h2>
      <ul class="group">
        {#each result.folders as folder (folder.path)}
          <li class="row static">
            <span class="row-body">
              <span class="row-title mono">{folder.path}</span>
              <span class="row-text">{folder.findings.length > 0 ? folder.findings.map((finding) => finding.label).join(', ') : 'No known technologies detected'}</span>
            </span>
          </li>
        {/each}
      </ul>
      <label class="scan-check">
        <input type="checkbox" bind:checked={withFolders} />
        <span>Add a nested file for each folder</span>
      </label>
    {/if}

    <div class="scan-actions">
      <button class="pill blue" onclick={apply}>Apply to {wb.active.path || 'root file'}</button>
      <button class="link-button" onclick={() => (wb.view = { kind: 'presets' })}>Choose a preset instead</button>
    </div>
    {#if applied}<p class="status" role="status">{applied}</p>{/if}
    <p class="foot-note">Applying replaces the selection for this file and only fills empty project fields. Detection reads dependencies and file names, so check the result against what the project really uses.</p>
  {/if}
</article>
