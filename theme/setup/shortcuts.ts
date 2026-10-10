import { defineShortcutsSetup } from '@slidev/types'

// Sneltoetsen zoals in de reveal.js-decks, bovenop die van Slidev:
//   S  sprekersweergave (notes, volgende slide, timer) in een nieuw venster
//   B  scherm op zwart (nog eens B, of Esc, om terug te keren)
//   F  volledig scherm
function currentSlide(): string {
  const base = import.meta.env.BASE_URL || '/'
  const rest = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : ''
  return rest.match(/^(\d+)/)?.[1] || '1'
}

function toggleBlackout(force?: boolean) {
  document.documentElement.classList.toggle('ap-blackout', force)
}

export default defineShortcutsSetup((_nav, base) => [
  ...base,
  {
    name: 'ap_presenter',
    key: 's',
    fn: () => {
      if (location.pathname.includes('/presenter')) return
      window.open(`${import.meta.env.BASE_URL}presenter/${currentSlide()}`, 'ap-presenter', 'width=1280,height=800')
    },
  },
  { name: 'ap_blackout', key: 'b', fn: () => toggleBlackout() },
  { name: 'ap_blackout_off', key: 'escape', fn: () => toggleBlackout(false) },
  {
    name: 'ap_fullscreen',
    key: 'f',
    fn: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(),
  },
])
