#!/usr/bin/env node
// Live preview of one deck. Slidev serves a generated copy in .slidev-work;
// this script regenerates that copy whenever the deck's folder or course.yml
// changes, so edits in the course repo show up immediately.
import fs from 'node:fs'
import path from 'node:path'
import { engineRoot, parseArgs, run } from './lib.mjs'
import { loadCourse, prepareDeckWorkdir, renderDeck, syncDeckFile, deckEntry } from './course.mjs'

const args = parseArgs(process.argv.slice(2))
const courseDir = path.resolve(args.course || process.cwd())
const deckName = args.deck
const port = String(args.port || '3030')
const notesMode = args['notes-mode']
const slidevBin = path.join(engineRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'slidev.cmd' : 'slidev')

function findDeck(decks) {
  return deckName
    ? decks.find(d => d.slug === deckName || d.file === deckName || path.basename(d.file, '.md') === deckName)
    : decks[0]
}

async function main() {
  const config = await loadCourse(courseDir)
  const deck = findDeck(config.decks)
  if (!deck) throw new Error(`Geen deck gevonden. Kies uit: ${config.decks.map(d => d.slug).join(', ')}`)

  const workDir = path.join(engineRoot, '.slidev-work', 'preview', deck.slug)
  const entry = deckEntry(deck, workDir)
  await prepareDeckWorkdir({ config, deck, workDir, themeAssets: true })

  // Re-read the course on every change, so front matter and course.yml count too.
  const render = async () => {
    const fresh = await loadCourse(courseDir)
    const rendered = await renderDeck({ config: fresh, deck: findDeck(fresh.decks) || deck, base: '/', notesMode, pdf: false })
    fs.writeFileSync(entry, rendered.markdown, 'utf8')
  }
  await render()

  // Only the files that changed are copied again; the Markdown is always
  // regenerated (that is cheap).
  const changed = new Set()
  let timer
  const schedule = (file) => {
    if (file && !file.endsWith('.md')) changed.add(file)
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const files = [...changed]
      changed.clear()
      try {
        for (const file of files) await syncDeckFile({ deck, workDir, file })
        await render()
      }
      catch (err) { console.error(`\n[preview] ${err.message}`) }
    }, 150)
  }
  const deckDir = path.dirname(deck.absolute)
  fs.watch(deckDir, { recursive: true }, (_event, name) => schedule(name ? path.join(deckDir, name) : null))
  fs.watch(courseDir, (_event, name) => { if (name === 'course.yml') schedule(null) })

  console.log(`\n[preview] ${deck.slug} — bewerk ${path.relative(process.cwd(), deck.absolute)}, de browser volgt vanzelf.\n`)
  await run(slidevBin, [entry, '--port', port], { cwd: workDir })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
