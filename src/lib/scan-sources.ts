import type { ReadFile } from './scan'

export interface RepoRef {
  owner: string
  repo: string
  ref?: string
  subdir?: string
}

export interface ScanSource {
  label: string
  paths: string[]
  read: ReadFile
  truncated: boolean
}

const MAX_BYTES = 400_000

export function parseRepoInput(input: string): RepoRef | null {
  const text = input.trim().replace(/\.git$/, '')
  const url = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?\/?$/.exec(text)
  if (url) return { owner: url[1], repo: url[2], ref: url[3], subdir: url[4]?.replace(/\/$/, '') }
  const short = /^([\w.-]+)\/([\w.-]+)$/.exec(text)
  if (short) return { owner: short[1], repo: short[2] }
  return null
}

export class ScanError extends Error {}

export async function loadGithub(ref: RepoRef, onStatus: (message: string) => void = () => {}): Promise<ScanSource> {
  const base = `https://api.github.com/repos/${ref.owner}/${ref.repo}`
  let branch = ref.ref
  if (!branch) {
    onStatus('Looking up the default branch')
    const info = await fetch(base, { headers: { Accept: 'application/vnd.github+json' } })
    if (info.status === 404) throw new ScanError('Repository not found, or it is private. Use the local folder scan for private code.')
    if (info.status === 403) throw new ScanError('GitHub rate limit reached for anonymous requests. Try again later or use the local folder scan.')
    if (!info.ok) throw new ScanError(`GitHub answered with status ${info.status}.`)
    branch = ((await info.json()) as { default_branch: string }).default_branch
  }
  onStatus(`Reading the file tree of ${branch}`)
  const treeResponse = await fetch(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { headers: { Accept: 'application/vnd.github+json' } })
  if (treeResponse.status === 404) throw new ScanError('Branch or repository not found.')
  if (treeResponse.status === 403) throw new ScanError('GitHub rate limit reached for anonymous requests. Try again later or use the local folder scan.')
  if (!treeResponse.ok) throw new ScanError(`GitHub answered with status ${treeResponse.status}.`)
  const tree = (await treeResponse.json()) as { tree: Array<{ path: string; type: string }>; truncated?: boolean }
  const prefix = ref.subdir ? `${ref.subdir}/` : ''
  const paths = tree.tree.filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix)).map((entry) => entry.path.slice(prefix.length))
  const read: ReadFile = async (path) => {
    const response = await fetch(`https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${encodeURIComponent(branch!)}/${prefix}${path}`)
    if (!response.ok) return null
    const text = await response.text()
    return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text
  }
  return { label: `${ref.owner}/${ref.repo}${ref.subdir ? `/${ref.subdir}` : ''}`, paths, read, truncated: !!tree.truncated }
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'target', 'vendor', '.venv', 'venv', '__pycache__', '.next', '.nuxt', '.svelte-kit', '.gradle', 'Pods', '.dart_tool', 'coverage'])

export async function loadDirectoryHandle(root: FileSystemDirectoryHandle, onStatus: (message: string) => void = () => {}): Promise<ScanSource> {
  const paths: string[] = []
  const handles = new Map<string, FileSystemFileHandle>()
  let truncated = false
  async function walk(dir: FileSystemDirectoryHandle, prefix: string, depth: number) {
    for await (const [name, handle] of (dir as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
      if (paths.length >= 20000) {
        truncated = true
        return
      }
      if (handle.kind === 'directory') {
        if (SKIP_DIRS.has(name) || depth >= 7) continue
        await walk(handle as FileSystemDirectoryHandle, `${prefix}${name}/`, depth + 1)
      } else {
        paths.push(`${prefix}${name}`)
        handles.set(`${prefix}${name}`, handle as FileSystemFileHandle)
      }
    }
  }
  onStatus('Walking the folder')
  await walk(root, '', 0)
  const read: ReadFile = async (path) => {
    const handle = handles.get(path)
    if (!handle) return null
    const file = await handle.getFile()
    return file.size > MAX_BYTES ? (await file.slice(0, MAX_BYTES).text()) : file.text()
  }
  return { label: root.name, paths, read, truncated }
}

export function loadFileList(files: FileList): ScanSource {
  const entries = new Map<string, File>()
  let root = ''
  for (const file of Array.from(files)) {
    const relative = (file as File & { webkitRelativePath: string }).webkitRelativePath || file.name
    const parts = relative.split('/')
    if (!root) root = parts[0]
    const path = parts.slice(1).join('/')
    if (!path || parts.slice(1, -1).some((segment) => SKIP_DIRS.has(segment))) continue
    entries.set(path, file)
  }
  const read: ReadFile = async (path) => {
    const file = entries.get(path)
    if (!file) return null
    return file.size > MAX_BYTES ? file.slice(0, MAX_BYTES).text() : file.text()
  }
  return { label: root || 'folder', paths: [...entries.keys()], read, truncated: false }
}
