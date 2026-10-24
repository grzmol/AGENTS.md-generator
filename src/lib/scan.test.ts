import { describe, expect, it } from 'vitest'
import { packs } from './content'
import { detect, parsePackageJson } from './scan'
import { packsForScan, selectionForScan } from './scan-apply'
import { parseRepoInput } from './scan-sources'

function fixture(files: Record<string, string>) {
  return { paths: Object.keys(files), read: async (path: string) => files[path] ?? null }
}

const ids = (result: Awaited<ReturnType<typeof detect>>) => result.packIds

describe('detect', () => {
  it('detects a Next.js app with pnpm and fills commands', async () => {
    const { paths, read } = fixture({
      'package.json': JSON.stringify({ name: 'shop', description: 'A shop', scripts: { dev: 'next dev', build: 'next build', test: 'vitest', lint: 'eslint .' }, dependencies: { next: '15', react: '19' }, devDependencies: { typescript: '5', tailwindcss: '4', vitest: '3' } }),
      'pnpm-lock.yaml': '',
      'tsconfig.json': '{}',
      'src/app/page.tsx': '',
      'src/app/layout.tsx': '',
      'src/components/button.tsx': '',
      'index.html': '',
      'src/app.css': ''
    })
    const result = await detect(paths, read)
    expect(ids(result)).toEqual(expect.arrayContaining(['react', 'nextjs', 'typescript', 'tailwind', 'js-testing']))
    expect(result.packageManager).toBe('pnpm')
    expect(result.project).toMatchObject({ name: 'shop', description: 'A shop', install: 'pnpm install', dev: 'pnpm run dev', build: 'pnpm run build', test: 'pnpm test', lint: 'pnpm run lint' })
    expect(result.monorepo).toBe(false)
    expect(ids(result)).not.toContain('html')
  })

  it('detects tooling packs from config files and dependencies', async () => {
    const { paths, read } = fixture({
      'package.json': JSON.stringify({ name: 'edge', devDependencies: { wrangler: '4', vitest: '3', '@playwright/test': '1', '@changesets/cli': '2', turbo: '2', '@biomejs/biome': '2' }, dependencies: { '@ai-sdk/openai': '3' } }),
      'wrangler.jsonc': '{}',
      'turbo.json': '{}',
      '.changeset/config.json': '{}',
      'pnpm-workspace.yaml': '',
      'justfile': '',
      'MODULE.bazel': ''
    })
    const result = await detect(paths, read)
    expect(ids(result)).toEqual(expect.arrayContaining(['cloudflare-workers', 'vitest', 'playwright', 'changesets', 'turborepo', 'biome', 'vercel-ai-sdk', 'pnpm', 'just', 'bazel']))
  })

  it('detects FastAPI with uv and pytest', async () => {
    const { paths, read } = fixture({
      'pyproject.toml': '[project]\nname = "api"\ndescription = "Orders API"\ndependencies = ["fastapi>=0.110", "pydantic", "sqlalchemy", "psycopg[binary]"]\n[dependency-groups]\ndev = ["pytest", "ruff"]\n',
      'uv.lock': '',
      'app/main.py': '',
      'app/models.py': '',
      'tests/test_api.py': ''
    })
    const result = await detect(paths, read)
    expect(ids(result)).toEqual(expect.arrayContaining(['python', 'fastapi', 'pydantic', 'sqlalchemy']))
    expect(result.project).toMatchObject({ name: 'api', install: 'uv sync', test: 'uv run pytest', lint: 'uv run ruff check .' })
  })

  it('detects Go, Rust and Docker from manifests and file names', async () => {
    const go = await detect(['go.mod', 'main.go', 'Dockerfile', '.github/workflows/ci.yml'], async () => '')
    expect(ids(go)).toEqual(expect.arrayContaining(['go', 'docker', 'github-actions']))
    expect(go.project.test).toBe('go test ./...')
    const rust = await detect(['Cargo.toml', 'src/main.rs', 'src/lib.rs'], async () => '')
    expect(ids(rust)).toContain('rust')
    expect(rust.project.lint).toBe('cargo clippy')
  })

  it('detects a pnpm monorepo and analyzes package folders', async () => {
    const { paths, read } = fixture({
      'package.json': JSON.stringify({ name: 'root', scripts: { test: 'turbo test' } }),
      'pnpm-workspace.yaml': 'packages:\n  - apps/*\n',
      'pnpm-lock.yaml': '',
      'turbo.json': '{}',
      'apps/web/package.json': JSON.stringify({ name: 'web', scripts: { dev: 'next dev', test: 'vitest' }, dependencies: { next: '15', react: '19' } }),
      'apps/api/package.json': JSON.stringify({ name: 'api', scripts: { dev: 'tsx watch src/index.ts' }, dependencies: { express: '5' } }),
      'apps/api/src/index.ts': '',
      'packages/ui/package.json': JSON.stringify({ name: 'ui', dependencies: { react: '19' } })
    })
    const result = await detect(paths, read)
    expect(result.monorepo).toBe(true)
    expect(ids(result)).toContain('monorepo')
    expect(result.folders.map((folder) => folder.path)).toEqual(['apps/api', 'apps/web', 'packages/ui'])
    const web = result.folders.find((folder) => folder.path === 'apps/web')!
    expect(web.packIds).toEqual(expect.arrayContaining(['react', 'nextjs']))
    expect(web.commands.dev).toBe('pnpm --filter web dev')
    expect(result.folders.find((folder) => folder.path === 'apps/api')!.packIds).toContain('express')
  })

  it('ignores vendored directories and malformed manifests', async () => {
    const result = await detect(['node_modules/react/package.json', 'package.json'], async (path) => (path === 'package.json' ? '{ not json' : '{"dependencies":{"react":"1"}}'))
    expect(ids(result)).not.toContain('react')
    expect(parsePackageJson('{ nope')).toBeNull()
    expect(result.fileCount).toBe(1)
  })

  it('reads Makefile targets when no ecosystem commands exist', async () => {
    const result = await detect(['Makefile', 'src/a.c', 'src/b.c'], async () => 'build:\n\tcc\ntest:\n\t./t\nlint:\n\tcppcheck\n')
    expect(result.project).toMatchObject({ build: 'make build', test: 'make test', lint: 'make lint' })
    expect(ids(result)).toEqual(expect.arrayContaining(['makefile', 'c']))
  })
})

describe('scan apply', () => {
  it('adds base packs and only existing pack ids', () => {
    const wanted = packsForScan(packs, ['react', 'nextjs', 'not-a-pack'], false)
    expect(wanted).toEqual(expect.arrayContaining(['react', 'nextjs', 'agent-behavior', 'testing', 'design-system', 'a11y']))
    expect(wanted).not.toContain('not-a-pack')
  })

  it('selects recommended rules and leaves general packs out of nested files', () => {
    const selected = selectionForScan(packs, ['react'])
    expect(selected.has('react-function')).toBe(true)
    expect(selected.has('git-conventional')).toBe(true)
    const nested = selectionForScan(packs, ['react'], false, true)
    expect(nested.has('react-function')).toBe(true)
    expect(nested.has('git-conventional')).toBe(false)
  })
})

describe('parseRepoInput', () => {
  it('parses urls, short names and tree links', () => {
    expect(parseRepoInput('https://github.com/vercel/next.js')).toEqual({ owner: 'vercel', repo: 'next.js', ref: undefined, subdir: undefined })
    expect(parseRepoInput('vercel/next.js')).toEqual({ owner: 'vercel', repo: 'next.js' })
    expect(parseRepoInput('github.com/a/b/tree/main/apps/web/')).toEqual({ owner: 'a', repo: 'b', ref: 'main', subdir: 'apps/web' })
    expect(parseRepoInput('https://github.com/a/b.git')).toMatchObject({ owner: 'a', repo: 'b' })
    expect(parseRepoInput('not a repo')).toBeNull()
  })
})

describe('loadGithub', () => {
  it('reads the default branch, filters the tree and fetches raw files', async () => {
    const { loadGithub } = await import('./scan-sources')
    const calls: string[] = []
    const original = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
      calls.push(String(url))
      const text = String(url)
      if (text.endsWith('/repos/o/r')) return new Response(JSON.stringify({ default_branch: 'trunk' }))
      if (text.includes('/git/trees/trunk')) return new Response(JSON.stringify({ tree: [{ path: 'package.json', type: 'blob' }, { path: 'src', type: 'tree' }, { path: 'src/a.ts', type: 'blob' }], truncated: false }))
      if (text.startsWith('https://raw.githubusercontent.com/o/r/trunk/')) return new Response('{"name":"x"}')
      return new Response('', { status: 404 })
    }) as typeof fetch
    try {
      const source = await loadGithub({ owner: 'o', repo: 'r' })
      expect(source.paths).toEqual(['package.json', 'src/a.ts'])
      expect(await source.read('package.json')).toBe('{"name":"x"}')
      expect(calls[0]).toBe('https://api.github.com/repos/o/r')
    } finally {
      globalThis.fetch = original
    }
  })

  it('reports private or missing repositories and rate limits', async () => {
    const { loadGithub, ScanError } = await import('./scan-sources')
    const original = globalThis.fetch
    try {
      globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch
      await expect(loadGithub({ owner: 'o', repo: 'r' })).rejects.toThrow(ScanError)
      globalThis.fetch = (async () => new Response('', { status: 403 })) as typeof fetch
      await expect(loadGithub({ owner: 'o', repo: 'r' })).rejects.toThrow(/rate limit/)
    } finally {
      globalThis.fetch = original
    }
  })
})
