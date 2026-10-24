import { appendFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { EMPTY_PROJECT, generateScope } from '../src/lib/generator'
import { mergeManaged, type MergeStatus } from '../src/lib/managed'
import { detect } from '../src/lib/scan'
import { selectionForScan, summarize } from '../src/lib/scan-apply'
import { newScope } from '../src/lib/selection'
import type { Pack, ProjectInfo } from '../src/lib/types'

interface Config {
  include?: string[]
  exclude?: string[]
  nested?: boolean
  project?: Partial<ProjectInfo>
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'target', 'vendor', '.venv', 'venv', '__pycache__', '.next', '.nuxt', '.svelte-kit', '.gradle', 'Pods', '.dart_tool', 'coverage'])
const MAX_BYTES = 400_000

function parseArgs(argv: string[]) {
  const args = { dir: '.', check: false, adopt: false, dryRun: false, help: false }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--check') args.check = true
    else if (arg === '--adopt') args.adopt = true
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--help' || arg === '-h') args.help = true
    else if (arg === '--dir') args.dir = argv[++index] ?? '.'
  }
  return args
}

const HELP = `agents-md: keep AGENTS.md in sync with the technologies in your repository

Usage: agents-md [--dir <path>] [--check] [--dry-run] [--adopt]

  --check     do not write; exit 1 when a file is missing or out of date
  --dry-run   print what would change without writing
  --adopt     append a managed block to an existing AGENTS.md that has none

Only the block between the agents-md-generator markers is rewritten.
Optional .agents-md.json: { "include": [], "exclude": [], "nested": true, "project": {} }`

function walk(root: string): string[] {
  const out: string[] = []
  const visit = (dir: string, prefix: string, depth: number) => {
    for (const name of readdirSync(dir)) {
      if (out.length >= 20000) return
      const full = join(dir, name)
      const stats = statSync(full, { throwIfNoEntry: false })
      if (!stats) continue
      if (stats.isDirectory()) {
        if (!SKIP.has(name) && depth < 8) visit(full, `${prefix}${name}/`, depth + 1)
      } else if (stats.isFile()) out.push(`${prefix}${name}`)
    }
  }
  visit(root, '', 0)
  return out
}

function loadPacks(): Pack[] {
  const dir = join(import.meta.dirname, '..', 'content', 'packs')
  return readdirSync(dir).sort().map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as Pack)
}

function loadConfig(root: string): Config {
  const file = join(root, '.agents-md.json')
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Config
  } catch {
    throw new Error('.agents-md.json is not valid JSON')
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(HELP)
    return 0
  }
  const root = resolve(args.dir)
  if (!existsSync(root)) throw new Error(`Directory not found: ${root}`)
  const packs = loadPacks()
  const config = loadConfig(root)
  const paths = walk(root)
  const result = await detect(paths, async (path) => {
    const text = await readFile(join(root, path), 'utf8').catch(() => null)
    return text === null ? null : text.slice(0, MAX_BYTES)
  })

  const known = new Set(packs.map((pack) => pack.id))
  const exclude = new Set(config.exclude ?? [])
  const packIds = [...new Set([...result.packIds, ...(config.include ?? []).filter((id) => known.has(id))])].filter((id) => !exclude.has(id))
  const project: ProjectInfo = { ...EMPTY_PROJECT, ...result.project, ...config.project }
  const scopes = [newScope(0, '', project, selectionForScan(packs, packIds, result.monorepo))]
  if (config.nested !== false) {
    for (const folder of result.folders) {
      const ids = folder.packIds.filter((id) => !exclude.has(id))
      scopes.push(newScope(scopes.length, folder.path, { ...EMPTY_PROJECT, ...folder.commands }, selectionForScan(packs, ids, false, true)))
    }
  }

  console.log(`Scanned ${result.fileCount} files. ${summarize(result)}.`)
  const changes: Array<{ path: string; status: MergeStatus }> = []
  for (const scope of scopes) {
    if (scope.path !== '' && scope.selected.size === 0) continue
    const target = join(root, scope.path, 'AGENTS.md')
    const label = scope.path ? `${scope.path}/AGENTS.md` : 'AGENTS.md'
    const existing = existsSync(target) ? readFileSync(target, 'utf8') : null
    const merged = mergeManaged(existing, generateScope(packs, scope, 'agents'), args.adopt)
    changes.push({ path: label, status: merged.status })
    const writable = merged.status === 'created' || merged.status === 'updated' || merged.status === 'adopted'
    if (writable && !args.check && !args.dryRun) {
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, merged.content)
    }
    console.log(`${merged.status.padEnd(9)} ${label}`)
  }

  const pending = changes.filter((change) => ['created', 'updated', 'adopted'].includes(change.status))
  const unmanaged = changes.filter((change) => change.status === 'unmanaged')
  for (const change of unmanaged) console.warn(`warning: ${change.path} exists without agents-md-generator markers; run with --adopt to add a managed block`)

  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${pending.length > 0}\nfiles=${pending.map((change) => change.path).join(',')}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ['### AGENTS.md update', '', `Detected: ${summarize(result)}`, '', ...changes.map((change) => `- \`${change.path}\`: ${change.status}`)]
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`)
  }

  if (args.check && pending.length > 0) {
    console.error(`${pending.length} file(s) are out of date. Run agents-md without --check to update them.`)
    return 1
  }
  return 0
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
)
