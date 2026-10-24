# AGENTS.md Generator

Free, open source **AGENTS.md generator**. Pick rules for your stack with toggles, add your project commands and download `AGENTS.md`, `CLAUDE.md`, Cursor rule files or GitHub Copilot instructions. Everything runs in your browser.

Live site: https://grzmol.github.io/AGENTS.md-generator/ (enable Pages with the GitHub Actions source in the repository settings).

- [AGENTS.md templates](https://grzmol.github.io/AGENTS.md-generator/templates/) for every preset
- [Guides](https://grzmol.github.io/AGENTS.md-generator/guides/): what AGENTS.md is, AGENTS.md vs CLAUDE.md, best practices, monorepos

## SEO

The app is client rendered, so `scripts/prerender.ts` runs after `vite build` and adds crawlable HTML: prerendered home content with FAQ, one landing page per preset under `/templates/`, guides under `/guides/`, JSON-LD (WebApplication, FAQPage, TechArticle, BreadcrumbList), canonical URLs, Open Graph tags, `sitemap.xml` and `robots.txt`. Copy lives in `content/seo.json`; a test keeps the primary keyword in the title, description and heading.

Off-site steps that cannot be done from the code: set the repository description, website and topics (`agents-md`, `agents-md-generator`, `ai-coding-agents`, `claude-code`, `cursor-rules`), and consider a custom domain that contains the keyword.

## Repository scan

The Scan repository view detects a stack without any backend. It accepts a public GitHub URL (`owner/repo`, a full URL or a `/tree/branch/folder` link), which uses the GitHub tree API and `raw.githubusercontent.com` from the browser (60 anonymous API requests per hour), or a local folder (File System Access API, with a folder input fallback), which never uploads anything.

`src/lib/scan.ts` reads manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `composer.json`, `Gemfile` and others), file names and lockfiles, and returns detected packs with their evidence, project commands (package manager aware), and monorepo package folders that become nested files. `src/lib/scan-apply.ts` turns that into a rule selection: recommended rules of the detected packs plus a base set. Detection is heuristic, so the UI shows the evidence for every finding.

## Keeping AGENTS.md up to date

`cli/agents-md.ts` scans a directory with the same detection as the app and rewrites only the block between `<!-- agents-md-generator:start -->` and `<!-- agents-md-generator:end -->`. Text outside the markers is never touched, and a file without markers is skipped unless `--adopt` is passed.

```
npm run agents:update      # write
npm run agents:check       # exit 1 when a file is missing or stale
npx tsx cli/agents-md.ts --dir ../other-repo --dry-run
```

`action.yml` wraps the CLI as a composite GitHub Action (`mode: update` opens a pull request through peter-evans/create-pull-request, `mode: check` fails on drift). The app has a Keep it updated view that generates both workflows. Optional `.agents-md.json` supports `include`, `exclude`, `nested` and `project` overrides. This repository runs the action weekly on itself (`.github/workflows/agents-md.yml`).

Maintenance workflows: `dependabot.yml` groups npm and Actions updates weekly, and `content-freshness.yml` opens a monthly issue listing packs reviewed more than six months ago, broken source links and never reviewed packs (`npm run freshness` runs it locally).

## Monorepo mode

Add a folder (for example `apps/web`) to produce a nested file for it. Each folder keeps its own selection, project details and commands. Output paths per format:

- AGENTS.md: `AGENTS.md`, `apps/web/AGENTS.md`
- CLAUDE.md: `CLAUDE.md`, `apps/web/CLAUDE.md`
- Cursor: `.cursor/rules/agents.mdc`, `.cursor/rules/apps-web.mdc` with `globs: apps/web/**`
- Copilot: `.github/copilot-instructions.md`, `.github/instructions/apps-web.instructions.md` with `applyTo`

Several files download as one `.zip`. Nested scopes started from a preset keep only technology and skill rules, because conventions are inherited from the root file.

## Develop

```
npm install
npm run dev
npm run check
npm test
npm run build
```

Stack: Svelte 5, Vite, TypeScript, Vitest.

## Content

Currently 1280 rules in 161 packs and 57 presets.

Rules live in `content/packs/*.json` and presets in `content/presets/*.json`. Adding a rule is a one-file change.

A rule has `id` (prefixed with its pack id), `title`, `text` (one imperative line), optional `recommended`, optional `group` (rules sharing a group in one pack are mutually exclusive and render as radios) and optional `url` for skills.

Tests validate unique ids, radio groups, preset references, rule length and the absence of em dashes.

## Patterns from large projects

Newer general packs (communication, verification, agent docs, code comments, contributing, AI policy, API stability, generated code, imports and exports, test craft, public repository hygiene) and many technology rules were distilled from the AGENTS.md files of large open source projects such as LangChain, Ruff, uv, Supabase, Prisma, Grafana, Home Assistant, Vercel AI SDK, Rust, Node.js, Kafka, Spark, Elasticsearch, Kubernetes, Cloudflare Workers, SvelteKit, Angular, React Router, Vitest, Storybook, Mastra, the MCP Python SDK, Ghostty, Biome, llama.cpp, vLLM and Ray. Rules are paraphrased, generalized to apply outside the source project, and linked in each pack under its sources. Policy-style rules (for example the AI policy pack) are opt-in, because they only fit some repositories.

## Quality review

109 of 161 packs carry a `reviewed` field and were checked against official documentation in October 2026 (framework, language and tool docs through Context7, Claude and Claude Code docs, OWASP cheat sheets and the Solidity, Go and Rust sources on GitHub). Rules were corrected where documentation had moved on, for example Next.js 15 caching defaults, FastAPI lifespan events, React Compiler memoization, Angular OnPush as the default, Supabase secret keys and Claude Code reading AGENTS.md directly.

The `reviewed` pack list is generated from the content files; the UI shows the date and sources on each reviewed pack.

Not checked against primary sources: the Cursor and Copilot file formats (the hosts were unreachable), the remaining general convention packs (they are editorial, not tied to one source), and these technology packs: Jupyter, C, Bash, Makefile, Scala, RabbitMQ and SQS, data engineering, AWS, RAG, agent building, payments, SEO, skills, Zig, just, Gradle, pytest and Python library packaging. Go and Rust were checked only for the context package and Clippy.

## Licensing

Code is MIT. Content in `content/` is original wording under CC0. Third-party sources are linked, never copied verbatim. See `content/LICENSE`.

## Sources

Format and conventions: [agents.md](https://agents.md), [Conventional Commits](https://www.conventionalcommits.org), [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org), [PEP 8](https://peps.python.org/pep-0008/), [Effective Go](https://go.dev/doc/effective_go), [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/), [anthropics/skills](https://github.com/anthropics/skills).
