#!/usr/bin/env node
// Zet reveal-hugo-decks (de Hugo-site met het AP-sjabloon) om naar Markdown
// voor deze engine: TOML-front matter -> YAML, shortcodes -> Vue-componenten
// van het AP-thema, {{% note %}} -> :::notes, tussentitels -> layout: section.
//
// Eén deck:
//   npm run migrate:hugo -- --input ../cursus/site/content/vak/deck/_index.md --output ../cursus-vak/slides/deck/index.md
// Een heel vak (elke submap met een reveal-deck wordt slides/<submap>/index.md):
//   npm run migrate:hugo -- --input ../cursus/site/content/vak --output ../cursus-vak/slides
//
// Afbeeldingen, audio, ... naast het deck worden mee gekopieerd. Wat niet
// automatisch kan, verschijnt als waarschuwing met het slidenummer.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import fse from 'fs-extra'
import { parseArgs, splitCodeFences, collapseBlankLines } from './lib.mjs'

// Front matter-sleutels van Hugo/reveal-hugo die in Slidev geen betekenis hebben.
const DROP_KEYS = ['outputs', 'type', 'reveal_hugo', 'build', 'layout', 'weight', 'ai_label', 'title', 'draft']

// shortcode -> component. `bool` = attributen die "true" als waarde hebben,
// `pos` = naam voor een positionele parameter, `defaults` = weglaten als gelijk.
const COMPONENTS = {
  cards: { tag: 'Cards', bool: ['stack'] },
  card: { tag: 'Card', bool: ['stat', 'bare', 'outline'] },
  arrow: { tag: 'CardArrow', pos: 'text', defaults: { text: '→' } },
  snakearrow: { tag: 'SnakeArrow', pos: 'text', defaults: { text: '↓' } },
  callout: { tag: 'Callout' },
  caption: { tag: 'Caption' },
  timeline: { tag: 'Timeline' },
  step: { tag: 'Step' },
  htimeline: { tag: 'HTimeline' },
  point: { tag: 'Point' },
  bar: { tag: 'Bar' },
  segment: { tag: 'Segment' },
  columns: { tag: 'Columns' },
  column: { tag: 'Column' },
  split: { tag: 'Split' },
  image: { tag: 'ApImage', bool: ['zoom'] },
  audio: { tag: 'ApAudio' },
  youtube: { tag: 'ApYoutube', pos: 'id' },
}

export function convertHugoDeck(source, { file = 'deck' } = {}) {
  const warnings = []
  const { meta, body } = splitHugoFrontmatter(source)
  const slides = splitSlides(body)
  const frontmatter = {}
  const out = []

  slides.forEach((raw, index) => {
    const warn = msg => warnings.push(`${file}, slide ${index + 1}: ${msg}`)
    let { attrs, text } = takeSlideShortcode(raw)
    const classes = String(attrs.class || '').split(/\s+/).filter(Boolean)
    for (const key of Object.keys(attrs)) {
      if (key !== 'class') warn(`slide-attribuut ${key}="${attrs[key]}" niet omgezet`)
    }

    if (index === 0 && classes.includes('title')) {
      // De titelslide wordt het automatische AP-titelblad: # = vak, ## = les.
      const h1 = text.match(/^#\s+(.+?)\s*$/m)?.[1]
      const h2 = text.match(/^##\s+(.+?)\s*$/m)?.[1]
      if (h1 && h2) Object.assign(frontmatter, { course: h1, title: h2 })
      else if (h1 || h2) frontmatter.title = h1 || h2
      const notes = [...text.matchAll(/\{\{%\s*note\s*%\}\}([\s\S]*?)\{\{%\s*\/note\s*%\}\}/g)].map(m => m[1].trim())
      if (notes.length) out.push({ frontmatter: null, content: notes.map(n => `:::notes\n${n}\n:::`).join('\n\n'), lead: true })
      return
    }

    const slideFm = {}
    if (classes.includes('title')) slideFm.layout = 'section'
    const rest = classes.filter(c => c !== 'title')
    if (rest.length) slideFm.class = rest.join(' ')

    out.push({ frontmatter: Object.keys(slideFm).length ? slideFm : null, content: convertSlideBody(text, warn) })
  })

  if (!frontmatter.title && meta.title) {
    // "IoT DataLab — Les 2: MQTT" -> course + title
    const [course, ...rest] = String(meta.title).split(/\s+[—–-]\s+/)
    if (rest.length) {
      frontmatter.course ??= course
      frontmatter.title = rest.join(' — ')
    }
    else frontmatter.title = meta.title
  }
  if (meta.weight !== undefined) frontmatter.order = meta.weight
  if (meta.ai_label) frontmatter.aiLabel = meta.ai_label === true ? 'modified' : meta.ai_label
  if (meta.draft === true) frontmatter.draft = true
  for (const [key, value] of Object.entries(meta)) {
    if (!DROP_KEYS.includes(key) && (typeof value !== 'object' || value === null)) frontmatter[key] = value
  }

  return { markdown: assemble(frontmatter, out), warnings }
}

function assemble(frontmatter, slides) {
  const parts = [`---\n${YAML.stringify(frontmatter).trim()}\n---`]
  let first = true
  for (const slide of slides) {
    if (slide.lead) {
      // Notes vóór de eerste slide: de engine hangt ze aan het titelblad.
      parts.push(`\n${slide.content}\n`)
      continue
    }
    const fm = slide.frontmatter ? `${YAML.stringify(slide.frontmatter).trim()}\n---\n` : ''
    // De eerste slide zonder eigen front matter hoeft geen scheidingslijn:
    // de engine zet het titelblad ervoor.
    if (first && !fm) parts.push(`\n${slide.content}\n`)
    else parts.push(`\n---\n${fm}\n${slide.content}\n`)
    first = false
  }
  return `${collapseBlankLines(parts.join('\n')).trim()}\n`
}

function splitHugoFrontmatter(source) {
  const text = source.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  let match = text.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?/)
  if (match) return { meta: parseSimpleToml(match[1]), body: text.slice(match[0].length) }
  match = text.match(/^---\n([\s\S]*?)\n---\n?/)
  if (match) return { meta: YAML.parse(match[1]) || {}, body: text.slice(match[0].length) }
  return { meta: {}, body: text }
}

// Genoeg TOML voor Hugo-front matter: key = waarde, [tabellen] als object.
function parseSimpleToml(toml) {
  const result = {}
  let target = result
  for (const line of toml.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const table = trimmed.match(/^\[([^\]]+)\]$/)
    if (table) {
      target = result
      for (const key of table[1].split('.')) target = target[key.trim()] ??= {}
      continue
    }
    const kv = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/)
    if (!kv) continue
    target[kv[1]] = parseTomlValue(kv[2].replace(/\s+#.*$/, '').trim())
  }
  return result
}

function parseTomlValue(raw) {
  if (/^".*"$/.test(raw)) return JSON.parse(raw)
  if (/^'.*'$/.test(raw)) return raw.slice(1, -1)
  if (raw === 'true' || raw === 'false') return raw === 'true'
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if (raw.startsWith('[')) {
    try { return JSON.parse(raw.replace(/'/g, '"')) } catch { return raw }
  }
  return raw
}

// Splits op `---`-lijnen buiten codeblokken (reveal-hugo-scheiding).
function splitSlides(body) {
  const slides = ['']
  for (const part of splitCodeFences(body)) {
    if (part.code) {
      slides[slides.length - 1] += part.text
      continue
    }
    const [first, ...rest] = part.text.split(/^---[ \t]*(?:\n|$)/m)
    slides[slides.length - 1] += first
    slides.push(...rest)
  }
  return slides.filter(s => s.trim())
}

function takeSlideShortcode(raw) {
  const match = raw.match(/^\s*\{\{<\s*slide\b([^>]*?)\s*\/?>\}\}[ \t]*\n?/)
  if (!match) return { attrs: {}, text: raw }
  return { attrs: parseAttrs(match[1]).named, text: raw.slice(match[0].length) }
}

// Shortcode-argumenten: key="waarde", key=`waarde`, key=waarde, of positioneel.
function parseAttrs(str) {
  const named = {}
  const positional = []
  const re = /([A-Za-z_][\w-]*)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|`([^`]*)`|(\S+))|"((?:[^"\\]|\\.)*)"|`([^`]*)`|(\S+)/g
  let m
  while ((m = re.exec(str || ''))) {
    if (m[1]) named[m[1]] = m[2] !== undefined ? m[2].replace(/\\"/g, '"') : m[3] ?? m[4]
    else positional.push(m[5] !== undefined ? m[5].replace(/\\"/g, '"') : m[6] ?? m[7])
  }
  return { named, positional }
}

function convertSlideBody(text, warn) {
  // Codeblokken blijven ongemoeid, behalve ge-escapete voorbeelden
  // ({{</* card */>}}): die tonen voortaan de nieuwe schrijfwijze.
  const converted = splitCodeFences(text)
    .map(part => part.code ? convertCodeExample(part.text) : convertMarkdown(part.text, warn))
    .filter(piece => piece.trim())
  return promoteHeadings(collapseBlankLines(converted.join('\n\n'))).trim()
}

// Een codeblok met ge-escapete Hugo-voorbeelden wordt het voorbeeld in de
// nieuwe schrijfwijze, met dezelfde omzetting als de slides zelf.
function convertCodeExample(block) {
  if (!/\{\{[<%]\/\*/.test(block)) return block
  const lines = block.replace(/\n$/, '').split('\n')
  const open = lines.shift()
  const close = lines.length && /^\s*(`{3,}|~{3,})\s*$/.test(lines[lines.length - 1]) ? lines.pop() : null
  const inner = lines.join('\n')
    .replace(/\{\{<\/\*\s*([\s\S]*?)\s*\*\/>\}\}/g, '{{< $1 >}}')
    .replace(/\{\{%\/\*\s*([\s\S]*?)\s*\*\/%\}\}/g, '{{% $1 %}}')
  // Gegenereerde voorbeeldcode: hier mogen lege regels wel samen.
  const converted = convertMarkdown(inner, () => {}).replace(/\n{3,}/g, '\n\n')
  return `${[open, converted, close].filter(l => l !== null).join('\n')}\n`
}

function convertEscapedExamples(text) {
  return text
    .replace(/\{\{<\/\*\s*([\s\S]*?)\s*\*\/>\}\}/g, (_, inner) => shortcodeToText(inner, '<'))
    .replace(/\{\{%\/\*\s*([\s\S]*?)\s*\*\/%\}\}/g, (_, inner) => shortcodeToText(inner, '%'))
}

// Een shortcode als losse tekst (voor codevoorbeelden en inline code).
function shortcodeToText(inner, delim) {
  const quiet = () => {}
  quiet.codeExample = true
  const parts = renderShortcode(parseShortcode(inner, delim), quiet)
  return parts.map(p => p.value).join('')
}

function convertMarkdown(text, warn) {
  // Formuleblok: {{< math >}} ... {{< /math >}} -> $$ ... $$
  text = text.replace(/\{\{<\s*math\s*>\}\}\s*\n?([\s\S]*?)\n?\s*\{\{<\s*\/math\s*>\}\}/g, (_, f) => `\n$$\n${f.trim()}\n$$\n`)
  // Inline formules eerst: {{< math "\lambda = c / f" />}} -> $\lambda = c / f$
  text = text.replace(/\{\{<\s*math\s+"((?:[^"\\]|\\.)*)"\s*\/?>\}\}/g, (_, f) => `$${f.replace(/\\"/g, '"')}$`)
  // Ge-escapete shortcodes in inline code: `{{</* card */>}}`
  text = convertEscapedExamples(text)

  const parts = []
  const re = /\{\{<\s*([\s\S]*?)\s*>\}\}|\{\{%\s*([\s\S]*?)\s*%\}\}/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
    parts.push(...renderShortcode(m[1] !== undefined ? parseShortcode(m[1], '<') : parseShortcode(m[2], '%'), warn))
    last = re.lastIndex
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return joinParts(collapseEmptyPairs(parts))
}

function parseShortcode(inner, delim) {
  let body = inner.trim()
  const closing = body.startsWith('/')
  if (closing) body = body.slice(1).trim()
  const selfClosing = body.endsWith('/')
  if (selfClosing) body = body.slice(0, -1).trim()
  const name = body.match(/^[\w-]+/)?.[0] || ''
  const { named, positional } = parseAttrs(body.slice(name.length))
  return { name, named, positional, closing, selfClosing, delim, raw: `{{${delim} ${inner.trim()} ${delim}}}` }
}

function renderShortcode(sc, warn) {
  const tag = value => [{ type: 'tag', value, name: sc.name, closing: sc.closing }]
  switch (sc.name) {
    case 'note':
      return tag(sc.closing ? ':::' : ':::notes')
    case 'fragment':
      return tag(sc.closing ? '</v-click>' : '<v-click>')
    case 'math':
      return [{ type: 'text', value: '\n$$\n' }]
    case 'mermaid':
      return [{ type: 'text', value: sc.closing ? '\n```\n' : '\n```mermaid\n' }]
    case 'section':
      warn('{{< section >}} (verticale slides) bestaat niet in Slidev; de slides staan nu gewoon na elkaar')
      return []
    case 'slide': {
      if (warn.codeExample) return [{ type: 'text', value: sc.named.class === 'title' ? 'layout: section' : `class: ${sc.named.class || ''}` }]
      warn('{{< slide >}} midden in een slide genegeerd')
      return []
    }
  }

  const spec = COMPONENTS[sc.name]
  if (!spec) {
    warn(`onbekende shortcode ${sc.raw} ongewijzigd gelaten`)
    return [{ type: 'text', value: sc.raw }]
  }
  if (sc.closing) return tag(`</${spec.tag}>`)

  const attrs = { ...sc.named }
  if (spec.pos && sc.positional.length && attrs[spec.pos] === undefined) attrs[spec.pos] = sc.positional[0]
  const out = []
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'fragment') {
      out.push(value === 'true' || value === '' ? 'v-click' : /^\d+$/.test(value) ? `v-click="${Number(value) + 1}"` : 'v-click')
      continue
    }
    if (spec.defaults?.[key] === value) continue
    if (spec.bool?.includes(key)) {
      if (value === 'true') out.push(key)
      else if (value !== 'false') out.push(`${key}="${escapeAttr(value)}"`)
      continue
    }
    out.push(`${key}="${escapeAttr(value)}"`)
  }
  const open = `<${spec.tag}${out.length ? ` ${out.join(' ')}` : ''}`
  // Shortcodes zonder inhoud (image, arrow, audio, youtube, ...) sluiten zichzelf.
  const selfClosing = sc.selfClosing || ['arrow', 'snakearrow', 'image', 'audio', 'youtube'].includes(sc.name)
  return tag(selfClosing ? `${open} />` : `${open}>`)
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

// <Segment ...></Segment> zonder inhoud -> <Segment ... />
function collapseEmptyPairs(parts) {
  const out = []
  for (let i = 0; i < parts.length; i++) {
    const a = parts[i]
    const b = parts[i + 1]
    const c = parts[i + 2]
    const close = (x) => x?.type === 'tag' && x.closing && x.value.startsWith('</') && x.value !== '</v-click>'
    if (a.type === 'tag' && !a.closing && a.value.endsWith('>') && !a.value.endsWith('/>') && a.value.startsWith('<') && a.value !== '<v-click>') {
      if (close(b)) { out.push({ ...a, value: a.value.replace(/>$/, ' />') }); i += 1; continue }
      if (b?.type === 'text' && !b.value.trim() && close(c)) { out.push({ ...a, value: a.value.replace(/>$/, ' />') }); i += 2; continue }
    }
    out.push(a)
  }
  return out
}

// Componenttags staan elk op een eigen regel; Markdown ertussen krijgt lege
// regels errond, anders verwerkt Slidev die niet als Markdown. Korte platte
// tekst mag compact: <Step color="gray" label="5'">Pauze</Step>.
function joinParts(parts) {
  const items = []
  for (const part of parts) {
    if (part.type === 'text') {
      const value = part.value.replace(/^\s*\n/, '').replace(/\n\s*$/, '')
      if (value.trim()) items.push({ kind: 'text', value })
      continue
    }
    const kind = part.value === ':::notes' ? 'note-open' : part.value === ':::' ? 'note-close' : 'tag'
    items.push({ kind, value: part.value, closing: part.closing })
  }

  // <X ...> + korte tekst + </X> -> één regel
  const compact = []
  for (let i = 0; i < items.length; i++) {
    const [a, b, c] = [items[i], items[i + 1], items[i + 2]]
    if (a.kind === 'tag' && !a.closing && !a.value.endsWith('/>') && b?.kind === 'text' && c?.kind === 'tag' && c.closing
      && !b.value.includes('\n') && !/[*_`[\]<>{}$\\|#]|^\s*[-+\d]/.test(b.value) && b.value.length <= 80) {
      compact.push({ kind: 'tag', value: `${a.value}${b.value.trim()}${c.value}` })
      i += 2
      continue
    }
    compact.push(a)
  }

  let result = ''
  let prev = null
  for (const item of compact) {
    if (prev) {
      if (item.kind === 'note-open' || prev.kind === 'note-close') result += '\n\n'
      else if (prev.kind === 'note-open' || item.kind === 'note-close') result += '\n'
      else if (prev.kind === 'tag' && item.kind === 'tag') result += '\n'
      else result += '\n\n'
    }
    result += item.kind === 'text' ? item.value.replace(/^\n+|\s+$/g, '') : item.value
    prev = item
  }
  return result
}

// In de Hugo-decks is ## de slidetitel; in Slidev (en in dit thema) is dat #.
function promoteHeadings(text) {
  const parts = splitCodeFences(text)
  if (parts.some(part => !part.code && /^#\s/m.test(part.text))) return text
  return parts.map(part => part.code ? part.text : part.text.replace(/^#(#{1,5}\s)/gm, '$1')).join('')
}

async function convertFile(input, output, { copyAssets = true } = {}) {
  const source = await fs.readFile(input, 'utf8')
  const { markdown, warnings } = convertHugoDeck(source, { file: path.relative(process.cwd(), input) })
  await fse.ensureDir(path.dirname(output))
  await fs.writeFile(output, markdown, 'utf8')
  if (copyAssets) {
    const dir = path.dirname(input)
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) await fse.copy(path.join(dir, entry.name), path.join(path.dirname(output), entry.name))
    }
  }
  console.log(`Converted ${input} -> ${output}`)
  for (const w of warnings) console.warn(`  ! ${w}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = args.input || args.i
  const output = args.output || args.o
  if (!input || !output) {
    console.error('Usage: npm run migrate:hugo -- --input <deck/_index.md | vakmap> --output <slides/deck/index.md | slides>')
    process.exit(1)
  }
  const stat = await fs.stat(input)
  if (!stat.isDirectory()) return convertFile(input, output)

  // Een vakmap: elke submap waarvan _index.md een reveal-deck is.
  for (const entry of (await fs.readdir(input, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue
    const deck = path.join(input, entry.name, '_index.md')
    const text = await fs.readFile(deck, 'utf8').catch(() => null)
    if (!text || !/outputs\s*=\s*\[\s*["']Reveal["']/.test(text)) continue
    await convertFile(deck, path.join(output, entry.name, 'index.md'))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
