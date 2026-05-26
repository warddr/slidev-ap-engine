#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import fg from 'fast-glob'
import fse from 'fs-extra'
import {
  engineRoot,
  parseArgs,
  ensureEmptyDir,
  copyIfExists,
  run,
  readTextIfExists,
  slugify,
  splitFrontmatter,
  transformNotesAndCollect,
  normalizeRelativeAssetPaths,
  injectFrontmatter,
  writeNotesHtml,
  writeCourseIndex,
} from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
const courseDir = path.resolve(args.course || process.cwd())
const outDir = path.resolve(args.out || path.join(courseDir, 'dist'))
const baseRoot = normalizeBase(args.base || '/')
const skipExport = Boolean(args['skip-export'])
const notesModeArg = args['notes-mode'] || args.notesMode

const slidevBin = path.join(engineRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'slidev.cmd' : 'slidev')

async function main() {
  await fse.ensureDir(outDir)
  await fse.emptyDir(outDir)

  const config = await loadCourseConfig(courseDir)
  const workRoot = path.join(engineRoot, '.slidev-work', slugify(config.title || path.basename(courseDir)))
  await ensureEmptyDir(workRoot)

  // Copy theme assets to root output as well for index and notes.
  await copyIfExists(path.join(engineRoot, 'theme', 'public'), path.join(outDir, 'ap-theme'))

  const builtDecks = []
  for (const deck of config.decks) {
    const result = await buildDeck({ config, deck, workRoot })
    builtDecks.push(result)
  }

  await writeCourseIndex({ outFile: path.join(outDir, 'index.html'), title: config.title, decks: builtDecks })
  console.log(`\nDone. Course generated in ${outDir}`)
}

async function loadCourseConfig(courseDir) {
  const courseFile = path.join(courseDir, 'course.yml')
  const raw = await readTextIfExists(courseFile)
  let parsed = {}
  if (raw) parsed = YAML.parse(raw) || {}

  // course.yml is optional. Prefer metadata in each slide deck's Markdown front matter.
  // When no decks are listed in course.yml, every slides/**/*.md file becomes a deck.
  const decksFromConfig = Array.isArray(parsed.decks) && parsed.decks.length > 0
  let decks = decksFromConfig ? parsed.decks : []
  if (!decks.length) {
    const files = await fg('slides/**/*.md', { cwd: courseDir })
    decks = files.sort().map(file => ({ file }))
  }

  const normalizedDecks = []
  for (const [index, deck] of decks.entries()) {
    const file = deck.file || deck.path
    if (!file) throw new Error('Each deck needs a file property when you list decks in course.yml')
    const absolute = path.resolve(courseDir, file)
    const source = await fs.readFile(absolute, 'utf8')
    const { frontmatter, body } = splitFrontmatter(source)
    const fm = parseYamlObject(frontmatter)

    if (fm.publish === false || fm.draft === true || deck.publish === false || deck.draft === true) {
      continue
    }

    const title = deck.title || fm.title || firstHeading(body) || path.basename(file, '.md')
    const course = deck.course || fm.course || fm.subject || parsed.course || parsed.title || ''
    const slug = slugify(deck.slug || fm.slug || path.basename(file, '.md'))
    const order = numberOrDefault(deck.order ?? fm.order, index)

    normalizedDecks.push({
      ...deck,
      file,
      absolute,
      frontmatter,
      frontmatterObject: fm,
      title,
      course,
      slug,
      order,
      subtitle: deck.subtitle || deck.subTitle || fm.subtitle || fm.subTitle || '',
      author: deck.author || fm.author || parsed.author || '',
      date: deck.date || deck.apDate || fm.apDate || fm.date || parsed.date || '',
      notesMode: deck.notesMode || deck.notes_mode || fm.notesMode || fm.notes_mode || parsed.notesMode || parsed.notes_mode,
      titlePage: deck.titlePage ?? deck.title_page ?? fm.titlePage ?? fm.title_page,
    })
  }

  normalizedDecks.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.file.localeCompare(b.file)
  })

  if (!normalizedDecks.length) {
    throw new Error(`No decks found. Add Markdown files under ${path.join(courseDir, 'slides')} or list decks in course.yml.`)
  }

  const firstDeck = normalizedDecks[0] || {}
  return {
    title: parsed.title || parsed.course || firstDeck.course || path.basename(courseDir),
    date: parsed.date || firstDeck.date || '',
    author: parsed.author || firstDeck.author || '',
    footer: parsed.footer || '',
    notesMode: parsed.notesMode || parsed.notes_mode || 'external',
    titlePage: parsed.titlePage ?? parsed.title_page ?? true,
    decks: normalizedDecks,
  }
}

function parseYamlObject(frontmatter) {
  if (!frontmatter) return {}
  try {
    const parsed = YAML.parse(frontmatter)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    throw new Error(`Invalid YAML front matter: ${err.message}`)
  }
}

function firstHeading(markdown) {
  const match = String(markdown || '').match(/^#\s+(.+?)\s*$/m)
  return match?.[1]?.trim()
}

function numberOrDefault(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

async function buildDeck({ config, deck, workRoot }) {
  console.log(`\n=== Building ${deck.slug}: ${deck.title} ===`)
  const deckWork = path.join(workRoot, deck.slug)
  await ensureEmptyDir(deckWork)
  await fse.ensureDir(path.join(deckWork, 'source'))
  await fse.ensureDir(path.join(deckWork, 'public'))

  // Shared static assets.
  await copyIfExists(path.join(engineRoot, 'theme', 'public'), path.join(deckWork, 'public', 'ap-theme'))
  await copyIfExists(path.join(courseDir, 'public'), path.join(deckWork, 'public'))
  await copyIfExists(path.join(courseDir, 'assets'), path.join(deckWork, 'assets'))
  await copyIfExists(path.join(courseDir, 'components'), path.join(deckWork, 'components'))
  await copyIfExists(path.join(courseDir, 'snippets'), path.join(deckWork, 'snippets'))

  // Preserve relative assets near the original markdown file.
  const sourceDir = path.dirname(deck.absolute)
  const sourceTargetDir = path.join(deckWork, 'source')
  await copyIfExists(sourceDir, sourceTargetDir)

  const original = await fs.readFile(deck.absolute, 'utf8')
  const { body } = splitFrontmatter(original)
  const transformed = transformNotesAndCollect(body, { notesMode: notesModeArg || deck.notesMode || config.notesMode || 'external' })
  const addTitlePage = shouldAddTitlePage(config, deck)
  const fm = buildSlidevFrontmatter(config, deck, { addTitlePage })
  const finalBody = addTitlePage
    ? appendBodyAfterTitlePage(makeTitlePage(config, deck), transformed.body)
    : transformed.body

  // Notes are collected from the author's Markdown body before the generated
  // AP title page is prepended. When a generated title page is present, the
  // visible Slidev slide numbers are shifted by one. Keep the notes page in
  // sync with what students see in the HTML/PDF export.
  const notesForOutput = addTitlePage
    ? transformed.notes.map(note => ({ ...note, slide: note.slide + 1 }))
    : transformed.notes

  const generated = injectFrontmatter(normalizeRelativeAssetPaths(finalBody), fm)
  const entry = path.join(sourceTargetDir, path.basename(deck.file))
  await fs.writeFile(entry, generated, 'utf8')

  const deckOut = path.join(outDir, deck.slug)
  await fse.ensureDir(deckOut)
  await fse.emptyDir(deckOut)
  const deckBase = `${baseRoot}${deck.slug}/`.replace(/\/+/g, '/')

  await run(slidevBin, ['build', entry, '--out', deckOut, '--base', deckBase, '--theme', 'slidev-theme-ap'], { cwd: deckWork })

  // Slidev uses client-side routing like /2, /3, ... after the app has loaded.
  // On static hosting, directly opening /2 would normally 404 because there is
  // no physical file at that path. Create small route fallbacks by copying the
  // built index.html into /<slide>/index.html for every visible slide.
  // This keeps links from notes.html and course text shareable on GitHub Pages.
  await writeSlideRouteFallbacks(deckOut, countSlidevSlides(finalBody))

  if (!skipExport) {
    await run(slidevBin, ['export', entry, '--output', path.join(deckOut, 'slides.pdf'), '--timeout', '120000', '--theme', 'slidev-theme-ap'], { cwd: deckWork })
  }

  await writeNotesHtml({ outFile: path.join(deckOut, 'notes.html'), deckTitle: deck.title, courseTitle: deck.course || config.title, notes: notesForOutput })
  await copyIfExists(path.join(deckWork, 'public', 'ap-theme'), path.join(deckOut, 'ap-theme'))

  return { slug: deck.slug, title: deck.title, notes: notesForOutput.length }
}


function buildSlidevFrontmatter(config, deck, options = {}) {
  const base = {
    theme: 'slidev-theme-ap',
    title: deck.title,
    course: deck.course || config.title,
    chapter: deck.title,
    apDate: deck.date || config.date,
    author: deck.author || config.author,
    download: './slides.pdf',
    drawings: { persist: false },
    defaults: { layout: 'default' },
  }

  // Original Markdown front matter wins for normal Slidev options,
  // but build-only keys are removed so they do not leak into Slidev config.
  const original = { ...(deck.frontmatterObject || {}) }
  for (const key of ['slug', 'order', 'notesMode', 'notes_mode', 'titlePage', 'title_page', 'publish', 'draft']) {
    delete original[key]
  }

  const merged = stripEmpty({ ...base, ...original })

  // When the AP title page is generated, it is the first Slidev slide.
  // Its layout must therefore live in the document front matter.
  // Adding a separate `--- layout: cover ---` block before the first slide
  // creates an empty slide in Slidev's build/PDF output.
  if (options.addTitlePage) {
    merged.layout = 'cover'
  }

  return YAML.stringify(merged).trim()
}

function stripEmpty(value) {
  const out = {}
  for (const [key, val] of Object.entries(value)) {
    if (val === undefined || val === null || val === '') continue
    out[key] = val
  }
  return out
}

function shouldAddTitlePage(config, deck) {
  if (deck.titlePage === false) return false
  return config.titlePage !== false
}

function appendBodyAfterTitlePage(titlePage, body) {
  const trimmedBody = String(body || '').trimStart()
  if (!trimmedBody) return titlePage
  const separator = trimmedBody.startsWith('---') ? '\n\n' : '\n\n---\n\n'
  return `${titlePage}${separator}${trimmedBody}`
}

function makeTitlePage(config, deck) {
  const esc = (v) => String(v || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const course = deck.course || config.title || ''
  const title = deck.title || ''

  // Use HTML instead of Markdown headings here. This avoids literal '#'/ '##'
  // text appearing in PDF exports and keeps the AP title page strict:
  // course label + lesson title only. The optional `subtitle` front matter is
  // intentionally not rendered on the generated AP title page.
  return [
    course ? `<div class="ap-title-kicker">${esc(course)}</div>` : '',
    title ? `<div class="ap-title-subtitle">${esc(title)}</div>` : '',
  ].filter(Boolean).join('\n')
}


function countSlidevSlides(body) {
  const normalized = String(body || '').trim()
  if (!normalized) return 0
  // Slidev separates slides with a line containing only ---.
  // We are counting the already-generated body, before global front matter is injected.
  return normalized.split(/\n(?=---\s*(?:\n|$))/g).filter(Boolean).length
}

async function writeSlideRouteFallbacks(deckOut, slideCount) {
  const indexFile = path.join(deckOut, 'index.html')
  const indexHtml = await fs.readFile(indexFile, 'utf8')
  for (let i = 1; i <= slideCount; i++) {
    const dir = path.join(deckOut, String(i))
    await fse.ensureDir(dir)
    await fs.writeFile(path.join(dir, 'index.html'), indexHtml, 'utf8')
  }
}

function normalizeBase(value) {
  let base = String(value || '/').trim()
  if (!base.startsWith('/')) base = '/' + base
  if (!base.endsWith('/')) base += '/'
  return base
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
