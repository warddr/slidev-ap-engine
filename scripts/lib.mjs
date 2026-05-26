import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import fse from 'fs-extra'
import MarkdownIt from 'markdown-it'

export const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'slides'
}

export function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=', 2)
      if (inline !== undefined) out[key] = inline
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out[key] = argv[++i]
      else out[key] = true
    }
  }
  return out
}

export async function readTextIfExists(file) {
  try { return await fs.readFile(file, 'utf8') }
  catch (err) { if (err.code === 'ENOENT') return null; throw err }
}

export async function ensureEmptyDir(dir) {
  await fse.remove(dir)
  await fse.ensureDir(dir)
}

export async function copyIfExists(src, dest) {
  if (await fse.pathExists(src)) await fse.copy(src, dest, { overwrite: true })
}

export function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    })
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))
    })
  })
}

export function splitFrontmatter(source) {
  const normalized = source.replace(/^\uFEFF/, '')
  if (!normalized.startsWith('---\n')) return { frontmatter: '', body: normalized }
  const end = normalized.indexOf('\n---', 4)
  if (end === -1) return { frontmatter: '', body: normalized }
  return {
    frontmatter: normalized.slice(4, end).trim(),
    body: normalized.slice(end + 4).replace(/^\n/, '')
  }
}

export function extractTitleFromFrontmatter(frontmatter) {
  const match = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  return match?.[1]?.trim()
}

export function defaultFrontmatter({ title, course, chapter, slug, date }) {
  const escaped = (v) => String(v || '').replace(/"/g, '\\"')
  return [
    'theme: slidev-theme-ap',
    `title: "${escaped(title || chapter || course || slug)}"`,
    course ? `course: "${escaped(course)}"` : '',
    chapter ? `chapter: "${escaped(chapter)}"` : '',
    date ? `apDate: "${escaped(date)}"` : '',
    'download: ./slides.pdf',
    'drawings:',
    '  persist: false',
    'defaults:',
    '  layout: default',
  ].filter(Boolean).join('\n')
}

function renderNoteHtml(noteMarkdown) {
  const html = md.render(noteMarkdown.trim())
  return `<div class="ap-course-note">\n<div class="ap-course-note__title">Cursusmateriaal</div>\n<div class="ap-course-note__body">\n${html}\n</div>\n</div>`
}

function renderPresenterNote(noteMarkdown) {
  const cleaned = noteMarkdown.trim().replace(/-->/g, '→')
  return `<!--\n${cleaned}\n-->`
}

function normalizeNotesMode(value) {
  const mode = String(value || 'external').toLowerCase().trim()
  if (['external', 'presenter', 'inline'].includes(mode)) return mode
  throw new Error(`Unknown notes mode "${value}". Use external, presenter, or inline.`)
}

export function transformNotesAndCollect(body, options = {}) {
  const notesMode = normalizeNotesMode(options.notesMode)
  const notes = []
  let slideIndex = 0
  const chunks = body.split(/\n(?=---\s*(?:\n|$))/g)
  const transformedChunks = chunks.map((chunk, index) => {
    slideIndex = index + 1
    let local = chunk
    const noteMarkdowns = []

    const noteReplacement = (_, inner) => {
      const note = inner.trim()
      noteMarkdowns.push(note)
      if (notesMode === 'inline') return renderNoteHtml(note)
      if (notesMode === 'presenter') return renderPresenterNote(note)
      return ''
    }

    local = local.replace(/\{\{%\s*note\s*%\}\}([\s\S]*?)\{\{%\s*\/note\s*%\}\}/g, noteReplacement)
    local = local.replace(/^:::notes?\s*\n([\s\S]*?)\n:::$/gm, noteReplacement)
    local = local.replace(/^::: ?course-note\s*\n([\s\S]*?)\n:::$/gm, noteReplacement)

    for (const note of noteMarkdowns) {
      notes.push({ slide: slideIndex, markdown: note, html: md.render(note) })
    }
    return local.replace(/\n{3,}/g, '\n\n')
  })

  return { body: transformedChunks.join('\n'), notes, notesMode }
}


export function normalizeRelativeAssetPaths(markdown) {
  // Slidev/Vite treats paths like "images/foo.png" inside Markdown/HTML as
  // bare imports in some contexts. Prefix local chapter assets with "./" so
  // they resolve relative to the deck file that the engine copies into the
  // temporary build directory.
  let text = String(markdown || '')
  const folders = '(?:images|img|media|downloads|files)'

  // Markdown images/links: ![](images/a.png) or [file](downloads/a.pdf)
  text = text.replace(new RegExp(`(\\[[^\\]]*\\]\\()(${folders}\\/[^)\\s]+)`, 'g'), '$1./$2')

  // HTML attributes: <img src="images/a.png">, <a href='downloads/a.pdf'>
  text = text.replace(new RegExp(`(\\b(?:src|href)=(["']))(${folders}\\/[^"']+)(\\2)`, 'g'), '$1./$3$4')

  // CSS-style urls in inline styles: url(images/a.png)
  text = text.replace(new RegExp(`url\\((['"]?)(${folders}\\/[^)'"\\s]+)\\1\\)`, 'g'), 'url($1./$2$1)')

  return text
}

export function injectFrontmatter(source, fm) {
  // The source passed to the engine has already had its original document
  // front matter removed. Always prepend the generated global front matter.
  // This preserves slide-level front matter blocks such as "layout: cover".
  return `---\n${String(fm || '').trim()}\n---\n\n${String(source || '').replace(/^\n+/, '')}`
}

export async function writeNotesHtml({ outFile, deckTitle, courseTitle, notes }) {
  const toc = notes.length
    ? `<nav class="toc"><strong>Inhoud</strong>${notes.map(n => `<a href="#slide-${n.slide}">Slide ${n.slide}</a>`).join('')}</nav>`
    : ''
  const noteSections = notes.length
    ? notes.map(n => `<section class="note" id="slide-${n.slide}"><div class="note-meta"><h2>Slide ${n.slide}</h2><a href="./${n.slide}/" class="slide-link">Open slide ${n.slide}</a></div>${n.html}</section>`).join('\n')
    : '<p>Er zijn geen cursusnotities gevonden voor dit hoofdstuk.</p>'

  const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(deckTitle)} - cursusmateriaal</title>
<style>
:root{--ap-red:#ad0f0a;--ap-dark:#404040;--ap-light:#e7e6e6;--ap-bg:#fff;}
*{box-sizing:border-box;}
html{scroll-behavior:smooth;}
body{font-family:Arial,Helvetica,sans-serif;color:var(--ap-dark);margin:0;background:var(--ap-bg);line-height:1.62;font-size:18px;}
header{background:var(--ap-red);color:white;padding:2.6rem 3rem;background-image:linear-gradient(rgba(173,15,10,.55),rgba(173,15,10,.55)),url('./ap-theme/ap-background.jpg');background-size:cover;background-position:center;}
header h1{margin:0;font-size:2.5rem;line-height:1.06;max-width:980px;}header p{margin:.55rem 0 0;opacity:.94;font-size:1.05rem;}
.wrapper{display:grid;grid-template-columns:minmax(170px,230px) minmax(0,880px);gap:2rem;max-width:1180px;margin:2rem auto 4rem;padding:0 1.2rem;align-items:start;}
.toc{position:sticky;top:1rem;border-left:8px solid var(--ap-red);background:#f7f7f7;padding:.9rem 1rem;display:flex;flex-direction:column;gap:.45rem;font-size:.9rem;}
.toc strong{color:var(--ap-red);text-transform:uppercase;letter-spacing:.04em;font-size:.78rem;margin-bottom:.25rem;}
.note{border-left:8px solid var(--ap-red);background:#f8f8f8;margin:0 0 1.25rem;padding:1.15rem 1.35rem;box-shadow:0 1px 2px rgba(0,0,0,.08);}
.note-meta{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid #e1e1e1;padding-bottom:.55rem;margin-bottom:.85rem;}
.note h2{color:var(--ap-red);font-size:.95rem;text-transform:uppercase;letter-spacing:.04em;margin:0;}
a{color:var(--ap-red);text-decoration:none;border-bottom:1px solid rgba(173,15,10,.25);}a:hover{border-bottom-color:currentColor;}
.slide-link{font-size:.82rem;font-weight:700;white-space:nowrap;}
main h1,main h2,main h3{line-height:1.2;}main h1{font-size:1.8rem;color:var(--ap-red);}main h2{font-size:1.45rem;color:var(--ap-red);}main h3{font-size:1.16rem;color:var(--ap-dark);} 
main p{margin:.55rem 0 .8rem;}main li+li{margin-top:.25rem;} code{color:var(--ap-red);} pre{overflow:auto;background:#eee;padding:1rem;border-left:4px solid #ddd;} img{max-width:100%;height:auto;}
@media (max-width:840px){body{font-size:16px;}header{padding:1.8rem 1.2rem;}header h1{font-size:2rem}.wrapper{display:block}.toc{position:relative;margin-bottom:1.2rem}.note-meta{align-items:flex-start;flex-direction:column;}}
@media print{body{font-size:12pt}.toc,.slide-link{display:none}.wrapper{display:block;max-width:none;margin:0;padding:0}.note{break-inside:avoid;background:white;box-shadow:none}.note{border-left:5pt solid var(--ap-red)}}
</style>
</head>
<body>
<header><h1>${escapeHtml(deckTitle)}</h1><p>${escapeHtml(courseTitle || '')} - cursusmateriaal bij de slides</p></header>
<div class="wrapper">${toc}<main>${noteSections}</main></div>
</body>
</html>`
  await fs.writeFile(outFile, html, 'utf8')
}

export async function writeCourseIndex({ outFile, title, decks }) {
  const cards = decks.map(deck => `<article class="card"><span class="kicker">${escapeHtml(deck.slug)}</span><strong>${escapeHtml(deck.title)}</strong><div class="links"><a href="./${deck.slug}/">Slides</a><a href="./${deck.slug}/notes.html">Cursusmateriaal</a><a href="./${deck.slug}/slides.pdf">PDF</a></div></article>`).join('\n')
  const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
:root{--ap-red:#ad0f0a;--ap-dark:#404040;--ap-light:#e7e6e6;}
body{font-family:Arial,Helvetica,sans-serif;margin:0;color:var(--ap-dark);background:#fff;}
header{background:var(--ap-red);color:white;padding:3rem 4rem;background-image:linear-gradient(rgba(173,15,10,.45),rgba(173,15,10,.45)),url('./ap-theme/ap-background.jpg');background-size:cover;background-position:center;}
h1{font-size:2.6rem;margin:0;line-height:1.05}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1rem;max-width:1080px;margin:2rem auto;padding:0 1rem}.card{display:flex;flex-direction:column;gap:.65rem;border:1px solid #e1e1e1;text-decoration:none;color:var(--ap-dark);padding:1.2rem;border-left:8px solid var(--ap-red);box-shadow:0 1px 2px rgba(0,0,0,.06)}.card:hover{background:#f8f8f8}.card strong{font-size:1.25rem}.kicker{font-size:.75rem;color:#888;text-transform:uppercase;letter-spacing:.06em}.links{display:flex;gap:.55rem;flex-wrap:wrap}.links a{color:var(--ap-red);font-weight:700;text-decoration:none;border-bottom:1px solid rgba(173,15,10,.28)}.links a:hover{border-bottom-color:currentColor}
</style>
</head>
<body>
<header><h1>${escapeHtml(title)}</h1></header>
<main class="grid">${cards}</main>
</body>
</html>`
  await fs.writeFile(outFile, html, 'utf8')
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
