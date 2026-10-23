const SEGMENT = /^[A-Za-z0-9._@+()-]+$/

export function normalizePath(input: string): string | null {
  const cleaned = input.trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/{2,}/g, '/')
  if (cleaned === '') return null
  const segments = cleaned.split('/')
  for (const segment of segments) {
    if (segment === '.' || segment === '..' || !SEGMENT.test(segment)) return null
  }
  return segments.join('/')
}

export function slugFromPath(path: string): string {
  return path === '' ? 'root' : path.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}
