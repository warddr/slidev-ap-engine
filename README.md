# slidev-ap-engine

Centrale build-engine en AP-huisstijl voor Slidev-cursuspresentaties.

```text
slidev-ap-engine/       # build, thema, scripts, workflows
iot-datalab/            # enkel inhoud (een vakrepo)
cursus-wireless/        # enkel inhoud
```

Een vakrepo bevat enkel Markdown en afbeeldingen. Deze engine maakt er per deck
een Slidev-presentatie en een PDF van, plus een vakpagina met alle decks, en
publiceert alles via GitHub Pages van de vakrepo.

De AP-look komt uit de PowerPoint-template `24_TEM_AP_Presentatie_algemeen.pptx`
(rode cover, witte ribbon, rode hoek en footer) en de bouwstenen uit het
sjabloon van de Hugo-site (cards, tijdlijnen, balken, callouts, …): alles wat
daar een shortcode was, is hier een Vue-component met dezelfde naam en
dezelfde opties. `examples/course-repo/slides/componenten` toont ze allemaal.

## Installatie

Node.js 22.12 of nieuwer (Slidev 53).

```bash
cd slidev-ap-engine
npm ci
npx playwright install chromium   # enkel nodig voor de PDF-export
```

Gebruik `npm ci`, niet `npm install`: dat installeert exact de versies uit
`package-lock.json`. Zie *Afhankelijkheden bijwerken* hieronder.

## Een deck bekijken tijdens het schrijven

```bash
npm run preview:course -- --course ../iot-datalab --deck les02-mqtt
```

Opent Slidev op http://localhost:3030. Bewaar je het deck (of een afbeelding
ernaast), dan volgt de browser vanzelf. In de vakrepo kan het korter, zie de
README daar (`npm run dev -- les02-mqtt`).

## Een vak bouwen

```bash
npm run build:course -- --course ../iot-datalab --out dist/iot-datalab --base /iot-datalab/
```

- `--base`: het pad waarop de site komt. Voor GitHub Pages is dat `/<reponaam>/`.
- `--skip-export`: geen PDF's, veel sneller tijdens het debuggen.
- `--decks les02-mqtt,les03-…`: enkel deze decks.
- `--notes-mode presenter|external|inline`: notes-modus voor deze build.

Lokaal bekijken: `python3 -m http.server -d dist 8000` en surf naar
http://localhost:8000/iot-datalab/ (het pad moet overeenkomen met `--base`).

Te volle slides worden passend verkleind; de build meldt welke
(`[ap-theme] slide 24 is te vol: verkleind tot 95 %`).

## Structuur van een vakrepo

```text
iot-datalab/
  course.yml                  # optioneel: vaknaam, auteur, notes-modus
  slides/
    les01-waarom-energiemanagement/
      index.md                # het deck
      images/                 # afbeeldingen van dit deck
    les02-mqtt/
      index.md
      images/
  public/                     # optioneel: bestanden voor alle decks
  .github/workflows/deploy.yml
```

Elk `slides/**/*.md`-bestand is een deck. Heet het bestand `index.md`, dan is
de mapnaam de slug (de URL); anders de bestandsnaam.

### course.yml

```yaml
title: IoT DataLab
description: Energiemanagement & DevOps — graduaat IoT
author: Ward De Ridder
date: 2026–2027
notesMode: presenter      # zie Notes
headmatter:               # extra Slidev-opties voor elk deck van het vak
  aiLabel: modified
```

### Front matter van een deck

```md
---
title: Les 2 — MQTT
order: 2
aiLabel: modified
---

# Eerste inhoudsslide
```

| Veld | Doel |
|---|---|
| `title` | titel van de les, op het automatische AP-titelblad en de vakpagina |
| `course` | vaknaam (standaard die uit `course.yml`) |
| `order` | volgorde op de vakpagina |
| `slug` | URL van het deck (standaard map- of bestandsnaam) |
| `aiLabel` | EU-icoon voor AI-inhoud rechtsboven op de titelslide: `modified`, `generated` of `ai` |
| `notesMode` | `presenter`, `external` of `inline` (zie Notes) |
| `titlePage` | `false` = geen automatisch titelblad |
| `draft` / `publish: false` | deck niet bouwen |

Andere velden gaan gewoon naar Slidev (bv. `aspectRatio`, `fonts`).

## Slides schrijven

```md
# Gewone slide

- Een nieuwe slide begint na elke lijn ---

---
layout: section
---

# Tussentitel
## Nieuw hoofdstuk

---
class: compact-table
---

# Slide met een grote tabel
```

- `#` is de slidetitel (in AP-rood).
- Front matter van een slide staat **meteen** na de `---`; een gewone slide
  begint met een lege regel na `---`.
- `layout: section` = rode tussentitel. Er zijn ook `two-cols` en `blank`.

### Componenten

Zelfde namen en opties als de shortcodes van de Hugo-site:

| Hugo-shortcode | Component |
|---|---|
| `cards` / `card` | `<Cards>` / `<Card color icon value title outline bare stat width>` |
| `arrow` · `snakearrow` | `<CardArrow />` · `<SnakeArrow />` |
| `timeline` / `step` | `<Timeline>` / `<Step color label icon>` |
| `htimeline` / `point` | `<HTimeline>` / `<Point year color>` |
| `bar` / `segment` | `<Bar width label sublabel>` / `<Segment color width title>` |
| `columns` / `column` | `<Columns>` / `<Column width>` |
| `image` | `<ApImage src alt width maxwidth zoom />` |
| `split` | `<Split src side width height position>` |
| `callout` · `caption` | `<Callout color>` · `<Caption>` |
| `audio` · `youtube` | `<ApAudio src caption />` · `<ApYoutube id title width />` |
| `fragment="1"` | `v-click="2"` (op elke component) of een `<v-click>`-blok |
| `math` | `$$ … $$` en `$ … $` (KaTeX) |
| `note` | `:::notes` … `:::` |

Kleuren: `red`, `gray`, `orange`, `magenta`, `teal`, `green`.

Eén regel om te onthouden: **Markdown in een component krijgt een lege regel
ervoor en erna**, anders verwerkt Slidev het niet als Markdown. Korte platte
tekst mag op één regel.

```md
<Cards>
<Card color="teal" icon="🔌" title="Clients verbinden">

elke client maakt **zelf** een verbinding met de broker

</Card>
<Card color="orange" icon="📨" title="Meteen doorsturen">geen wachtrij</Card>
</Cards>
```

Afbeeldingen staan naast het deck (`images/foto.jpg`). In Markdown
(`![](images/foto.jpg)`) of in een component (`<ApImage src="images/foto.jpg" />`)
werkt hetzelfde pad, ook op GitHub Pages.

## Notes

```md
:::notes
- kort geheugensteuntje voor de lector
:::
```

(`{{% note %}}` uit de Hugo-decks werkt ook.) Notes vóór de eerste slide horen
bij het automatische titelblad. Wat ermee gebeurt, kies je met `notesMode`:

- `presenter`: enkel in de sprekersweergave (toets **S**), zoals de speaker
  notes in reveal.js. Niet op de slide, niet in de PDF.
- `external` (standaard): een aparte pagina `notes.html` per deck, gelinkt
  vanop het titelblad en de vakpagina — voor notes die cursustekst zijn.
- `inline`: als kader op de slide én in `notes.html`.

Let op: wat in de notes staat, staat in een publieke repo en in de gebouwde
site (ook in `presenter`-modus). Geen wachtwoorden of oplossingen die
studenten niet mogen zien.

## Presenteren

| Toets | |
|---|---|
| → / spatie, ← | volgende / vorige klik |
| **S** | sprekersweergave in een nieuw venster (notes, volgende slide, timer) |
| **B** | scherm op zwart (Esc of B om terug te keren) |
| **F** | volledig scherm |
| **O** · **G** | overzicht van alle slides · ga naar slide |

De PDF staat op `<deck>/slides.pdf`, gelinkt vanop het titelblad; daarin
staan alle klikken meteen zichtbaar. Een slide is ook rechtstreeks te
openen als `<deck>/5/` (handig voor links in Digitap).

## Migratie vanaf de Hugo-site (reveal-hugo)

```bash
# één deck
npm run migrate:hugo -- --input ../cursus/site/content/wirelesstech/propagatie/_index.md \
  --output ../cursus-wireless/slides/propagatie/index.md
# een heel vak: elke submap met een reveal-deck wordt slides/<submap>/index.md
npm run migrate:hugo -- --input ../cursus/site/content/iot-datalab-new --output ../iot-datalab/slides
```

Het script zet de TOML-front matter om (`title`, `weight` → `order`,
`ai_label` → `aiLabel`), maakt van de eerste titelslide het automatische
titelblad (`# Vak` / `## Les`), van `{{< slide class="title" >}}` een
`layout: section`, verhoogt de koppen (`##` → `#`) en zet elke shortcode om
naar de component hierboven, ook in codevoorbeelden. Afbeeldingen, audio, …
naast het deck gaan mee. Wat niet automatisch kan (`{{< section >}}`,
onbekende shortcodes, extra slide-attributen) verschijnt als waarschuwing met
het slidenummer.

Nakijken na een migratie: bouwen, en de slides overlopen die de build als te
vol meldt.

## GitHub Pages per vak

`.github/workflows/deploy.yml` in de vakrepo:

```yaml
name: Publish slides

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  publish:
    uses: warddr/slidev-ap-engine/.github/workflows/build-slidev-course.yml@main
```

Daarna in de vakrepo: **Settings → Pages → Build and deployment → Source:
GitHub Actions**. De site komt op `https://<gebruiker>.github.io/<repo>/`.
GitHub Pages is gratis voor publieke repo's; voor een privérepo is een betaald
plan nodig.

De engine-repo moet daarvoor publiek zijn (of de vakrepo moet toegang hebben
tot een privé-workflow).

## Output

```text
dist/
  index.html            # vakpagina
  les02-mqtt/
    index.html          # de presentatie
    1/ 2/ 3/ …          # rechtstreekse links naar een slide
    slides.pdf
    notes.html          # enkel bij notesMode external/inline
```

## Afhankelijkheden bijwerken

Slidev en zijn tientallen afhankelijkheden liggen vast in `package-lock.json`;
CI gebruikt `npm ci`, dus een build van vandaag geeft volgend jaar hetzelfde
resultaat. Bijwerken gebeurt bewust:

```bash
npm install @slidev/cli@latest @slidev/parser@latest @slidev/types@latest
npm run build:course -- --course examples/course-repo --out dist/test --base /
```

…en de PDF's en een paar decks nakijken vóór je commit.

`package.json` pint `magic-string` op 1.4.2 (`overrides`): versie 1.4.3 (5
oktober 2026) laat via UnoCSS elke Slidev-build falen met `[lightningcss
minify] Invalid token in pseudo element` (slidevjs/slidev#2768,
unocss/unocss#5373). Die regel mag weg zodra dat opgelost is.

## Thema-instellingen

- Canvas 1280×720 (16:9), basistekst 36 px (`--ap-font-size` in
  `theme/styles/index.css`); alle componenten rekenen in `em`.
- Lettertype Arial (op Linux: Liberation Sans). Geen webfonts: de decks laden
  niets van Google of een andere externe server.
- Afbeeldingen van het thema staan in `theme/assets/` en worden mee gebundeld;
  `ap-theme/` in de root van de site (favicon, achtergrond van de vakpagina en
  `notes.html`) staat er één keer per vak.
- Mermaid in AP-kleuren (`theme/setup/mermaid.ts`), klassieke look.
- Compacter voor één slide: `class: text-sm` of `class: compact-table`.
