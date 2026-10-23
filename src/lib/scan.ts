import type { ProjectInfo } from './types'

export interface Finding {
  packId: string
  label: string
  evidence: string
}

export interface FolderResult {
  path: string
  name: string
  findings: Finding[]
  packIds: string[]
  commands: Partial<ProjectInfo>
}

export interface ScanResult {
  findings: Finding[]
  packIds: string[]
  project: Partial<ProjectInfo>
  packageManager?: string
  monorepo: boolean
  folders: FolderResult[]
  fileCount: number
}

export type ReadFile = (path: string) => Promise<string | null>

interface PackageJson {
  name?: string
  description?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  workspaces?: unknown
  engines?: Record<string, string>
}

const MANIFESTS = ['package.json', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json', 'Gemfile', 'pubspec.yaml']
const WORKSPACE_ROOTS = ['apps', 'packages', 'services', 'libs', 'crates', 'modules', 'projects']
const IGNORED = /(^|\/)(node_modules|vendor|dist|build|target|\.git|\.next|\.nuxt|\.svelte-kit|\.venv|venv|__pycache__|\.gradle|Pods|\.dart_tool|coverage)(\/|$)/

const NODE_DEPS: Array<[string, string[], string]> = [
  ['react', ['react'], 'React'],
  ['nextjs', ['next'], 'Next.js'],
  ['vue', ['vue'], 'Vue'],
  ['nuxt', ['nuxt'], 'Nuxt'],
  ['svelte', ['svelte', '@sveltejs/kit'], 'Svelte'],
  ['angular', ['@angular/core'], 'Angular'],
  ['astro', ['astro'], 'Astro'],
  ['react-router', ['react-router', 'react-router-dom', '@remix-run/react', '@react-router/dev'], 'React Router or Remix'],
  ['express', ['express', 'fastify'], 'Express or Fastify'],
  ['nestjs', ['@nestjs/core'], 'NestJS'],
  ['tailwind', ['tailwindcss'], 'Tailwind CSS'],
  ['js-testing', ['vitest', 'jest', '@playwright/test', 'playwright'], 'Vitest, Jest or Playwright'],
  ['cypress', ['cypress'], 'Cypress'],
  ['storybook', ['storybook', '@storybook/react', '@storybook/vue3', '@storybook/svelte'], 'Storybook'],
  ['tanstack-query', ['@tanstack/react-query', '@tanstack/vue-query', '@tanstack/svelte-query'], 'TanStack Query'],
  ['graphql', ['graphql', '@apollo/server', '@apollo/client', 'urql'], 'GraphQL'],
  ['trpc', ['@trpc/server'], 'tRPC'],
  ['orm-js', ['prisma', '@prisma/client', 'drizzle-orm'], 'Prisma or Drizzle'],
  ['state-mgmt', ['@reduxjs/toolkit', 'zustand'], 'Redux Toolkit or Zustand'],
  ['electron', ['electron'], 'Electron'],
  ['react-native', ['react-native', 'expo'], 'React Native'],
  ['bundlers', ['vite', 'webpack'], 'Vite or webpack'],
  ['eslint-prettier', ['eslint', 'prettier'], 'ESLint or Prettier'],
  ['forms-zod', ['react-hook-form', 'zod'], 'React Hook Form or Zod'],
  ['shadcn', ['class-variance-authority', '@radix-ui/react-slot'], 'shadcn/ui or Radix'],
  ['payments', ['stripe', '@stripe/stripe-js'], 'Stripe'],
  ['supabase', ['@supabase/supabase-js'], 'Supabase'],
  ['firebase', ['firebase', 'firebase-admin'], 'Firebase'],
  ['mongodb', ['mongodb', 'mongoose'], 'MongoDB'],
  ['redis', ['redis', 'ioredis'], 'Redis'],
  ['kafka', ['kafkajs'], 'Kafka'],
  ['rabbitmq-sqs', ['amqplib', '@aws-sdk/client-sqs'], 'RabbitMQ or SQS'],
  ['postgresql', ['pg', 'postgres', '@neondatabase/serverless'], 'PostgreSQL'],
  ['mysql', ['mysql2', 'mysql'], 'MySQL'],
  ['sqlite', ['better-sqlite3', 'sqlite3'], 'SQLite'],
  ['mcp', ['@modelcontextprotocol/sdk'], 'MCP server or client'],
  ['claude-api', ['@anthropic-ai/sdk'], 'Anthropic Claude API'],
  ['llm-apps', ['openai', '@anthropic-ai/sdk', 'langchain', '@langchain/core', 'ai'], 'LLM application'],
  ['websockets', ['ws', 'socket.io'], 'WebSockets'],
  ['auth', ['next-auth', '@auth/core', 'passport', '@clerk/nextjs', 'lucia'], 'Authentication library'],
  ['htmx', ['htmx.org'], 'htmx'],
  ['workflows', ['@temporalio/client', '@temporalio/workflow'], 'Temporal'],
  ['solidity', ['hardhat', '@openzeppelin/contracts'], 'Solidity']
]

const PYTHON_DEPS: Array<[string, string[], string]> = [
  ['fastapi', ['fastapi'], 'FastAPI'],
  ['django', ['django'], 'Django'],
  ['flask', ['flask'], 'Flask'],
  ['pydantic', ['pydantic', 'pydantic-settings'], 'Pydantic'],
  ['sqlalchemy', ['sqlalchemy'], 'SQLAlchemy'],
  ['celery', ['celery'], 'Celery'],
  ['pandas', ['pandas', 'polars'], 'pandas'],
  ['pytorch', ['torch', 'pytorch-lightning'], 'PyTorch'],
  ['airflow', ['apache-airflow'], 'Airflow'],
  ['dbt', ['dbt-core', 'dbt-postgres', 'dbt-bigquery', 'dbt-snowflake'], 'dbt'],
  ['claude-api', ['anthropic'], 'Anthropic Claude API'],
  ['llm-apps', ['anthropic', 'openai', 'langchain', 'langchain-core'], 'LLM application'],
  ['mcp', ['mcp', 'fastmcp'], 'MCP server or client'],
  ['postgresql', ['psycopg', 'psycopg2', 'psycopg2-binary', 'asyncpg'], 'PostgreSQL'],
  ['redis', ['redis'], 'Redis'],
  ['kafka', ['confluent-kafka', 'kafka-python', 'aiokafka'], 'Kafka'],
  ['workflows', ['temporalio'], 'Temporal'],
  ['payments', ['stripe'], 'Stripe']
]

const FILE_RULES: Array<{ pack: string; label: string; test: (path: string) => boolean }> = [
  { pack: 'docker', label: 'Docker', test: (path) => /(^|\/)(Dockerfile(\.[\w-]+)?|docker-compose\.ya?ml|compose\.ya?ml)$/.test(path) },
  { pack: 'terraform', label: 'Terraform', test: (path) => path.endsWith('.tf') },
  { pack: 'helm', label: 'Helm', test: (path) => /(^|\/)Chart\.ya?ml$/.test(path) },
  { pack: 'kubernetes', label: 'Kubernetes', test: (path) => /(^|\/)(k8s|kubernetes|manifests)\/.+\.ya?ml$/.test(path) || /(^|\/)kustomization\.ya?ml$/.test(path) },
  { pack: 'github-actions', label: 'GitHub Actions', test: (path) => /^\.github\/workflows\/.+\.ya?ml$/.test(path) },
  { pack: 'gitlab-ci', label: 'GitLab CI', test: (path) => path === '.gitlab-ci.yml' },
  { pack: 'ansible', label: 'Ansible', test: (path) => path === 'ansible.cfg' || /(^|\/)playbooks?\/.+\.ya?ml$/.test(path) },
  { pack: 'makefile', label: 'Makefile', test: (path) => /(^|\/)Makefile$/.test(path) },
  { pack: 'nginx', label: 'nginx', test: (path) => /(^|\/)nginx\.conf$/.test(path) },
  { pack: 'serverless', label: 'Serverless framework or AWS SAM', test: (path) => /(^|\/)(serverless\.ya?ml|template\.ya?ml|samconfig\.toml)$/.test(path) },
  { pack: 'dbt', label: 'dbt', test: (path) => /(^|\/)dbt_project\.yml$/.test(path) },
  { pack: 'orm-js', label: 'Prisma', test: (path) => /(^|\/)schema\.prisma$/.test(path) },
  { pack: 'schema-migrations', label: 'Flyway or Liquibase migrations', test: (path) => /(^|\/)db\/migration\/V[\w.]+__.+\.sql$/.test(path) || /(^|\/)liquibase\.properties$/.test(path) },
  { pack: 'shadcn', label: 'shadcn/ui', test: (path) => /(^|\/)components\.json$/.test(path) },
  { pack: 'storybook', label: 'Storybook', test: (path) => /(^|\/)\.storybook\//.test(path) },
  { pack: 'jupyter', label: 'Jupyter notebooks', test: (path) => path.endsWith('.ipynb') },
  { pack: 'solidity', label: 'Solidity', test: (path) => path.endsWith('.sol') || /(^|\/)foundry\.toml$/.test(path) },
  { pack: 'godot', label: 'Godot', test: (path) => /(^|\/)project\.godot$/.test(path) },
  { pack: 'unity', label: 'Unity', test: (path) => /(^|\/)ProjectSettings\/ProjectVersion\.txt$/.test(path) },
  { pack: 'bash', label: 'Shell scripts', test: (path) => path.endsWith('.sh') },
  { pack: 'cypress', label: 'Cypress', test: (path) => /(^|\/)cypress\.config\.(js|ts|mjs)$/.test(path) },
  { pack: 'tailwind', label: 'Tailwind CSS', test: (path) => /(^|\/)tailwind\.config\.(js|ts|cjs|mjs)$/.test(path) },
  { pack: 'bun-deno', label: 'Bun or Deno', test: (path) => /(^|\/)(bun\.lockb?|bunfig\.toml|deno\.jsonc?|deno\.lock)$/.test(path) },
  { pack: 'swift', label: 'Swift', test: (path) => /(^|\/)(Package\.swift)$/.test(path) || path.endsWith('.xcodeproj/project.pbxproj') },
  { pack: 'flutter', label: 'Flutter and Dart', test: (path) => /(^|\/)pubspec\.yaml$/.test(path) },
  { pack: 'wordpress', label: 'WordPress', test: (path) => /(^|\/)wp-content\//.test(path) || (/(^|\/)functions\.php$/.test(path) && /theme/.test(path)) },
  { pack: 'html', label: 'HTML', test: (path) => path.endsWith('.html') && !/(^|\/)(dist|public)\//.test(path) },
  { pack: 'css', label: 'CSS', test: (path) => path.endsWith('.css') || path.endsWith('.scss') }
]

const EXTENSION_RULES: Array<[string, string[], string]> = [
  ['typescript', ['.ts', '.tsx', '.mts', '.cts'], 'TypeScript'],
  ['python', ['.py'], 'Python'],
  ['go', ['.go'], 'Go'],
  ['rust', ['.rs'], 'Rust'],
  ['java', ['.java'], 'Java'],
  ['kotlin', ['.kt', '.kts'], 'Kotlin'],
  ['dotnet', ['.cs', '.csproj'], 'C# and .NET'],
  ['swift', ['.swift'], 'Swift'],
  ['cpp', ['.cpp', '.cc', '.hpp', '.cxx'], 'C++'],
  ['c', ['.c'], 'C'],
  ['elixir', ['.ex', '.exs'], 'Elixir'],
  ['scala', ['.scala'], 'Scala'],
  ['godot', ['.gd'], 'Godot GDScript']
]

export function parsePackageJson(text: string | null): PackageJson | null {
  if (!text) return null
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' ? (value as PackageJson) : null
  } catch {
    return null
  }
}

function hasToken(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[\\s"'\\[=<>~!,;(])${escaped}([\\s"'\\]=<>~!,;)\\[]|$)`, 'i').test(text)
}

function nodeDependencies(pkg: PackageJson | null): Set<string> {
  return new Set([...Object.keys(pkg?.dependencies ?? {}), ...Object.keys(pkg?.devDependencies ?? {}), ...Object.keys(pkg?.peerDependencies ?? {})])
}

function packageManager(files: Set<string>, prefix = ''): string | undefined {
  if (files.has(`${prefix}pnpm-lock.yaml`)) return 'pnpm'
  if (files.has(`${prefix}yarn.lock`)) return 'yarn'
  if (files.has(`${prefix}bun.lockb`) || files.has(`${prefix}bun.lock`)) return 'bun'
  if (files.has(`${prefix}package-lock.json`)) return 'npm'
  return undefined
}

function nodeCommands(pm: string, pkg: PackageJson): Partial<ProjectInfo> {
  const scripts = pkg.scripts ?? {}
  const run = (name: string) => (pm === 'npm' ? `npm run ${name}` : `${pm} run ${name}`)
  const out: Partial<ProjectInfo> = { install: pm === 'yarn' ? 'yarn install' : `${pm} install` }
  if (scripts.dev) out.dev = run('dev')
  else if (scripts.start) out.dev = pm === 'npm' || pm === 'yarn' || pm === 'pnpm' ? `${pm} start` : run('start')
  if (scripts.build) out.build = run('build')
  if (scripts.test) out.test = pm === 'npm' || pm === 'yarn' || pm === 'pnpm' ? `${pm} test` : run('test')
  if (scripts.lint) out.lint = run('lint')
  return out
}

function makeTargets(text: string | null): Set<string> {
  const targets = new Set<string>()
  for (const match of (text ?? '').matchAll(/^([A-Za-z][\w-]*)\s*:(?!=)/gm)) targets.add(match[1])
  return targets
}

function addFinding(findings: Map<string, Finding>, packId: string, label: string, evidence: string) {
  if (!findings.has(packId)) findings.set(packId, { packId, label, evidence })
}

function detectDeps(findings: Map<string, Finding>, table: Array<[string, string[], string]>, has: (name: string) => boolean, source: string) {
  for (const [pack, names, label] of table) {
    const hit = names.find(has)
    if (hit) addFinding(findings, pack, label, `${source}: ${hit}`)
  }
}

async function detectNodeFolder(read: ReadFile, prefix: string, files: Set<string>): Promise<{ findings: Map<string, Finding>; pkg: PackageJson | null }> {
  const findings = new Map<string, Finding>()
  const pkg = parsePackageJson(await read(`${prefix}package.json`))
  if (!pkg) return { findings, pkg: null }
  const deps = nodeDependencies(pkg)
  detectDeps(findings, NODE_DEPS, (name) => deps.has(name), 'package.json')
  if (deps.has('typescript') || files.has(`${prefix}tsconfig.json`)) addFinding(findings, 'typescript', 'TypeScript', deps.has('typescript') ? 'package.json: typescript' : 'tsconfig.json')
  const serverFramework = findings.has('express') || findings.has('nestjs')
  if (serverFramework || (!findings.has('react') && !findings.has('vue') && !findings.has('svelte') && !findings.has('angular') && !findings.has('astro') && !findings.has('electron'))) {
    addFinding(findings, 'nodejs', 'Node.js', 'package.json')
  }
  return { findings, pkg }
}

async function detectPythonText(read: ReadFile, prefix: string): Promise<string> {
  const parts = await Promise.all(['pyproject.toml', 'requirements.txt', 'requirements-dev.txt', 'Pipfile'].map((name) => read(`${prefix}${name}`)))
  return parts.filter((part): part is string => !!part).join('\n')
}

function pythonCommands(files: Set<string>, text: string, prefix: string): Partial<ProjectInfo> {
  const out: Partial<ProjectInfo> = {}
  const uv = files.has(`${prefix}uv.lock`)
  const poetry = /\[tool\.poetry\]/.test(text) || files.has(`${prefix}poetry.lock`)
  const runner = uv ? 'uv run ' : poetry ? 'poetry run ' : ''
  out.install = uv ? 'uv sync' : poetry ? 'poetry install' : files.has(`${prefix}requirements.txt`) ? 'pip install -r requirements.txt' : undefined
  if (hasToken(text, 'pytest')) out.test = `${runner}pytest`
  if (hasToken(text, 'ruff')) out.lint = `${runner}ruff check .`
  if (files.has(`${prefix}manage.py`)) out.dev = `${runner}python manage.py runserver`
  return out
}

const ECOSYSTEM_ORDER = ['node', 'python', 'go', 'rust', 'java', 'dotnet', 'php', 'ruby', 'flutter']

export async function detect(paths: string[], read: ReadFile): Promise<ScanResult> {
  const files = new Set(paths.filter((path) => !IGNORED.test(path)))
  const cache = new Map<string, Promise<string | null>>()
  const cachedRead: ReadFile = (path) => {
    if (!files.has(path)) return Promise.resolve(null)
    let value = cache.get(path)
    if (!value) {
      value = read(path).catch(() => null)
      cache.set(path, value)
    }
    return value
  }

  const findings = new Map<string, Finding>()
  const commandsByEcosystem = new Map<string, Partial<ProjectInfo>>()
  const project: Partial<ProjectInfo> = {}

  const node = await detectNodeFolder(cachedRead, '', files)
  for (const finding of node.findings.values()) findings.set(finding.packId, finding)
  const pm = packageManager(files) ?? (node.pkg ? 'npm' : undefined)
  if (node.pkg && pm) {
    commandsByEcosystem.set('node', nodeCommands(pm, node.pkg))
    if (node.pkg.name) project.name = node.pkg.name
    if (node.pkg.description) project.description = node.pkg.description
  }

  const pythonText = await detectPythonText(cachedRead, '')
  if (pythonText || files.has('manage.py')) {
    addFinding(findings, 'python', 'Python', files.has('pyproject.toml') ? 'pyproject.toml' : 'requirements.txt')
    detectDeps(findings, PYTHON_DEPS, (name) => hasToken(pythonText, name), 'Python dependencies')
    commandsByEcosystem.set('python', pythonCommands(files, pythonText, ''))
    const description = /^description\s*=\s*"([^"]+)"/m.exec(pythonText)?.[1]
    if (description && !project.description) project.description = description
    const name = /^name\s*=\s*"([^"]+)"/m.exec(pythonText)?.[1]
    if (name && !project.name) project.name = name
  }

  if (files.has('go.mod') || files.has('go.work')) {
    addFinding(findings, 'go', 'Go', 'go.mod')
    commandsByEcosystem.set('go', { install: 'go mod download', build: 'go build ./...', test: 'go test ./...', lint: 'go vet ./...' })
  }

  if (files.has('Cargo.toml')) {
    addFinding(findings, 'rust', 'Rust', 'Cargo.toml')
    commandsByEcosystem.set('rust', { build: 'cargo build', test: 'cargo test', lint: 'cargo clippy', dev: 'cargo run' })
  }

  const pom = await cachedRead('pom.xml')
  const gradle = (await cachedRead('build.gradle')) ?? (await cachedRead('build.gradle.kts'))
  if (pom || gradle) {
    const text = `${pom ?? ''}\n${gradle ?? ''}`
    const android = /com\.android\.(application|library)/.test(text)
    if (android) addFinding(findings, 'android', 'Android', 'build.gradle')
    if (!android || /spring-boot|org\.springframework/.test(text)) addFinding(findings, 'java', /spring/.test(text) ? 'Java and Spring Boot' : 'Java', pom ? 'pom.xml' : 'build.gradle')
    if (/kotlin/.test(text)) addFinding(findings, 'kotlin', 'Kotlin', 'Gradle Kotlin plugin')
    if (/junit/i.test(text)) addFinding(findings, 'junit', 'JUnit', 'build file: junit')
    if (/postgresql/i.test(text)) addFinding(findings, 'postgresql', 'PostgreSQL', 'build file: postgresql')
    if (pom) commandsByEcosystem.set('java', { build: 'mvn package', test: 'mvn test', dev: /spring-boot/.test(pom) ? 'mvn spring-boot:run' : undefined })
    else commandsByEcosystem.set('java', files.has('gradlew') ? { build: './gradlew build', test: './gradlew test' } : { build: 'gradle build', test: 'gradle test' })
  }

  const csproj = [...files].filter((path) => /\.(csproj|sln)$/.test(path))
  if (csproj.length > 0) {
    addFinding(findings, 'dotnet', 'C# and .NET', csproj[0])
    const text = (await Promise.all(csproj.filter((path) => path.endsWith('.csproj')).slice(0, 5).map(cachedRead))).join('\n')
    if (/xunit/i.test(text)) addFinding(findings, 'dotnet-testing', 'xUnit', '.csproj: xunit')
    if (/UnityEngine|com\.unity/i.test(text)) addFinding(findings, 'unity', 'Unity', '.csproj')
    commandsByEcosystem.set('dotnet', { install: 'dotnet restore', build: 'dotnet build', test: 'dotnet test', dev: 'dotnet run' })
  }

  const composer = await cachedRead('composer.json')
  if (composer) {
    const text = composer.toLowerCase()
    if (text.includes('laravel/framework')) {
      addFinding(findings, 'laravel', 'PHP and Laravel', 'composer.json: laravel/framework')
      commandsByEcosystem.set('php', { install: 'composer install', test: 'php artisan test', dev: 'php artisan serve' })
    } else {
      commandsByEcosystem.set('php', { install: 'composer install', test: text.includes('phpunit') ? 'vendor/bin/phpunit' : undefined })
    }
    if (text.includes('phpunit') || text.includes('pestphp')) addFinding(findings, 'phpunit', 'PHPUnit or Pest', 'composer.json')
    if (text.includes('johnpbloch/wordpress') || text.includes('wpackagist')) addFinding(findings, 'wordpress', 'WordPress', 'composer.json')
  }

  const gemfile = await cachedRead('Gemfile')
  if (gemfile) {
    if (/gem ['"]rails['"]/.test(gemfile)) {
      addFinding(findings, 'rails', 'Ruby on Rails', 'Gemfile: rails')
      commandsByEcosystem.set('ruby', { install: 'bundle install', dev: 'bin/rails server', test: /rspec/.test(gemfile) ? 'bundle exec rspec' : 'bin/rails test' })
    } else {
      commandsByEcosystem.set('ruby', { install: 'bundle install' })
    }
    if (/rspec/.test(gemfile)) addFinding(findings, 'rspec', 'RSpec', 'Gemfile: rspec')
  }

  const pubspec = await cachedRead('pubspec.yaml')
  if (pubspec && /flutter:/.test(pubspec)) commandsByEcosystem.set('flutter', { install: 'flutter pub get', test: 'flutter test', lint: 'flutter analyze', dev: 'flutter run' })

  const manifestJson = await cachedRead('manifest.json')
  if (manifestJson && /"manifest_version"\s*:\s*3/.test(manifestJson)) addFinding(findings, 'browser-extension', 'Browser extension (Manifest V3)', 'manifest.json')

  for (const rule of FILE_RULES) {
    const hit = [...files].find(rule.test)
    if (hit) addFinding(findings, rule.pack, rule.label, hit)
  }

  const counts = new Map<string, number>()
  for (const path of files) {
    const dot = path.lastIndexOf('.')
    if (dot < 0) continue
    const ext = path.slice(dot)
    counts.set(ext, (counts.get(ext) ?? 0) + 1)
  }
  for (const [pack, extensions, label] of EXTENSION_RULES) {
    const total = extensions.reduce((sum, ext) => sum + (counts.get(ext) ?? 0), 0)
    const strong = pack === 'typescript' || pack === 'python' ? total >= 3 : total >= 2
    if (strong && !findings.has(pack)) addFinding(findings, pack, label, `${total} ${extensions[0]} files`)
  }
  if (findings.has('python') === false && files.has('pyproject.toml')) addFinding(findings, 'python', 'Python', 'pyproject.toml')

  const makeFile = await cachedRead('Makefile')
  const makeCmds: Partial<ProjectInfo> = {}
  const targets = makeTargets(makeFile)
  if (targets.has('test')) makeCmds.test = 'make test'
  if (targets.has('build')) makeCmds.build = 'make build'
  if (targets.has('lint')) makeCmds.lint = 'make lint'
  if (targets.has('dev') || targets.has('run')) makeCmds.dev = targets.has('dev') ? 'make dev' : 'make run'
  if (targets.has('install') || targets.has('setup')) makeCmds.install = targets.has('install') ? 'make install' : 'make setup'
  commandsByEcosystem.set('make', makeCmds)

  for (const ecosystem of [...ECOSYSTEM_ORDER, 'make']) {
    const commands = commandsByEcosystem.get(ecosystem)
    if (!commands) continue
    for (const key of ['install', 'dev', 'build', 'test', 'lint'] as const) {
      const value = commands[key]
      if (value && !project[key]) project[key] = value
    }
  }

  const workspaceTool = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json', 'go.work', 'rush.json'].some((name) => files.has(name)) || !!node.pkg?.workspaces
  const folderCandidates = new Map<string, string>()
  for (const path of files) {
    const parts = path.split('/')
    if (parts.length < 3 || !WORKSPACE_ROOTS.includes(parts[0]) || (!MANIFESTS.includes(parts[2]) && !/\.csproj$/.test(parts[2]))) continue
    folderCandidates.set(`${parts[0]}/${parts[1]}`, parts[2])
  }
  const monorepo = workspaceTool || folderCandidates.size >= 2
  const folders: FolderResult[] = []
  if (monorepo) {
    for (const folder of [...folderCandidates.keys()].sort().slice(0, 12)) {
      folders.push(await analyzeFolder(folder, files, cachedRead, pm))
    }
  }
  if (monorepo) findings.set('monorepo', { packId: 'monorepo', label: 'Monorepo', evidence: workspaceTool ? 'workspace configuration' : `${folderCandidates.size} package folders` })

  if (['react', 'vue', 'svelte', 'angular', 'astro', 'nextjs', 'nuxt'].some((id) => findings.has(id))) {
    findings.delete('html')
    findings.delete('css')
  }
  const list = [...findings.values()]
  return { findings: list, packIds: list.map((finding) => finding.packId), project, packageManager: pm, monorepo, folders, fileCount: files.size }
}

async function analyzeFolder(folder: string, files: Set<string>, read: ReadFile, pm: string | undefined): Promise<FolderResult> {
  const prefix = `${folder}/`
  const findings = new Map<string, Finding>()
  const commands: Partial<ProjectInfo> = {}
  let name = folder.split('/')[1]
  const node = await detectNodeFolder(read, prefix, files)
  for (const finding of node.findings.values()) findings.set(finding.packId, finding)
  if (node.pkg) {
    if (node.pkg.name) name = node.pkg.name
    const scripts = node.pkg.scripts ?? {}
    const filter = (script: string) => (pm === 'pnpm' ? `pnpm --filter ${name} ${script}` : pm === 'yarn' ? `yarn workspace ${name} ${script}` : pm === 'bun' ? `bun --filter ${name} run ${script}` : `npm run ${script} --workspace ${name}`)
    if (scripts.dev) commands.dev = filter('dev')
    if (scripts.build) commands.build = filter('build')
    if (scripts.test) commands.test = filter('test')
    if (scripts.lint) commands.lint = filter('lint')
  }
  const python = await detectPythonText(read, prefix)
  if (python) {
    addFinding(findings, 'python', 'Python', `${prefix}pyproject.toml`)
    detectDeps(findings, PYTHON_DEPS, (dep) => hasToken(python, dep), 'Python dependencies')
    Object.assign(commands, pythonCommands(files, python, prefix))
  }
  if (files.has(`${prefix}go.mod`)) {
    addFinding(findings, 'go', 'Go', `${prefix}go.mod`)
    Object.assign(commands, { build: `go build ./${folder}/...`, test: `go test ./${folder}/...` })
  }
  if (files.has(`${prefix}Cargo.toml`)) {
    addFinding(findings, 'rust', 'Rust', `${prefix}Cargo.toml`)
    Object.assign(commands, { build: `cargo build -p ${name}`, test: `cargo test -p ${name}` })
  }
  const pom = await read(`${prefix}pom.xml`)
  if (pom) addFinding(findings, 'java', 'Java', `${prefix}pom.xml`)
  for (const rule of FILE_RULES) {
    if (['docker', 'terraform', 'helm', 'kubernetes', 'dbt', 'orm-js', 'tailwind', 'cypress', 'storybook'].includes(rule.pack)) {
      const hit = [...files].find((path) => path.startsWith(prefix) && rule.test(path.slice(prefix.length)))
      if (hit) addFinding(findings, rule.pack, rule.label, hit)
    }
  }
  const list = [...findings.values()]
  return { path: folder, name, findings: list, packIds: list.map((finding) => finding.packId), commands }
}
