#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import fg from 'fast-glob'
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
  injectFrontmatter,
} from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
const courseDir = path.resolve(args.course || process.cwd())
const deckName = args.deck
const port = String(args.port || '3030')
const slidevBin = path.join(engineRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'slidev.cmd' : 'slidev')

async function main() {
  const config = await loadCourseConfig(courseDir)
  const deck = deckName
    ? config.decks.find(d => d.slug === deckName || d.file === deckName || path.basename(d.file || '', '.md') === deckName)
    : config.decks[0]
  if (!deck?.file) throw new Error('Geen deck gevonden. Geef --deck h01-intro of plaats Markdown-bestanden onder slides/.')

  const absolute = path.resolve(courseDir, deck.file)
  const source = await fs.readFile(absolute, 'utf8')
  const { body } = splitFrontmatter(source)
  const work = path.join(engineRoot, '.slidev-work', 'preview', deck.slug)
  await ensureEmptyDir(work)
  await copyIfExists(path.join(engineRoot, 'theme', 'public'), path.join(work, 'public', 'ap-theme'))
  await copyIfExists(path.join(courseDir, 'public'), path.join(work, 'public'))
  await copyIfExists(path.dirname(absolute), path.join(work, 'source'))

  const transformed = transformNotesAndCollect(body, { notesMode: deck.notesMode || config.notesMode || 'external' })
  const fm = buildSlidevFrontmatter(config, deck)
  const finalBody = shouldAddTitlePage(config, deck)
    ? appendBodyAfterTitlePage(makeTitlePage(config, deck), transformed.body)
    : transformed.body
  const entry = path.join(work, 'source', path.basename(deck.file))
  await fs.writeFile(entry, injectFrontmatter(finalBody, fm), 'utf8')
  await run(slidevBin, [entry, '--port', port, '--theme', 'slidev-theme-ap'], { cwd: work })
}

async function loadCourseConfig(courseDir) {
  const raw = await readTextIfExists(path.join(courseDir, 'course.yml'))
  const parsed = raw ? YAML.parse(raw) || {} : {}
  let decks = Array.isArray(parsed.decks) && parsed.decks.length ? parsed.decks : []
  if (!decks.length) {
    const files = await fg('slides/**/*.md', { cwd: courseDir })
    decks = files.sort().map(file => ({ file }))
  }

  const normalized = []
  for (const [index, deck] of decks.entries()) {
    const file = deck.file || deck.path
    if (!file) continue
    const absolute = path.resolve(courseDir, file)
    const source = await fs.readFile(absolute, 'utf8')
    const { frontmatter, body } = splitFrontmatter(source)
    const fm = parseYamlObject(frontmatter)
    if (fm.publish === false || fm.draft === true || deck.publish === false || deck.draft === true) continue
    const title = deck.title || fm.title || firstHeading(body) || path.basename(file, '.md')
    const course = deck.course || fm.course || fm.subject || parsed.course || parsed.title || ''
    normalized.push({
      ...deck,
      file,
      frontmatterObject: fm,
      title,
      course,
      slug: slugify(deck.slug || fm.slug || path.basename(file, '.md')),
      order: Number(deck.order ?? fm.order ?? index),
      subtitle: deck.subtitle || deck.subTitle || fm.subtitle || fm.subTitle || '',
      author: deck.author || fm.author || parsed.author || '',
      date: deck.date || deck.apDate || fm.apDate || fm.date || parsed.date || '',
      notesMode: deck.notesMode || deck.notes_mode || fm.notesMode || fm.notes_mode || parsed.notesMode || parsed.notes_mode,
      titlePage: deck.titlePage ?? deck.title_page ?? fm.titlePage ?? fm.title_page,
    })
  }
  normalized.sort((a, b) => a.order - b.order || a.file.localeCompare(b.file))
  const firstDeck = normalized[0] || {}
  return {
    title: parsed.title || parsed.course || firstDeck.course || path.basename(courseDir),
    date: parsed.date || firstDeck.date || '',
    author: parsed.author || firstDeck.author || '',
    notesMode: parsed.notesMode || parsed.notes_mode || 'external',
    titlePage: parsed.titlePage ?? parsed.title_page ?? true,
    decks: normalized,
  }
}

function parseYamlObject(frontmatter) {
  if (!frontmatter) return {}
  const parsed = YAML.parse(frontmatter)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

function firstHeading(markdown) {
  return String(markdown || '').match(/^#\s+(.+?)\s*$/m)?.[1]?.trim()
}

function buildSlidevFrontmatter(config, deck) {
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
  const original = { ...(deck.frontmatterObject || {}) }
  for (const key of ['slug', 'order', 'notesMode', 'notes_mode', 'titlePage', 'title_page', 'publish', 'draft']) delete original[key]
  return YAML.stringify(stripEmpty({ ...base, ...original })).trim()
}

function stripEmpty(value) {
  return Object.fromEntries(Object.entries(value).filter(([, val]) => val !== undefined && val !== null && val !== ''))
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
  const subtitle = deck.subtitle || ''
  const courseLine = course ? `<p class="ap-title-kicker">${esc(course)}</p>` : ''
  const subtitleLine = subtitle && subtitle !== deck.title ? `\n## ${esc(subtitle)}` : ''
  return `---\nlayout: cover\n---\n\n${courseLine}\n# ${esc(deck.title)}${subtitleLine}`
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
