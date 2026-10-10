#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import fse from 'fs-extra'
import {
  engineRoot,
  parseArgs,
  copyIfExists,
  run,
  slugify,
  writeNotesHtml,
  writeCourseIndex,
} from './lib.mjs'
import { loadCourse, prepareDeckWorkdir, renderDeck, deckEntry } from './course.mjs'

const args = parseArgs(process.argv.slice(2))
const courseDir = path.resolve(args.course || process.cwd())
const outDir = path.resolve(args.out || path.join(courseDir, 'dist'))
const baseRoot = normalizeBase(args.base || '/')
const skipExport = Boolean(args['skip-export'])
const notesModeArg = args['notes-mode'] || args.notesMode
// Only build these decks (comma separated slugs), e.g. --decks les02-mqtt
const onlyDecks = typeof args.decks === 'string' ? args.decks.split(',').map(s => s.trim()) : null

const slidevBin = path.join(engineRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'slidev.cmd' : 'slidev')

async function main() {
  await fse.ensureDir(outDir)
  await fse.emptyDir(outDir)

  const config = await loadCourse(courseDir)
  const decks = onlyDecks ? config.decks.filter(d => onlyDecks.includes(d.slug)) : config.decks
  if (onlyDecks && !decks.length) throw new Error(`Geen deck gevonden voor --decks ${onlyDecks.join(',')}`)
  const workRoot = path.join(engineRoot, '.slidev-work', slugify(config.title || path.basename(courseDir)))

  // Copy theme assets to root output as well for index and notes.
  await copyIfExists(path.join(engineRoot, 'theme', 'public'), path.join(outDir, 'ap-theme'))

  const builtDecks = []
  for (const deck of decks) builtDecks.push(await buildDeck({ config, deck, workRoot }))

  await writeCourseIndex({
    outFile: path.join(outDir, 'index.html'),
    title: config.title,
    description: config.description,
    author: config.author,
    date: config.date,
    decks: builtDecks,
  })
  // GitHub Pages runs Jekyll on the artifact unless told otherwise; Jekyll
  // drops folders that start with an underscore.
  await fs.writeFile(path.join(outDir, '.nojekyll'), '')
  console.log(`\nDone. Course generated in ${outDir}`)
}

async function buildDeck({ config, deck, workRoot }) {
  console.log(`\n=== Building ${deck.slug}: ${deck.title} ===`)
  const workDir = path.join(workRoot, deck.slug)
  await prepareDeckWorkdir({ config, deck, workDir })

  const deckBase = `${baseRoot}${deck.slug}/`.replace(/\/+/g, '/')
  const rendered = await renderDeck({ config, deck, base: deckBase, notesMode: notesModeArg, pdf: !skipExport })
  const entry = deckEntry(deck, workDir)
  await fs.writeFile(entry, rendered.markdown, 'utf8')

  const deckOut = path.join(outDir, deck.slug)
  await fse.ensureDir(deckOut)
  await fse.emptyDir(deckOut)

  await run(slidevBin, ['build', entry, '--out', deckOut, '--base', deckBase], { cwd: workDir })

  // Slidev uses client-side routing like /2, /3, ... after the app has loaded.
  // On static hosting, directly opening /2 would normally 404 because there is
  // no physical file at that path. Create small route fallbacks by copying the
  // built index.html into /<slide>/index.html for every visible slide.
  // This keeps links from notes.html and course text shareable on GitHub Pages.
  await writeSlideRouteFallbacks(deckOut, rendered.slideCount)

  if (!skipExport) {
    await run(slidevBin, ['export', entry, '--output', path.join(deckOut, 'slides.pdf'), '--timeout', '120000'], { cwd: workDir })
  }

  if (rendered.hasNotesPage) {
    await writeNotesHtml({ outFile: path.join(deckOut, 'notes.html'), deckTitle: deck.title, courseTitle: deck.course || config.title, notes: rendered.notes })
  }

  return { slug: deck.slug, title: deck.title, hasNotesPage: rendered.hasNotesPage, hasPdf: !skipExport }
}

async function writeSlideRouteFallbacks(deckOut, slideCount) {
  const indexHtml = await fs.readFile(path.join(deckOut, 'index.html'), 'utf8')
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
