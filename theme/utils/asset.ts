// Component props are not rewritten by Vite like <img src="./x.png"> in a
// template, so files are looked up in the deck's public folder (the engine
// copies the deck folder there) relative to the deck's base URL.
export function resolveAsset(src?: string): string {
  if (!src)
    return ''
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src))
    return src
  const base = import.meta.env.BASE_URL || '/'
  if (src.startsWith(base))
    return src
  return base + src.replace(/^\.?\//, '')
}

// The six AP theme colours; anything else falls back to the default.
export const AP_COLORS = ['red', 'gray', 'orange', 'magenta', 'teal', 'green'] as const

export function colorClass(color: string | undefined, fallback = 'teal'): string {
  const name = (AP_COLORS as readonly string[]).includes(color || '') ? color : fallback
  return `ap-color-${name}`
}
