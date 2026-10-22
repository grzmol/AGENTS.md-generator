# AGENTS.md Generator

Static site that builds an `AGENTS.md` (also `CLAUDE.md`, Cursor `.mdc` and Copilot instructions) from checkboxes. Pick conventions for formatting, naming, logging, design systems, testing, git and security, add technology packs and skills, and copy or download the result. Everything runs in the browser.

Live site: https://grzmol.github.io/AGENTS.md-generator/ (after enabling Pages with the GitHub Actions source in repository settings).

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

Currently 887 rules in 129 packs and 45 presets.

Rules live in `content/packs/*.json` and presets in `content/presets/*.json`. Adding a rule is a one-file change.

A rule has `id` (prefixed with its pack id), `title`, `text` (one imperative line), optional `recommended`, optional `group` (rules sharing a group in one pack are mutually exclusive and render as radios) and optional `url` for skills.

Tests validate unique ids, radio groups, preset references, rule length and the absence of em dashes.

## Quality review

Packs with a `reviewed` field were checked against official documentation in October 2026 (TypeScript, React, Next.js, Svelte, Vue, Angular, Node.js, Express, Tailwind, Python and uv, FastAPI, Django, Pydantic, SQLAlchemy, Prisma, Docker, Kubernetes, Terraform, GitHub Actions, PostgreSQL, Spring Boot, Claude API, Git, password storage, Go context, Clippy). Rules were corrected where documentation had moved on, for example Next.js 15 caching defaults, FastAPI lifespan events and React Compiler memoization.

Also checked: TanStack Query, Astro, Nuxt, Flask, Laravel, Rails, Flutter, Redis, MongoDB, Kafka, MCP, ASP.NET Core, Supabase, Temporal, gRPC, Elasticsearch, Flyway and Firebase.

Not yet checked against primary sources: Cursor and Copilot file formats (hosts unreachable during review), Go beyond context, Rust beyond Clippy, and the remaining packs. Each reviewed pack shows its date and sources in the UI.

## Licensing

Code is MIT. Content in `content/` is original wording under CC0. Third-party sources are linked, never copied verbatim. See `content/LICENSE`.

## Sources

Format and conventions: [agents.md](https://agents.md), [Conventional Commits](https://www.conventionalcommits.org), [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org), [PEP 8](https://peps.python.org/pep-0008/), [Effective Go](https://go.dev/doc/effective_go), [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/), [anthropics/skills](https://github.com/anthropics/skills).
