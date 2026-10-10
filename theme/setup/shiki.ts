import { defineShikiSetup } from '@slidev/types'

// Monokai, zoals de codeblokken van de Hugo-site (Chroma, standaardstijl).
export default defineShikiSetup(() => ({
  themes: {
    dark: 'monokai',
    light: 'monokai',
  },
}))
