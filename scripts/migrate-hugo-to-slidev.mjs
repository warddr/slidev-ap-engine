#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from './lib.mjs'

const args = parseArgs(process.argv.slice(2))
const input = args.input || args.i
const output = args.output || args.o
if (!input || !output) {
  console.error('Usage: npm run migrate:hugo -- --input oude/_index.md --output slides/h01.md')
  process.exit(1)
}

let source = await fs.readFile(input, 'utf8')

// TOML front matter +++ ... +++ -> YAML placeholder. Titel wordt simpel gemapt.
source = source.replace(/^\+\+\+\n([\s\S]*?)\n\+\+\+/, (_, toml) => {
  const title = toml.match(/^title\s*=\s*["'](.+?)["']/m)?.[1] || path.basename(output, '.md')
  return `---\ntitle: "${title.replace(/"/g, '\\"')}"\nlayout: cover\n---`
})

// reveal-hugo notes -> cursusmateriaal-blocks. Het build-script zet deze standaard in notes.html, niet op de slide.
source = source.replace(/\{\{%\s*note\s*%\}\}/g, ':::notes')
source = source.replace(/\{\{%\s*\/note\s*%\}\}/g, ':::')

// Common reveal-hugo slide wrapper shortcodes.
source = source.replace(/\{\{<\s*slide\s+class=["']title["']\s*>\}\}/g, '---\nlayout: cover\n')
source = source.replace(/\{\{<\s*slide\s+class=["']section["']\s*>\}\}/g, '---\nlayout: section\n')
source = source.replace(/\{\{<\s*slide[^>]*>\}\}/g, '---\n')
source = source.replace(/\{\{<\s*\/slide\s*>\}\}/g, '')

// Basic fragment conversion. Fijnere animaties kun je nadien manueel bijwerken.
source = source.replace(/\{\{%\s*fragment\s*%\}\}([\s\S]*?)\{\{%\s*\/fragment\s*%\}\}/g, '<v-click>\n\n$1\n\n</v-click>')

// Mermaid kan meestal blijven. Laat ```mermaid ongemoeid: Slidev ondersteunt dat.
await fs.mkdir(path.dirname(output), { recursive: true })
await fs.writeFile(output, source, 'utf8')
console.log(`Converted ${input} -> ${output}`)
