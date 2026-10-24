export const ACTION_REF = 'grzmol/AGENTS.md-generator@main'

export interface UpdateOptions {
  adopt: boolean
  weekday: number
}

export function updateWorkflow(options: UpdateOptions): string {
  const lines = [
    'name: Update AGENTS.md',
    '',
    'on:',
    '  schedule:',
    `    - cron: "17 6 * * ${options.weekday}"`,
    '  workflow_dispatch:',
    '',
    'permissions:',
    '  contents: write',
    '  pull-requests: write',
    '',
    'jobs:',
    '  update:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v6',
    `      - uses: ${ACTION_REF}`
  ]
  if (options.adopt) lines.push('        with:', '          adopt: "true"')
  return `${lines.join('\n')}\n`
}

export function checkWorkflow(): string {
  return `${[
    'name: AGENTS.md drift check',
    '',
    'on:',
    '  pull_request:',
    '    paths:',
    '      - "**/package.json"',
    '      - "**/pyproject.toml"',
    '      - "**/requirements*.txt"',
    '      - "**/go.mod"',
    '      - "**/Cargo.toml"',
    '      - "**/pom.xml"',
    '      - "**/AGENTS.md"',
    '',
    'permissions:',
    '  contents: read',
    '',
    'jobs:',
    '  check:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v6',
    `      - uses: ${ACTION_REF}`,
    '        with:',
    '          mode: check'
  ].join('\n')}\n`
}

export function configSnippet(): string {
  return `${JSON.stringify({ include: ['logging'], exclude: ['a11y'], nested: true, project: { test: 'npm test' } }, null, 2)}\n`
}
