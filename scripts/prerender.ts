import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { EMPTY_PROJECT, generate, lineCount } from '../src/lib/generator'
import { applyPreset, encodeWorkbench, newScope } from '../src/lib/selection'
import type { Pack, Preset } from '../src/lib/types'

interface Section { h2: string; p: string[] }
interface Guide { slug: string; title: string; description: string; h1: string; lead: string; sections: Section[] }
interface Seo {
  site: { url: string; name: string; title: string; description: string; ogImage: string; keywords: string }
  hero: { h1: string; lead: string }
  features: string[]
  faq: Array<{ q: string; a: string }>
  guides: Guide[]
}

const root = join(import.meta.dirname, '..')
const dist = join(root, 'dist')
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T
const dir = (name: string) => readdirSync(join(root, 'content', name)).sort().map((file) => readJson<never>(join(root, 'content', name, file)))

const seo = readJson<Seo>(join(root, 'content', 'seo.json'))
const packs = (dir('packs') as Pack[]).sort((a, b) => a.order - b.order)
const presets = (dir('presets') as Preset[]).sort((a, b) => a.title.localeCompare(b.title))
const totalRules = packs.reduce((sum, pack) => sum + pack.rules.length, 0)
const today = new Date().toISOString().slice(0, 10)
const published = '2026-10-23'

const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fill = (text: string) => text.replace('{rules}', String(totalRules)).replace('{packs}', String(packs.length)).replace('{presets}', String(presets.length))
const jsonLd = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
const abs = (path: string) => new URL(path, seo.site.url).toString()

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: seo.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } }))
}

const appLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: seo.site.name,
  alternateName: ['AGENTS.md generator', 'AGENTS.md Generator online'],
  url: seo.site.url,
  description: seo.site.description,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires a modern web browser',
  isAccessibleForFree: true,
  inLanguage: 'en',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://opensource.org/license/mit',
  codeRepository: 'https://github.com/grzmol/AGENTS.md-generator',
  image: seo.site.ogImage,
  featureList: seo.features.map(fill)
}

const siteLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: seo.site.name, url: seo.site.url }

function crumbsLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url }))
  }
}

function layout(options: { depth: number; title: string; description: string; path: string; body: string; ld: unknown[]; ogType?: string }): string {
  const up = '../'.repeat(options.depth)
  const url = abs(options.path)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(options.title)}</title>
<meta name="description" content="${esc(options.description)}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<link rel="canonical" href="${url}" />
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="${up}static.css" />
<meta property="og:type" content="${options.ogType ?? 'article'}" />
<meta property="og:site_name" content="${esc(seo.site.name)}" />
<meta property="og:title" content="${esc(options.title)}" />
<meta property="og:description" content="${esc(options.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${seo.site.ogImage}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(options.title)}" />
<meta name="twitter:description" content="${esc(options.description)}" />
<meta name="twitter:image" content="${seo.site.ogImage}" />
${options.ld.map(jsonLd).join('\n')}
</head>
<body>
<header class="site"><a class="brand" href="${up}">AGENTS.md Generator</a><nav><a href="${up}templates/">Templates</a><a href="${up}guides/">Guides</a><a href="https://github.com/grzmol/AGENTS.md-generator">GitHub</a></nav></header>
<main>
${options.body}
</main>
<footer class="site"><p>AGENTS.md Generator is a free, open source tool that runs in your browser. <a href="${up}">Open the generator</a>.</p></footer>
</body>
</html>
`
}

function write(path: string, content: string) {
  const full = join(dist, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

function presetOutput(preset: Preset) {
  const scope = newScope(0, '', EMPTY_PROJECT, applyPreset(packs, preset))
  const text = generate(packs, scope.selected, EMPTY_PROJECT, 'agents')
  const hash = encodeWorkbench(packs, [scope], 'agents')
  const used = packs
    .map((pack) => ({ pack, count: pack.rules.filter((rule) => scope.selected.has(rule.id)).length }))
    .filter((item) => item.count > 0)
  return { scope, text, hash, used }
}

const guideLinks = (up: string) => seo.guides.map((guide) => `<li><a href="${up}guides/${guide.slug}/">${esc(guide.h1)}</a></li>`).join('')

function templatePage(preset: Preset) {
  const { scope, text, hash, used } = presetOutput(preset)
  const lines = lineCount(text)
  const path = `templates/${preset.id}/`
  const title = `AGENTS.md for ${preset.title}: Template and Generator`
  const description = `AGENTS.md template for ${preset.title}: ${scope.selected.size} ready rules and commands. Edit it in the free AGENTS.md generator and download AGENTS.md or CLAUDE.md.`
  const related = presets.filter((item) => item.id !== preset.id).slice(0, 8)
  const body = `<p class="crumbs"><a href="../../">Generator</a> / <a href="../">Templates</a> / ${esc(preset.title)}</p>
<h1>AGENTS.md for ${esc(preset.title)}</h1>
<p class="lead">${esc(preset.description)} This AGENTS.md template combines ${scope.selected.size} rules from ${used.length} packs and runs to ${lines} lines.</p>
<a class="cta" href="../../#${hash}">Open this template in the AGENTS.md generator</a>
<h2>What is inside</h2>
<ul class="list">${used.map((item) => `<li><strong>${esc(item.pack.title)}</strong> ${item.count} ${item.count === 1 ? 'rule' : 'rules'}</li>`).join('')}</ul>
<h2>The generated AGENTS.md</h2>
<p>This is the file the generator produces for the ${esc(preset.title)} preset, before you add your project name and commands.</p>
<pre>${esc(text)}</pre>
<h2>How to use it</h2>
<ul class="plain"><li>Save the text as <code>AGENTS.md</code> in your repository root, or export it as CLAUDE.md, a Cursor rule or Copilot instructions in the generator.</li><li>Add your install, dev, build, test and lint commands. Commands are the most useful lines in the file.</li><li>Delete rules that do not match your project. Shorter files are followed more reliably.</li><li>For a monorepo, add a nested file per folder in the generator.</li></ul>
<h2>Related guides</h2>
<ul class="plain">${guideLinks('../../')}</ul>
<h2>More AGENTS.md templates</h2>
<ul class="grid">${related.map((item) => `<li><a href="../${item.id}/">${esc(item.title)}<span>${esc(item.description)}</span></a></li>`).join('')}</ul>`
  write(
    `${path}index.html`,
    layout({
      depth: 2,
      title,
      description,
      path,
      body,
      ld: [
        crumbsLd([
          { name: 'AGENTS.md Generator', url: seo.site.url },
          { name: 'Templates', url: abs('templates/') },
          { name: preset.title, url: abs(path) }
        ]),
        { '@context': 'https://schema.org', '@type': 'TechArticle', headline: title, description, url: abs(path), inLanguage: 'en', datePublished: published, dateModified: today, author: { '@type': 'Person', name: 'Grzegorz' }, publisher: { '@type': 'Organization', name: seo.site.name, url: seo.site.url } }
      ]
    })
  )
}

function templatesIndex() {
  const body = `<p class="crumbs"><a href="../">Generator</a> / Templates</p>
<h1>AGENTS.md templates</h1>
<p class="lead">${presets.length} AGENTS.md templates for common stacks. Open any of them in the AGENTS.md generator, adjust the rules and download the file.</p>
<ul class="grid">${presets.map((item) => `<li><a href="${item.id}/">${esc(item.title)}<span>${esc(item.description)}</span></a></li>`).join('')}</ul>`
  write(
    'templates/index.html',
    layout({
      depth: 1,
      title: 'AGENTS.md Templates for Every Stack: Next.js, Python, Go and More',
      description: `${presets.length} free AGENTS.md templates for Next.js, React, Python, Go, Rust, Java, Rails, mobile and more. Open one in the AGENTS.md generator and customize it.`,
      path: 'templates/',
      body,
      ld: [crumbsLd([{ name: 'AGENTS.md Generator', url: seo.site.url }, { name: 'Templates', url: abs('templates/') }])]
    })
  )
}

function guidePage(guide: Guide) {
  const path = `guides/${guide.slug}/`
  const body = `<p class="crumbs"><a href="../../">Generator</a> / <a href="../">Guides</a> / ${esc(guide.h1)}</p>
<h1>${esc(guide.h1)}</h1>
<p class="lead">${esc(guide.lead)}</p>
${guide.sections.map((section) => `<h2>${esc(section.h2)}</h2>\n${section.p.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('\n')}`).join('\n')}
<p><a class="cta" href="../../">Generate your AGENTS.md</a></p>
<h2>More guides</h2>
<ul class="plain">${seo.guides.filter((item) => item.slug !== guide.slug).map((item) => `<li><a href="../${item.slug}/">${esc(item.h1)}</a></li>`).join('')}<li><a href="../../templates/">AGENTS.md templates by stack</a></li></ul>`
  write(
    `${path}index.html`,
    layout({
      depth: 2,
      title: guide.title,
      description: guide.description,
      path,
      body,
      ld: [
        crumbsLd([{ name: 'AGENTS.md Generator', url: seo.site.url }, { name: 'Guides', url: abs('guides/') }, { name: guide.h1, url: abs(path) }]),
        { '@context': 'https://schema.org', '@type': 'TechArticle', headline: guide.title, description: guide.description, url: abs(path), inLanguage: 'en', datePublished: published, dateModified: today, author: { '@type': 'Person', name: 'Grzegorz' }, publisher: { '@type': 'Organization', name: seo.site.name, url: seo.site.url } }
      ]
    })
  )
}

function guidesIndex() {
  const body = `<p class="crumbs"><a href="../">Generator</a> / Guides</p>
<h1>AGENTS.md guides</h1>
<p class="lead">Short, practical guides on writing AGENTS.md files that coding agents follow.</p>
<ul class="grid">${seo.guides.map((guide) => `<li><a href="${guide.slug}/">${esc(guide.h1)}<span>${esc(guide.description)}</span></a></li>`).join('')}</ul>`
  write(
    'guides/index.html',
    layout({
      depth: 1,
      title: 'AGENTS.md Guides: What It Is, Best Practices, CLAUDE.md and Monorepos',
      description: 'Practical AGENTS.md guides: what the file is, how it differs from CLAUDE.md, best practices and how to structure it in a monorepo.',
      path: 'guides/',
      body,
      ld: [crumbsLd([{ name: 'AGENTS.md Generator', url: seo.site.url }, { name: 'Guides', url: abs('guides/') }])]
    })
  )
}

function homeFallback(): string {
  return `<div class="prerender">
<h1>${esc(seo.hero.h1)}</h1>
<p>${esc(seo.hero.lead)}</p>
<ul>${seo.features.map((feature) => `<li>${esc(fill(feature))}</li>`).join('')}</ul>
<h2>AGENTS.md templates</h2>
<ul>${presets.map((preset) => `<li><a href="./templates/${preset.id}/">AGENTS.md for ${esc(preset.title)}</a></li>`).join('')}</ul>
<h2>Guides</h2>
<ul>${guideLinks('./')}</ul>
<h2>Frequently asked questions</h2>
${seo.faq.map((item) => `<h3>${esc(item.q)}</h3><p>${esc(item.a)}</p>`).join('')}
<noscript><p>This AGENTS.md generator needs JavaScript to run. The templates and guides above work without it.</p></noscript>
</div>`
}

function home() {
  const file = join(dist, 'index.html')
  let html = readFileSync(file, 'utf8')
  const style = '<style>.prerender{max-width:760px;margin:0 auto;padding:48px 24px;font:17px/1.55 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}.prerender h1{font-size:2.4rem;line-height:1.1;letter-spacing:-.03em}.prerender a{color:#0071e3}@media(prefers-color-scheme:dark){body{background:#000;color:#f5f5f7}}</style>'
  html = html.replace('<!--prerender-->', homeFallback()).replace('<!--jsonld-->', [style, jsonLd(appLd), jsonLd(siteLd), jsonLd(faqLd)].join('\n    '))
  writeFileSync(file, html)
}

function sitemap() {
  const urls = ['', 'templates/', 'guides/', ...presets.map((preset) => `templates/${preset.id}/`), ...seo.guides.map((guide) => `guides/${guide.slug}/`)]
  const priority = (url: string) => (url === '' ? '1.0' : url.split('/').length <= 2 ? '0.8' : '0.6')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${abs(url)}</loc><lastmod>${today}</lastmod><priority>${priority(url)}</priority></url>`).join('\n')}
</urlset>
`
  write('sitemap.xml', xml)
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`)
  return urls.length
}

copyFileSync(join(root, 'scripts', 'static.css'), join(dist, 'static.css'))
home()
templatesIndex()
presets.forEach(templatePage)
guidesIndex()
seo.guides.forEach(guidePage)
console.log(`prerendered ${sitemap()} urls`)
