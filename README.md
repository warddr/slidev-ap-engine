# slidev-ap-engine

Centrale build-engine en AP-huisstijl voor Slidev-cursuspresentaties.

Deze engine is bedoeld voor deze structuur:

```text
slidev-ap-engine/       # build, thema, scripts, workflows
cursus-netwerken/       # enkel inhoud
cursus-wireless/        # enkel inhoud
cursus-devops/          # enkel inhoud
```

De AP-look is afgeleid van de PowerPoint-template `24_TEM_AP_Presentatie_algemeen.pptx`:

- AP-rood `#AD0F0A`
- donkergrijs `#404040`
- AP-accenten: oranje, magenta, cyaan en groen
- Arial als standaardlettertype
- rode geometrische cover-achtergrond
- witte AP-ribbon op de cover
- rode hoek/footer op gewone slides

## Installatie

```bash
cd slidev-ap-engine
npm install
npx playwright install chromium
```

Voor GitHub Actions wordt Chromium automatisch geïnstalleerd door de reusable workflow.

## Voorbeeld lokaal bouwen

Voor lokaal testen is `--base /` het handigst:

```bash
npm run build:course -- \
  --course examples/course-repo \
  --out dist/netwerken \
  --base /
```

Zonder PDF-export, sneller tijdens debuggen:

```bash
npm run build:course -- \
  --course examples/course-repo \
  --out dist/netwerken \
  --base / \
  --skip-export
```

Voor GitHub Pages gebruik je bijvoorbeeld:

```bash
npm run build:course -- \
  --course ../cursus-netwerken \
  --out dist/netwerken \
  --base /cursus-netwerken/
```

Preview van één deck:

```bash
npm run preview:course -- \
  --course examples/course-repo \
  --deck h01-intro
```

## Structuur van een vakrepo

`course.yml` is niet meer nodig. De engine zoekt automatisch alle Markdown-bestanden onder `slides/`.

```text
cursus-netwerken/
  slides/
    h01-intro.md
    h02-fysieke-laag.md
  public/
    h02-fysieke-laag/
      images/
        glasvezel.png
  .github/workflows/deploy.yml
```

## Metadata staat in de Markdown

Elke les beschrijft zichzelf via YAML front matter bovenaan het `.md`-bestand:

```md
---
title: "Introductie"
course: "Netwerken IoT"
subtitle: "Slidev AP engine"
author: "Ward De Ridder"
apDate: "2026"
slug: "h01-intro"
order: 1
notesMode: external
# titlePage is true by default. Use false if you do not want the AP title page.
---

# Eerste inhoudsslide

- Punt 1
- Punt 2
```

Belangrijkste velden:

| Veld | Doel |
|---|---|
| `title` | titel van de les en automatisch AP-titelblad |
| `course` | vak/cursusnaam, gebruikt in footer en index |
| `subtitle` | optionele ondertitel op het AP-titelblad |
| `apDate` | datum/jaar in footer |
| `slug` | outputmap, bijvoorbeeld `h01-intro/` |
| `order` | volgorde op de indexpagina |
| `notesMode` | `external`, `presenter` of `inline` |
| `titlePage` | standaard `true`; zet op `false` om geen automatisch titelblad te maken |

Zonder `slug` gebruikt de engine de bestandsnaam. Zonder `title` gebruikt de engine de eerste `# Heading`.

## Optionele course.yml

Je mag nog altijd een `course.yml` gebruiken voor globale defaults, maar het hoeft niet. Dit is vooral handig als je dezelfde metadata niet in elk bestand wil herhalen:

```yaml
title: "Netwerken IoT"
author: "Ward De Ridder"
date: "2026"
notesMode: external
```

Zolang je géén `decks:` lijst zet, blijven alle `slides/**/*.md` automatisch gevonden. Zet alleen een `decks:` lijst als je de volgorde of selectie volledig handmatig wil beheren.

## Markdown voor slides

Gewone slides kunnen meteen beginnen met inhoud. Het AP-titelblad wordt automatisch vóór de eerste slide gezet.

```md
# Titel

- Punt 1
- Punt 2
```

Volgende slides scheid je met `---`:

```md
---

# Volgende slide

- Punt 1
- Punt 2
```

Section slide:

```md
---
layout: section
---

# Nieuwe sectie
```

## Cursusmateriaal / vroegere speaker notes

De standaard is **niet op de slide zelf**. Notes blijven dicht bij de slide in Markdown staan, maar de engine haalt ze uit de presentatie en maakt automatisch een aparte `notes.html`-pagina per hoofdstuk.

Gebruik bij voorkeur:

```md
:::notes
Deze tekst verschijnt niet op de slide zelf, maar wel in `notes.html` als cursusmateriaal bij deze slide.

Je kunt hier gewone Markdown gebruiken: lijsten, links, codeblokken, afbeeldingen, enzovoort.
:::
```

Bestaande reveal-hugo notes blijven ook werken:

```md
{{% note %}}
Dit wordt automatisch opgenomen in notes.html.
{{% /note %}}
```

Instellen per les kan in de Markdown-frontmatter:

```yaml
notesMode: external   # standaard: alleen in notes.html
# notesMode: presenter # als Slidev speaker notes bewaren én notes.html maken
# notesMode: inline    # note-kaarten op de slide tonen én notes.html maken
```

Of tijdelijk via de CLI:

```bash
npm run build:course -- --course examples/course-repo --out dist/netwerken --base / --notes-mode presenter
```

## PDF en notes links

Het automatisch gegenereerde AP-titelblad toont links naar:

- `./slides.pdf`
- `./notes.html`

Het build-script genereert beide bestanden per hoofdstuk.

## Afbeeldingen

Aanbevolen voor gedeelde assets per hoofdstuk:

```text
public/h02-fysieke-laag/images/glasvezel.png
```

Gebruik in Markdown:

```md
![Glasvezel](/h02-fysieke-laag/images/glasvezel.png)
```

Relatieve afbeeldingen naast een slidebestand werken meestal ook, omdat de build-engine de slide-map naar een tijdelijke Slidev-workdir kopieert.

## Migratie vanaf reveal-hugo

Een eerste automatische conversie:

```bash
npm run migrate:hugo -- \
  --input ../oude-cursus/site/content/netwerken-h2/_index.md \
  --output ../cursus-netwerken/slides/h02-fysieke-laag.md
```

Daarna manueel nakijken:

- front matter bovenaan de Markdown
- cover/section layouts
- fragments/click-animaties
- afbeeldingspaden
- heel lange notes, die beter over meerdere slides verdeeld worden

## GitHub Pages per vak

In de vakrepo zet je `.github/workflows/deploy.yml`:

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
    with:
      engine-repository: warddr/slidev-ap-engine
      engine-ref: main
```

In GitHub Pages kies je **Build and deployment -> GitHub Actions**.

## Output

Voor elk deck wordt dit gegenereerd:

```text
dist/
  index.html
  h01-intro/
    index.html
    slides.pdf
    notes.html
```

## Typografie

De AP-theme is ingesteld op **classroom readable**: standaard tekst en lijsten zijn groter dan de Slidev-default. Cursusnotities staan standaard niet op de slide, maar in de aparte notitiepagina.

Wil je voor een specifiek deck toch compacter werken, gebruik dan een CSS-class op de slide:

```md
---
class: text-sm
---
```


## v8: automatische AP-titelpagina zonder lege slide

Vanaf v8 wordt de automatische AP-titelpagina opgebouwd uit de Markdown-frontmatter van de les, zonder extra slide-frontmatterblok. Daardoor ontstaat er geen lege eerste slide meer.

Voorbeeld:

```md
---
title: "Introductie"
course: "Netwerken IoT"
slug: "h01-intro"
order: 1
notesMode: external
---

# Eerste inhoudsslide
```

De AP-titelpagina toont standaard alleen:

- de cursusnaam (`course`) als kleine bovenlijn;
- de lestitel (`title`) als ondertitel op de AP-master.

De optionele frontmatter `subtitle` wordt niet meer getoond op de automatisch gegenereerde AP-titelpagina. Je kunt die metadata nog wel gebruiken voor andere doeleinden.


## Directe links naar slides

De build maakt automatisch fallback-pagina's zoals `h01-intro/2/index.html`. Daardoor werken links vanuit `notes.html` of cursusmateriaal rechtstreeks naar `h01-intro/2/`, ook op statische hosting zoals GitHub Pages. Zonder deze fallback zou Slidev de route pas kennen nadat de SPA via `h01-intro/` geladen is.


## v0.5.1 fix

Local chapter assets referenced as `images/foo.png` are normalized to `./images/foo.png` during build. This avoids Vite/Rolldown resolving chapter images as bare imports when Markdown files live in `slides/<chapter>/index.md`.
