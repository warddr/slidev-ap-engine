# AP style notes

Extracted from `24_TEM_AP_Presentatie_algemeen.pptx`.

## Slide size

- 16:9 widescreen (canvas 1556×875, content column 1200 px like the reveal.js
  decks of the Hugo site)
- PowerPoint internal size: 9144000 x 5143500 EMU

## Theme colors

| Token | Hex |
|---|---|
| AP red / accent 1 | `#AD0F0A` |
| dark gray | `#404040` |
| light gray | `#E7E6E6` |
| orange | `#F69B00` |
| magenta | `#AE1073` |
| teal | `#009EAE` |
| green | `#1D9759` |

Orange, magenta, teal and green as measured for the Hugo site's
`ap-theme.scss` (July 2026); earlier versions of this engine were one step off.

## Typography

- PowerPoint theme font: Arial
- The Slidev theme follows the Hugo site: Century Gothic for text, Source Sans
  Pro (uppercase, 600) for headings, Helvetica as fallback. No bundled fonts,
  no web fonts (`fonts.provider: none`).

## Assets

The theme uses the assets of the Hugo site (`site/static/`):

- `theme/assets/ap-background.jpg`: title and section background (sRGB, 1920 px,
  340 kB; recompressed from the 6.9 MB CMYK original in October 2026)
- `theme/assets/ap-red-below-right.png`: red AP triangle bottom left, at 26 %
  of the slide height
- `theme/assets/ap-logo-color.png`: favicon
- `theme/assets/ai-label/*.png`: EU icons for AI-generated or AI-modified content
  (European Commission, Art. 50 AI Act), copied from the Hugo site

No font files are bundled.
