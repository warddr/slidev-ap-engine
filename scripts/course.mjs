// Shared by build-course.mjs and preview-course.mjs: finding the decks of a
// course repo and turning one deck into the Markdown file Slidev builds.
import { existsSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import fg from 'fast-glob'
import fse from 'fs-extra'
import { parseSync } from '@slidev/parser'
import {
  md,
  engineRoot,
  ensureEmptyDir,
  copyIfExists,
  readTextIfExists,
  slugify,
  splitFrontmatter,
  normalizeRelativeAssetPaths,
  injectFrontmatter,
  splitCodeFences,
  collapseBlankLines,
} from './lib.mjs'

// Front matter keys that only steer the engine; they never reach Slidev.
const BUILD_KEYS = ['slug', 'order', 'notesMode', 'notes_mode', 'titlePage', 'title_page', 'publish', 'draft']

// A deck in slides/<naam>/index.md takes its slug from the folder.
const FOLDER_ENTRY_NAMES = ['index', '_index', 'readme', 'slides']

export const NOTES_MODES = ['external', 'presenter', 'inline']

export async function loadCourse(courseDir) {
  const raw = await readTextIfExists(path.join(courseDir, 'course.yml'))
  const parsed = raw ? YAML.parse(raw) || {} : {}

  // course.yml is optional. Prefer metadata in each slide deck's Markdown front matter.
  // When no decks are listed in course.yml, every slides/**/*.md file becomes a deck.
  let decks = Array.isArray(parsed.decks) && parsed.decks.length ? parsed.decks : []
  if (!decks.length) {
    const files = await fg('slides/**/*.md', { cwd: courseDir })
    decks = files.sort().map(file => ({ file }))
  }

  const normalized = []
  for (const [index, deck] of decks.entries()) {
    const file = deck.file || deck.path
    if (!file) throw new Error('Each deck needs a file property when you list decks in course.yml')
    const absolute = path.resolve(courseDir, file)
    const { frontmatter, body } = splitFrontmatter(await fs.readFile(absolute, 'utf8'))
    const fm = parseYamlObject(frontmatter, file)

    if (fm.publish === false || fm.draft === true || deck.publish === false || deck.draft === true) continue

    const name = path.basename(file, '.md')
    const defaultSlug = isFolderEntry(file) ? path.basename(path.dirname(absolute)) : name

    normalized.push({
      ...deck,
      file,
      absolute,
      frontmatterObject: fm,
      title: deck.title || fm.title || firstHeading(body) || name,
      course: deck.course || fm.course || fm.subject || parsed.course || parsed.title || '',
      slug: slugify(deck.slug || fm.slug || defaultSlug),
      order: numberOrDefault(deck.order ?? fm.order, index),
      author: deck.author || fm.author || parsed.author || '',
      date: deck.date || deck.apDate || fm.apDate || fm.date || parsed.date || '',
      notesMode: deck.notesMode || deck.notes_mode || fm.notesMode || fm.notes_mode,
      titlePage: deck.titlePage ?? deck.title_page ?? fm.titlePage ?? fm.title_page,
    })
  }

  normalized.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file))

  const slugs = new Map()
  for (const deck of normalized) {
    if (slugs.has(deck.slug)) throw new Error(`Twee decks met dezelfde slug "${deck.slug}": ${slugs.get(deck.slug)} en ${deck.file}. Zet een eigen slug in de front matter.`)
    slugs.set(deck.slug, deck.file)
  }

  if (!normalized.length) {
    throw new Error(`No decks found. Add Markdown files under ${path.join(courseDir, 'slides')} or list decks in course.yml.`)
  }

  const firstDeck = normalized[0]
  return {
    courseDir,
    title: parsed.title || parsed.course || firstDeck.course || path.basename(courseDir),
    description: parsed.description || '',
    date: parsed.date || firstDeck.date || '',
    author: parsed.author || firstDeck.author || '',
    notesMode: parsed.notesMode || parsed.notes_mode || 'external',
    titlePage: parsed.titlePage ?? parsed.title_page ?? true,
    // Extra Slidev headmatter for every deck of this course (aspectRatio, aiLabel, ...).
    headmatter: parsed.headmatter && typeof parsed.headmatter === 'object' ? parsed.headmatter : {},
    decks: normalized,
  }
}

// Copies everything Slidev needs for one deck into workDir, which becomes the
// Slidev project root (Slidev serves public/, components/, ... next to the
// entry file): the course-wide folders and the deck's folder. The theme's
// images are bundled by Vite; ap-theme/ (favicon, background of the course
// pages) lives once in the root of the built site, so only a preview, which
// has no site root, gets its own copy.
export async function prepareDeckWorkdir({ config, deck, workDir, themeAssets = false }) {
  const { courseDir } = config
  await ensureEmptyDir(workDir)
  await fse.ensureDir(path.join(workDir, 'public'))

  if (themeAssets) await copyIfExists(path.join(engineRoot, 'theme', 'assets'), path.join(workDir, 'public', 'ap-theme'))
  for (const dir of ['public', 'components', 'snippets', 'layouts', 'styles', 'setup']) {
    await copyIfExists(path.join(courseDir, dir), path.join(workDir, dir))
  }
  await syncDeckAssets({ deck, workDir })
}

export function deckEntry(deck, workDir) {
  return path.join(workDir, path.basename(deck.file))
}

// The deck's folder is copied next to the entry (for Markdown images, which
// Vite bundles) and into public/ (so <ApImage src="images/x.png"> and
// notes.html find the same files next to the built deck).
export async function syncDeckAssets({ deck, workDir }) {
  const sourceDir = path.dirname(deck.absolute)
  // The deck itself is written separately by renderDeck(); copying the raw
  // file over it would briefly show the unprocessed Markdown in a preview.
  // A flat deck (slides/h01.md) shares its folder with the folders of other
  // decks (slides/les02/index.md): those stay out.
  const ownFolder = isFolderEntry(deck.file)
  const keep = src => src !== deck.absolute && (ownFolder || src === sourceDir || !isDeckFolder(src))
  await fse.copy(sourceDir, workDir, { overwrite: true, filter: keep })
  await fse.copy(sourceDir, path.join(workDir, 'public'), { overwrite: true, filter: src => keep(src) && !src.endsWith('.md') })
}

// One changed file of the deck's folder (for the preview), or its removal.
export async function syncDeckFile({ deck, workDir, file }) {
  const sourceDir = path.dirname(deck.absolute)
  const relative = path.relative(sourceDir, file)
  const top = path.join(sourceDir, relative.split(path.sep)[0])
  if (!isFolderEntry(deck.file) && top !== file && existsSync(top) && isDeckFolder(top)) return
  const targets = [path.join(workDir, relative), path.join(workDir, 'public', relative)]
  if (!existsSync(file)) return Promise.all(targets.map(t => fse.remove(t)))
  if (statSync(file).isDirectory()) return
  await Promise.all(targets.map(t => fse.copy(file, t, { overwrite: true })))
}

function isFolderEntry(file) {
  return FOLDER_ENTRY_NAMES.includes(path.basename(file, '.md').toLowerCase())
}

function isDeckFolder(dir) {
  return statSync(dir).isDirectory() && FOLDER_ENTRY_NAMES.some(name => existsSync(path.join(dir, `${name}.md`)))
}

// Turns the author's Markdown into the Markdown file Slidev builds: AP title
// page, headmatter, notes in the requested mode. Returns the generated text,
// the notes per (visible) slide number and the number of visible slides.
// base = URL of the deck, siteBase = URL of the course pages (ap-theme/).
export async function renderDeck({ config, deck, base, siteBase = base, notesMode: notesModeOverride, pdf = true }) {
  const notesMode = normalizeNotesMode(notesModeOverride || deck.notesMode || config.notesMode)
  const { body } = splitFrontmatter(await fs.readFile(deck.absolute, 'utf8'))
  const extracted = extractNotes(body)
  let content = extracted.text

  const addTitlePage = deck.titlePage === false ? false : config.titlePage !== false
  if (addTitlePage) {
    // Notes before the first slide belong to the generated title page.
    const lead = content.match(/^\s*((?:@@AP_NOTE_\d+@@\s*)+)/)
    let titlePage = makeTitlePage(config, deck)
    if (lead) {
      titlePage += `\n\n${lead[1].trim()}`
      content = content.slice(lead[0].length)
    }
    content = appendBodyAfterTitlePage(titlePage, content)
  }

  const hasNotesPage = notesMode !== 'presenter' && extracted.notes.length > 0
  const headmatter = buildHeadmatter(config, deck, {
    addTitlePage,
    pdfUrl: pdf ? `${base}slides.pdf` : '',
    notesUrl: hasNotesPage ? `${base}notes.html` : '',
    faviconUrl: `${siteBase}ap-theme/ap-logo-color.png`,
  })

  const markdown = injectFrontmatter(normalizeRelativeAssetPaths(content), headmatter)
  const placed = placeNotes(markdown, extracted.notes, notesMode)
  return { ...placed, notesMode, hasNotesPage }
}

export function normalizeNotesMode(value) {
  const mode = String(value || 'external').toLowerCase().trim()
  if (NOTES_MODES.includes(mode)) return mode
  throw new Error(`Unknown notes mode "${value}". Use external, presenter, or inline.`)
}

// Replaces every note block by a placeholder line, so the slide it belongs to
// can be looked up later with Slidev's own parser.
function extractNotes(markdown) {
  const notes = []
  const placeholder = (_, inner) => {
    notes.push(inner.trim())
    return `\n@@AP_NOTE_${notes.length - 1}@@\n`
  }
  // Codeblokken blijven ongemoeid: een voorbeeld van :::notes in code is geen note.
  const text = splitCodeFences(String(markdown || ''))
    .map(part => part.code ? part.text : part.text
      .replace(/\{\{%\s*note\s*%\}\}([\s\S]*?)\{\{%\s*\/note\s*%\}\}/g, placeholder)
      .replace(/^:::\s*(?:notes?|course-note)\s*\n([\s\S]*?)\n:::[ \t]*$/gm, placeholder))
    .join('')
  return { text, notes }
}

function placeNotes(markdown, notes, notesMode) {
  const lines = markdown.split('\n')
  const { slides } = parseSync(markdown, 'deck.md')
  const appendAfter = new Map()
  const collected = []
  let visible = 0

  for (const slide of slides) {
    const hidden = slide.frontmatter?.disabled || slide.frontmatter?.hide
    if (!hidden) visible++
    const ids = []
    // Without other content the note goes right after the slide's front
    // matter (or separator); never inside the front matter itself.
    let lastContentLine = slide.contentStart - 1
    for (let i = slide.contentStart; i < slide.end; i++) {
      const match = lines[i].trim().match(/^@@AP_NOTE_(\d+)@@$/)
      if (match) {
        const id = Number(match[1])
        ids.push(id)
        lines[i] = notesMode === 'inline' ? renderNoteHtml(notes[id]) : null
        if (notesMode === 'inline') lastContentLine = i
      }
      else if (lines[i].trim()) lastContentLine = i
    }
    if (!ids.length) continue

    const noteMarkdown = ids.map(id => notes[id]).join('\n\n')
    if (!hidden) collected.push({ slide: visible, markdown: noteMarkdown, html: md.render(noteMarkdown) })
    // Slidev only reads a comment at the very end of a slide as its note.
    if (notesMode === 'presenter') appendAfter.set(lastContentLine, `\n<!--\n${noteMarkdown.replace(/-->/g, '→')}\n-->`)
  }

  const out = []
  lines.forEach((line, i) => {
    if (line !== null) out.push(line)
    if (appendAfter.has(i)) out.push(appendAfter.get(i))
  })
  return {
    markdown: collapseBlankLines(out.join('\n')),
    notes: collected,
    slideCount: visible,
  }
}

function renderNoteHtml(noteMarkdown) {
  const html = md.render(noteMarkdown.trim())
  return `<div class="ap-course-note">\n<div class="ap-course-note__title">Cursusmateriaal</div>\n<div class="ap-course-note__body">\n${html}\n</div>\n</div>`
}

function buildHeadmatter(config, deck, { addTitlePage, pdfUrl, notesUrl, faviconUrl }) {
  const course = deck.course || config.title
  const base = {
    theme: 'slidev-theme-ap',
    title: deck.title,
    titleTemplate: course && course !== deck.title ? `%s – ${course}` : '%s',
    course,
    chapter: deck.title,
    apDate: deck.date || config.date,
    author: deck.author || config.author,
    favicon: faviconUrl,
    download: pdfUrl || false,
    apPdf: pdfUrl,
    apNotes: notesUrl,
    drawings: { persist: false },
    defaults: { layout: 'default' },
  }

  // Original Markdown front matter wins for normal Slidev options,
  // but build-only keys are removed so they do not leak into Slidev config.
  const original = { ...deck.frontmatterObject }
  for (const key of BUILD_KEYS) delete original[key]

  const merged = stripEmpty({ ...base, ...config.headmatter, ...original })

  // When the AP title page is generated, it is the first Slidev slide.
  // Its layout must therefore live in the document front matter.
  // Adding a separate `--- layout: cover ---` block before the first slide
  // creates an empty slide in Slidev's build/PDF output.
  if (addTitlePage) merged.layout = 'cover'

  return YAML.stringify(merged).trim()
}

function makeTitlePage(config, deck) {
  const esc = (v) => String(v || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const course = deck.course || config.title || ''
  const author = deck.author || config.author || ''

  // Zoals de titelslide van de reveal-decks: vak, les, auteur. HTML i.p.v.
  // Markdown-koppen, zodat er nooit een losse '#' in de PDF belandt.
  return [
    course ? `<h1>${esc(course)}</h1>` : '',
    deck.title ? `<h2>${esc(deck.title)}</h2>` : '',
    author ? `<p>${esc(author)}</p>` : '',
  ].filter(Boolean).join('\n')
}

function appendBodyAfterTitlePage(titlePage, body) {
  const trimmedBody = String(body || '').trimStart()
  if (!trimmedBody) return titlePage
  const separator = trimmedBody.startsWith('---') ? '\n\n' : '\n\n---\n\n'
  return `${titlePage}${separator}${trimmedBody}`
}

function stripEmpty(value) {
  return Object.fromEntries(Object.entries(value).filter(([, val]) => val !== undefined && val !== null && val !== ''))
}

function parseYamlObject(frontmatter, file) {
  if (!frontmatter) return {}
  try {
    const parsed = YAML.parse(frontmatter)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    throw new Error(`Invalid YAML front matter in ${file}: ${err.message}`)
  }
}

function firstHeading(markdown) {
  return String(markdown || '').match(/^#\s+(.+?)\s*$/m)?.[1]?.trim()
}

function numberOrDefault(value, fallback) {
  const number = Number(value)
  return value !== undefined && value !== null && value !== '' && Number.isFinite(number) ? number : fallback
}
