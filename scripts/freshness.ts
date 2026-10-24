import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { freshness, renderReport } from '../src/lib/freshness'
import type { Pack } from '../src/lib/types'

const root = join(import.meta.dirname, '..')
const dir = join(root, 'content', 'packs')
const packs = readdirSync(dir).sort().map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as Pack)
const now = new Date()
const checkLinks = !process.argv.includes('--no-links')

async function probe(url: string): Promise<string | null> {
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'agents-md-generator-freshness' } })
      if (response.ok) return null
      if (method === 'GET' || response.status === 404 || response.status === 410) return String(response.status)
    } catch (error) {
      if (method === 'GET') return error instanceof Error ? error.name : 'error'
    }
  }
  return 'unreachable'
}

async function main() {
  const broken: Array<{ pack: string; url: string; status: string }> = []
  if (checkLinks) {
    const jobs = packs.flatMap((pack) => (pack.sources ?? []).map((source) => ({ pack: pack.id, url: source.url })))
    const unique = [...new Map(jobs.map((job) => [job.url, job])).values()]
    let cursor = 0
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (cursor < unique.length) {
          const job = unique[cursor++]
          const status = await probe(job.url)
          if (status) broken.push({ ...job, status })
        }
      })
    )
  }
  const report = freshness(packs, now)
  const text = renderReport(report, broken.sort((a, b) => a.pack.localeCompare(b.pack)), now)
  writeFileSync(join(root, 'freshness-report.md'), `${text}\n`)
  console.log(text)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `actionable=${report.stale.length + broken.length > 0}\n`)
}

main()
