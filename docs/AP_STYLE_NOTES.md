# AP style notes

Extracted from `24_TEM_AP_Presentatie_algemeen.pptx`.

## Slide size

- 16:9 widescreen
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
- The Slidev theme uses system Arial/Helvetica, without bundling fonts and
  without web fonts (`fonts.provider: none`).

## Assets

The theme uses these assets extracted from the provided PPTX
(`ap-background.jpg` recompressed in October 2026: 1920 px wide, 376 kB
instead of 2362 px and 1 MB):

- `theme/assets/ap-background.jpg`
- `theme/assets/ap-logo-color.png`
- `theme/assets/ap-logo-white.png`
- `theme/assets/ai-label/*.png`: EU icons for AI-generated or AI-modified content
  (European Commission, Art. 50 AI Act), copied from the Hugo site

No font files are bundled.
