import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const docsDir = join(root, 'docs')
const outDir = join(docsDir, 'reader')
const outFile = join(outDir, 'index.html')

const pages = [
  {
    id: 'curriculum',
    title: 'Overview',
    subtitle: 'Tiny Internet',
    layer: 0,
    file: 'CURRICULUM.md',
  },
  {
    id: 'network',
    title: 'Network',
    subtitle: 'Stage 0',
    layer: 0,
    file: '0-network/0-network.md',
  },
  {
    id: 'dns-resolver',
    title: 'Naming',
    subtitle: 'Stage 1',
    layer: 1,
    file: '1-networking-fundamentals/1-dns-resolver.md',
  },
  {
    id: 'tcp-server',
    title: 'Transport',
    subtitle: 'Stage 2',
    layer: 1,
    file: '1-networking-fundamentals/2-tcp-server.md',
  },
  {
    id: 'http-server',
    title: 'HTTP',
    subtitle: 'Stage 3',
    layer: 1,
    file: '1-networking-fundamentals/3-http-server.md',
  },
  {
    id: 'reverse-proxy',
    title: 'Reverse Proxy',
    subtitle: 'Stage 4',
    layer: 2,
    file: '2-traffic-routing/5-reverse-proxy.md',
  },
  {
    id: 'load-balancer',
    title: 'Load Balancing',
    subtitle: 'Stage 5',
    layer: 2,
    file: '2-traffic-routing/4-load-balancer.md',
  },
  {
    id: 'api-gateway',
    title: 'API Gateway',
    subtitle: 'Stage 6',
    layer: 2,
    file: '2-traffic-routing/6-api-gateway.md',
  },
  {
    id: 'http-cache-layer',
    title: 'HTTP Cache Layer',
    subtitle: 'Stage 7',
    layer: 3,
    file: '3-caching-content-delivery/8-http-cache-layer.md',
  },
  {
    id: 'cdn',
    title: 'Content Delivery',
    subtitle: 'Stage 8',
    layer: 3,
    file: '3-caching-content-delivery/7-cdn.md',
  },
  {
    id: 'key-value-store',
    title: 'Key-Value Store',
    subtitle: 'Stage 9',
    layer: 3,
    file: '3-caching-content-delivery/9-key-value-store.md',
  },
  {
    id: 'metrics-collector',
    title: 'Metrics Collector',
    subtitle: 'Stage 10',
    layer: 4,
    file: '4-reliability-observability/11-metrics-collector.md',
  },
  {
    id: 'distributed-tracing',
    title: 'Distributed Tracing',
    subtitle: 'Stage 11',
    layer: 4,
    file: '4-reliability-observability/12-distributed-tracing.md',
  },
  {
    id: 'circuit-breaker',
    title: 'Circuit Breaker',
    subtitle: 'Stage 12',
    layer: 4,
    file: '4-reliability-observability/10-circuit-breaker.md',
  },
  {
    id: 'write-ahead-log',
    title: 'Write-Ahead Log',
    subtitle: 'Stage 13',
    layer: 5,
    file: '5-data-storage/13-write-ahead-log.md',
  },
  {
    id: 'message-queue',
    title: 'Message Queue',
    subtitle: 'Stage 14',
    layer: 5,
    file: '5-data-storage/14-message-queue.md',
  },
  {
    id: 'object-storage',
    title: 'Object Storage',
    subtitle: 'Stage 15',
    layer: 5,
    file: '5-data-storage/15-object-storage.md',
  },
]

const layerLabels = {
  0: 'Start',
  1: 'Layer 1 · Networking fundamentals',
  2: 'Layer 2 · Traffic',
  3: 'Layer 3 · Caching and shared state',
  4: 'Layer 4 · Observability',
  5: 'Layer 5 · Data and storage',
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const fileToPageId = Object.fromEntries(pages.map((p) => [p.file, p.id]))

function resolveHref(href, fromFile = '') {
  if (href.startsWith('http')) return href
  const normalized = href.replace(/^\.\//, '')
  const pageId = fileToPageId[normalized]
  if (pageId) return `#${pageId}`
  if (fromFile && (href.startsWith('./') || href.startsWith('../'))) {
    const resolved = join(dirname(fromFile), href).replaceAll('\\', '/')
    const resolvedId = fileToPageId[resolved]
    if (resolvedId) return `#${resolvedId}`
  }
  if (href.startsWith('../../packages/')) return href
  if (href.startsWith('../packages/')) {
    return href.replace(/^\.\.\//, '../../')
  }
  return '#'
}

function plainText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`_]/g, '')
    .trim()
}

function inlineMarkdownNoLinks(text) {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return out
}

function inlineMarkdown(text, fromFile = '') {
  const links = []
  const withoutLinks = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, href) => {
      const index = links.length
      links.push({ label, href })
      return `\x00LINK${index}\x00`
    },
  )

  let out = inlineMarkdownNoLinks(withoutLinks)
  for (const [index, { label, href }] of links.entries()) {
    out = out.replace(
      `\x00LINK${index}\x00`,
      `<a href="${escapeHtml(resolveHref(href, fromFile))}">${inlineMarkdownNoLinks(label)}</a>`,
    )
  }
  return out
}

function slugify(text) {
  return plainText(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function parseList(lines, start, indent, fromFile) {
  const html = ['<ul>']
  let i = start
  while (i < lines.length) {
    const match = lines[i].match(/^( *)[-*] (.*)$/)
    if (!match) break
    const depth = match[1].length
    if (depth !== indent) break
    html.push(`<li>${inlineMarkdown(match[2], fromFile)}`)
    i++
    const nested = lines[i]?.match(/^( *)[-*] /)
    if (nested && nested[1].length > indent) {
      const inner = parseList(lines, i, nested[1].length, fromFile)
      html.push(inner.html)
      i = inner.i
    }
    html.push('</li>')
  }
  html.push('</ul>')
  return { html: html.join('\n'), i }
}

function markdownToHtml(markdown, pageId, fromFile = '') {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html = []
  const toc = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('|') && lines[i + 1]?.includes('---')) {
      const headerCells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
      i += 2
      const bodyRows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        bodyRows.push(
          lines[i]
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim()),
        )
        i++
      }
      html.push('<div class="table-wrap"><table>')
      html.push('<thead><tr>')
      for (const cell of headerCells) {
        html.push(`<th>${inlineMarkdown(cell, fromFile)}</th>`)
      }
      html.push('</tr></thead><tbody>')
      for (const row of bodyRows) {
        html.push('<tr>')
        for (const cell of row) {
          html.push(`<td>${inlineMarkdown(cell, fromFile)}</td>`)
        }
        html.push('</tr>')
      }
      html.push('</tbody></table></div>')
      continue
    }

    if (line.startsWith('```')) {
      i++
      const body = []
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i])
        i++
      }
      if (i < lines.length) i++
      html.push(`<pre><code>${escapeHtml(body.join('\n'))}\n</code></pre>`)
      continue
    }

    if (/^#{1,6} /.test(line)) {
      const level = line.match(/^#+/)[0].length
      const text = line.replace(/^#+\s*/, '')
      // A heading may be a link (e.g. "### [Stage 1 · Naming](./spec.md)"). The
      // TOC entry and anchor id want the label, not the markdown link syntax.
      const plainText = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      const localId = slugify(plainText)
      const id = `${pageId}-${localId}`
      const tag = `h${level}`
      if (level === 3 || level === 4) {
        toc.push({ id, text: plainText, level })
      }
      html.push(`<${tag} id="${id}">${inlineMarkdown(text, fromFile)}</${tag}>`)
      i++
      continue
    }

    if (line.startsWith('> ')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      html.push(
        `<blockquote><p>${inlineMarkdown(quoteLines.join(' '), fromFile)}</p></blockquote>`,
      )
      continue
    }

    if (line.trim() === '---') {
      html.push('<hr />')
      i++
      continue
    }

    if (/^[-*] /.test(line)) {
      const list = parseList(lines, i, 0, fromFile)
      html.push(list.html)
      i = list.i
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    html.push(`<p>${inlineMarkdown(line, fromFile)}</p>`)
    i++
  }

  const tocHtml =
    toc.length > 0
      ? `<nav class="page-toc" aria-label="On this page"><p class="page-toc-label">On this page</p><ul>${toc
          .map(
            (item) =>
              `<li class="depth-${item.level}"><a href="#${pageId}/${item.id}">${escapeHtml(item.text)}</a></li>`,
          )
          .join('')}</ul></nav>`
      : ''

  return { body: html.join('\n'), toc: tocHtml }
}

const renderedPages = pages.map((page) => {
  const markdown = readFileSync(join(docsDir, page.file), 'utf8')
  const { body, toc } = markdownToHtml(markdown, page.id, page.file)
  return { ...page, body, toc }
})

const navSections = Object.entries(layerLabels)
  .map(([layer, label]) => {
    const items = renderedPages.filter((p) => p.layer === Number(layer))
    if (items.length === 0) return ''
    return `<section class="nav-section" data-layer="${layer}">
      <h2 class="nav-heading">${label}</h2>
      <ul>
        ${items
          .map(
            (p) =>
              `<li><a href="#${p.id}" data-page="${p.id}"><span class="nav-subtitle">${escapeHtml(p.subtitle)}</span><span class="nav-title">${escapeHtml(p.title)}</span></a></li>`,
          )
          .join('\n')}
      </ul>
    </section>`
  })
  .join('\n')

const articles = renderedPages
  .map(
    (p) => `<article class="page" id="page-${p.id}" data-page="${p.id}" hidden>
      <header class="page-header">
        <p class="page-eyebrow">${escapeHtml(p.subtitle)}</p>
        <h1>${escapeHtml(p.title)}</h1>
      </header>
      <div class="page-layout">
        ${p.toc}
        <div class="page-content prose">${p.body}</div>
      </div>
    </article>`,
  )
  .join('\n')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tiny Internet</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap" rel="stylesheet" />
  <style>
    :root {
      color-scheme: light dark;
      --font-sans: "DM Sans", system-ui, sans-serif;
      --font-serif: "Source Serif 4", Georgia, serif;
      --bg: #f6f3ec;
      --bg-elevated: #fffdf8;
      --sidebar: #1c1917;
      --sidebar-text: #e7e5e4;
      --sidebar-muted: #a8a29e;
      --text: #1c1917;
      --text-muted: #57534e;
      --accent: #b45309;
      --accent-soft: #fef3c7;
      --border: #e7e5e4;
      --shadow: 0 18px 50px rgba(28, 25, 23, 0.08);
      --layer-1: #2563eb;
      --layer-2: #7c3aed;
      --layer-3: #059669;
      --layer-4: #d97706;
      --layer-5: #dc2626;
      --radius: 14px;
      --content-width: 42rem;
    }

    [data-theme="dark"] {
      --bg: #0c0a09;
      --bg-elevated: #171412;
      --sidebar: #090807;
      --sidebar-text: #f5f5f4;
      --sidebar-muted: #a8a29e;
      --text: #fafaf9;
      --text-muted: #a8a29e;
      --accent: #fbbf24;
      --accent-soft: rgba(251, 191, 36, 0.12);
      --border: #292524;
      --shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: var(--font-serif);
      font-size: 1.0625rem;
      line-height: 1.75;
      color: var(--text);
      background: var(--bg);
    }

    .app {
      display: grid;
      grid-template-columns: 18.5rem minmax(0, 1fr);
      min-height: 100vh;
    }

    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      background: var(--sidebar);
      color: var(--sidebar-text);
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      padding: 1.25rem 0 2rem;
    }

    .brand {
      padding: 0 1.25rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 1rem;
    }

    .brand-kicker {
      font-family: var(--font-sans);
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--sidebar-muted);
      margin: 0 0 0.35rem;
    }

    .brand-title {
      font-family: var(--font-sans);
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.35;
      margin: 0;
      color: #fff;
    }

    .sidebar-tools {
      display: flex;
      gap: 0.5rem;
      padding: 0 1.25rem 1rem;
    }

    .tool-btn {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: var(--sidebar-text);
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
    }

    .tool-btn:hover { background: rgba(255, 255, 255, 0.08); }

    .nav-section { margin-bottom: 1.1rem; }

    .nav-heading {
      font-family: var(--font-sans);
      font-size: 0.68rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--sidebar-muted);
      margin: 0 0 0.45rem;
      padding: 0 1.25rem;
    }

    .nav-section ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-section a {
      display: block;
      padding: 0.55rem 1.25rem;
      color: inherit;
      text-decoration: none;
      border-left: 3px solid transparent;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .nav-section a:hover { background: rgba(255, 255, 255, 0.05); }

    .nav-section a.active {
      background: rgba(255, 255, 255, 0.08);
      border-left-color: var(--accent);
    }

    .nav-section[data-layer="1"] a.active { border-left-color: var(--layer-1); }
    .nav-section[data-layer="2"] a.active { border-left-color: var(--layer-2); }
    .nav-section[data-layer="3"] a.active { border-left-color: var(--layer-3); }
    .nav-section[data-layer="4"] a.active { border-left-color: var(--layer-4); }
    .nav-section[data-layer="5"] a.active { border-left-color: var(--layer-5); }

    .nav-subtitle {
      display: block;
      font-family: var(--font-sans);
      font-size: 0.68rem;
      color: var(--sidebar-muted);
      margin-bottom: 0.1rem;
    }

    .nav-title {
      display: block;
      font-family: var(--font-sans);
      font-size: 0.92rem;
      font-weight: 600;
    }

    .nav-progress {
      display: block;
      font-family: var(--font-sans);
      font-size: 0.68rem;
      color: var(--sidebar-muted);
      margin-top: 0.15rem;
    }

    .nav-progress[data-complete="true"] {
      color: #86efac;
    }

    .main {
      padding: 2rem clamp(1.25rem, 4vw, 3rem) 4rem;
    }

    .page {
      max-width: calc(var(--content-width) + 14rem);
      animation: fadeIn 0.25s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .page-header {
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
    }

    .page-eyebrow {
      font-family: var(--font-sans);
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
      margin: 0 0 0.35rem;
      font-weight: 600;
    }

    .page-header h1 {
      font-family: var(--font-sans);
      font-size: clamp(1.85rem, 4vw, 2.5rem);
      line-height: 1.15;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .page-layout {
      display: grid;
      grid-template-columns: 11rem minmax(0, var(--content-width));
      gap: 2.5rem;
      align-items: start;
    }

    .page-toc {
      position: sticky;
      top: 2rem;
      font-family: var(--font-sans);
      font-size: 0.82rem;
    }

    .page-toc-label {
      margin: 0 0 0.65rem;
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
    }

    .page-toc ul {
      list-style: none;
      margin: 0;
      padding: 0;
      border-left: 1px solid var(--border);
    }

    .page-toc li { margin: 0; }

    .page-toc a {
      display: block;
      padding: 0.3rem 0 0.3rem 0.85rem;
      color: var(--text-muted);
      text-decoration: none;
      line-height: 1.35;
    }

    .page-toc a:hover { color: var(--accent); }
    .page-toc .depth-4 a { padding-left: 1.35rem; font-size: 0.78rem; }
    .page-toc a.progress-done { color: var(--accent); }

    .prose h3, .prose h4, .prose h5 {
      font-family: var(--font-sans);
      scroll-margin-top: 1.5rem;
    }

    .prose h3 {
      font-size: 1.15rem;
      margin: 2rem 0 0.75rem;
      color: var(--text);
    }

    .prose h4 {
      font-size: 1rem;
      margin: 1.75rem 0 0.65rem;
      color: var(--text);
    }

    .prose h5 {
      font-size: 0.92rem;
      margin: 1.25rem 0 0.5rem;
      color: var(--text);
    }

    .prose pre {
      overflow-x: auto;
      margin: 0 0 1rem;
      padding: 0.85rem 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-elevated);
    }

    .prose pre code {
      background: none;
      border: 0;
      padding: 0;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .progress-heading {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
    }

    .progress-heading .progress-title { flex: 1; min-width: 0; }

    .progress-check {
      appearance: none;
      width: 1.05rem;
      height: 1.05rem;
      margin: 0.2rem 0 0;
      flex-shrink: 0;
      border: 1.5px solid var(--border);
      border-radius: 4px;
      background: var(--bg-elevated);
      cursor: pointer;
      position: relative;
    }

    .progress-check:checked {
      background: var(--accent);
      border-color: var(--accent);
    }

    .progress-check:checked::after {
      content: "";
      position: absolute;
      left: 0.28rem;
      top: 0.05rem;
      width: 0.28rem;
      height: 0.52rem;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .progress-check:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .progress-checklist {
      list-style: none;
      padding-left: 0.15rem;
    }

    .progress-checklist li {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
    }

    .progress-checklist .progress-check {
      margin-top: 0.35rem;
      width: 0.95rem;
      height: 0.95rem;
    }

    .progress-checklist .progress-check:checked::after {
      left: 0.24rem;
      top: 0.02rem;
      width: 0.24rem;
      height: 0.46rem;
    }

    .progress-item-done > .progress-title,
    .progress-item-done > .progress-text {
      color: var(--text-muted);
    }

    .prose p { margin: 0 0 1rem; }

    .prose strong {
      font-weight: 600;
      color: var(--text);
    }

    .prose blockquote {
      margin: 1.25rem 0;
      padding: 0.85rem 1rem;
      border-left: 4px solid var(--accent);
      background: var(--accent-soft);
      border-radius: 0 var(--radius) var(--radius) 0;
    }

    .prose blockquote p { margin: 0; }

    .prose ul {
      margin: 0 0 1rem;
      padding-left: 1.25rem;
    }

    .prose li { margin-bottom: 0.35rem; }

    .prose hr {
      border: 0;
      border-top: 1px solid var(--border);
      margin: 2rem 0;
    }

    .prose code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.88em;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.12rem 0.35rem;
    }

    .prose a {
      color: var(--accent);
      text-decoration-thickness: 1px;
      text-underline-offset: 2px;
    }

    .table-wrap {
      overflow-x: auto;
      margin: 1.25rem 0 1.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--bg-elevated);
      box-shadow: var(--shadow);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--font-sans);
      font-size: 0.92rem;
    }

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    th {
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
      background: rgba(0, 0, 0, 0.02);
    }

    tr:last-child td { border-bottom: 0; }

    .mobile-toggle {
      display: none;
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 20;
      font-family: var(--font-sans);
      border: 0;
      border-radius: 999px;
      padding: 0.85rem 1rem;
      background: var(--sidebar);
      color: #fff;
      box-shadow: var(--shadow);
      cursor: pointer;
    }

    @media (max-width: 960px) {
      .app { grid-template-columns: 1fr; }
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        width: min(18.5rem, 88vw);
        transform: translateX(-105%);
        transition: transform 0.2s ease;
        z-index: 30;
      }
      .sidebar.open { transform: translateX(0); }
      .mobile-toggle { display: inline-flex; }
      .page-layout { grid-template-columns: 1fr; }
      .page-toc {
        position: static;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
        margin-bottom: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <p class="brand-kicker">Three machines, built by hand</p>
        <h1 class="brand-title">Tiny Internet</h1>
      </div>
      <div class="sidebar-tools">
        <button class="tool-btn" id="theme-toggle" type="button">Toggle theme</button>
      </div>
      <nav aria-label="Build path">${navSections}</nav>
    </aside>
    <main class="main">${articles}</main>
  </div>
  <button class="mobile-toggle" id="menu-toggle" type="button" aria-label="Open navigation">Menu</button>
  <script>
    const pages = ${JSON.stringify(renderedPages.map((p) => p.id))};
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menu-toggle");
    const themeToggle = document.getElementById("theme-toggle");
    const PROGRESS_KEY = "curriculum-progress";

    function setTheme(theme) {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("curriculum-theme", theme);
    }

    const savedTheme = localStorage.getItem("curriculum-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    themeToggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next);
    });

    menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));

    function loadProgress() {
      try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }

    function saveProgress(progress) {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    }

    function isDoneWhenParagraph(node) {
      if (!node || node.tagName !== "P") return false;
      const strong = node.querySelector("strong");
      return Boolean(strong && /^Done when:?$/i.test(strong.textContent.trim()));
    }

    function wrapStepHeading(heading) {
      if (heading.dataset.progressReady) return;
      heading.dataset.progressReady = "1";
      heading.classList.add("progress-heading");

      const title = document.createElement("span");
      title.className = "progress-title";
      while (heading.firstChild) title.appendChild(heading.firstChild);

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "progress-check";
      check.dataset.progressKey = heading.id;
      check.setAttribute("aria-label", "Mark step complete: " + title.textContent.trim());

      heading.append(check, title);
    }

    function wrapDoneWhenList(list, stepId) {
      if (list.dataset.progressReady) return;
      list.dataset.progressReady = "1";
      list.classList.add("progress-checklist");

      Array.from(list.children).forEach((li, index) => {
        if (li.tagName !== "LI") return;
        const text = document.createElement("span");
        text.className = "progress-text";
        while (li.firstChild) text.appendChild(li.firstChild);

        const check = document.createElement("input");
        check.type = "checkbox";
        check.className = "progress-check";
        check.dataset.progressKey = stepId + "/done/" + index;
        check.setAttribute(
          "aria-label",
          "Mark done-when item complete: " + text.textContent.trim(),
        );

        li.append(check, text);
      });
    }

    function initProgressMarkup() {
      document.querySelectorAll(".page").forEach((page) => {
        const content = page.querySelector(".page-content");
        if (!content) return;

        content.querySelectorAll("h4").forEach((heading) => {
          if (!/^Step\\s+\\d+/i.test(heading.textContent.trim())) return;
          wrapStepHeading(heading);

          let node = heading.nextElementSibling;
          while (node && !/^H[34]$/.test(node.tagName) && node.tagName !== "HR") {
            if (isDoneWhenParagraph(node) && node.nextElementSibling?.tagName === "UL") {
              wrapDoneWhenList(node.nextElementSibling, heading.id);
              break;
            }
            node = node.nextElementSibling;
          }
        });
      });
    }

    function applyProgressState() {
      const progress = loadProgress();

      document.querySelectorAll("[data-progress-key]").forEach((check) => {
        const key = check.dataset.progressKey;
        const done = Boolean(progress[key]);
        check.checked = done;

        const item = check.closest("li, h4");
        if (item) item.classList.toggle("progress-item-done", done);
      });

      document.querySelectorAll(".page-toc a").forEach((link) => {
        const href = link.getAttribute("href") || "";
        const slash = href.indexOf("/");
        if (slash === -1) return;
        const stepId = href.slice(slash + 1);
        link.classList.toggle("progress-done", Boolean(progress[stepId]));
      });

      document.querySelectorAll(".nav-section a[data-page]").forEach((link) => {
        const pageId = link.dataset.page;
        if (!pageId || pageId === "curriculum") return;

        const page = document.getElementById("page-" + pageId);
        if (!page) return;

        const stepChecks = page.querySelectorAll("h4.progress-heading [data-progress-key]");
        if (stepChecks.length === 0) return;

        let doneCount = 0;
        stepChecks.forEach((check) => {
          if (progress[check.dataset.progressKey]) doneCount += 1;
        });

        let badge = link.querySelector(".nav-progress");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "nav-progress";
          link.appendChild(badge);
        }
        badge.textContent = doneCount + "/" + stepChecks.length + " steps";
        badge.dataset.complete = doneCount === stepChecks.length ? "true" : "false";
      });
    }

    function initProgressTracking() {
      initProgressMarkup();
      applyProgressState();

      document.addEventListener("change", (event) => {
        const check = event.target;
        if (!(check instanceof HTMLInputElement)) return;
        if (!check.dataset.progressKey) return;

        const progress = loadProgress();
        if (check.checked) progress[check.dataset.progressKey] = true;
        else delete progress[check.dataset.progressKey];
        saveProgress(progress);
        applyProgressState();
      });
    }

    function showPage(pageId, anchor) {
      if (!pages.includes(pageId)) pageId = "curriculum";

      document.querySelectorAll(".page").forEach((el) => {
        el.hidden = el.dataset.page !== pageId;
      });

      document.querySelectorAll("[data-page]").forEach((link) => {
        if (link.tagName === "A" && link.closest(".nav-section")) {
          link.classList.toggle("active", link.dataset.page === pageId);
        }
      });

      document.title = pageId === "curriculum"
        ? "Tiny Internet"
        : document.querySelector("#page-" + pageId + " .page-header h1").textContent + " · Tiny Internet";

      sidebar.classList.remove("open");

      if (anchor) {
        requestAnimationFrame(() => {
          const target = document.getElementById(anchor);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    function parseHash() {
      const raw = location.hash.replace(/^#/, "");
      if (!raw) return { pageId: "curriculum", anchor: null };
      const slash = raw.indexOf("/");
      if (slash === -1) return { pageId: raw, anchor: null };
      return { pageId: raw.slice(0, slash), anchor: raw.slice(slash + 1) };
    }

    window.addEventListener("hashchange", () => {
      const { pageId, anchor } = parseHash();
      showPage(pageId, anchor);
    });

    document.querySelectorAll(".nav-section a[data-page]").forEach((link) => {
      link.addEventListener("click", () => sidebar.classList.remove("open"));
    });

    document.querySelectorAll(".page-toc a").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        location.hash = link.getAttribute("href").slice(1);
      });
    });

    initProgressTracking();

    const initial = parseHash();
    if (!location.hash) location.hash = "curriculum";
    showPage(initial.pageId, initial.anchor);
  </script>
</body>
</html>`

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, html, 'utf8')
console.log(`Wrote ${outFile}`)
