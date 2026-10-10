#!/usr/bin/env node
// Live preview of one deck. Slidev serves a generated copy in .slidev-work;
// this script regenerates that copy whenever the deck's folder changes, so
// edits in the course repo show up immediately.
import fs from 'node:fs'
import path from 'node:path'
import { engineRoot, parseArgs, run } from './lib.mjs'
import { loadCourse, prepareDeckWorkdir, renderDeck, syncDeckAssets, deckEntry } from './course.mjs'

const args = parseArgs(process.argv.slice(2))
const courseDir = path.resolve(args.course || process.cwd())
const deckName = args.deck
const port = String(args.port || '3030')
const notesMode = args['notes-mode']
const slidevBin = path.join(engineRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'slidev.cmd' : 'slidev')

async function main() {
  const config = await loadCourse(courseDir)
  const findDeck = decks => deckName
    ? decks.find(d => d.slug === deckName || d.file === deckName || path.basename(d.file, '.md') === deckName)
    : decks[0]
  const deck = findDeck(config.decks)
  if (!deck) throw new Error(`Geen deck gevonden. Kies uit: ${config.decks.map(d => d.slug).join(', ')}`)

  const workDir = path.join(engineRoot, '.slidev-work', 'preview', deck.slug)
  const entry = deckEntry(deck, workDir)
  await prepareDeckWorkdir({ config, deck, workDir })

  const write = async () => {
    // Re-read the course so front matter changes (title, order, ...) count too.
    const fresh = findDeck((await loadCourse(courseDir)).decks) || deck
    await syncDeckAssets({ deck: fresh, workDir })
    const rendered = await renderDeck({ config, deck: fresh, base: '/', notesMode, pdf: false })
    fs.writeFileSync(entry, rendered.markdown, 'utf8')
  }
  await write()

  let timer
  fs.watch(path.dirname(deck.absolute), { recursive: true }, () => {
    clearTimeout(timer)
    timer = setTimeout(() => write().catch(err => console.error(`\n[preview] ${err.message}`)), 150)
  })

  console.log(`\n[preview] ${deck.slug} — bewerk ${path.relative(process.cwd(), deck.absolute)}, de browser volgt vanzelf.\n`)
  await run(slidevBin, [entry, '--port', port], { cwd: workDir })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
