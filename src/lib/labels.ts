export const FAMILY_LABELS: Record<string, string> = {
  javascript: 'JavaScript and web',
  python: 'Python',
  systems: 'Systems and shell',
  jvm: 'JVM',
  dotnet: '.NET',
  php: 'PHP',
  ruby: 'Ruby',
  beam: 'Elixir',
  mobile: 'Mobile',
  data: 'Data and storage',
  devops: 'DevOps',
  cloud: 'Cloud',
  ai: 'AI and LLMs',
  web: 'Web platform',
  web3: 'Web3',
  gamedev: 'Games'
}

export function familyLabel(family: string): string {
  return FAMILY_LABELS[family] ?? family
}

const GROUP_LABELS: Record<string, string> = {
  indent: 'Indentation',
  width: 'Line length',
  quotes: 'Quotes',
  semi: 'Semicolons',
  ident: 'Identifier style',
  files: 'File names',
  'log-format': 'Log format',
  'agent-comments': 'Code comments'
}

export function groupLabel(group: string): string {
  const known = GROUP_LABELS[group]
  if (known) return known
  const words = group.replace(/-/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
