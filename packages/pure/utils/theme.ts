type Theme = 'system' | 'dark' | 'light'
const themes: readonly Theme[] = ['system', 'dark', 'light']
let unsavedTheme: Theme | undefined
let systemMedia: MediaQueryList | undefined
let listening = false

const validTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && themes.includes(value as Theme)

export function getTheme(): Theme | null {
  if (unsavedTheme) return unsavedTheme
  try {
    const preference = localStorage.getItem('theme')
    return validTheme(preference) ? preference : null
  } catch {
    return null
  }
}

function media() {
  return (systemMedia ??= window.matchMedia('(prefers-color-scheme: dark)'))
}

function applyTheme(preference: Theme) {
  const dark = preference === 'dark' || (preference === 'system' && media().matches)
  document.documentElement.classList.toggle('dark', dark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0B0B10' : '#FCFCFD')
}

export function listenThemeChange() {
  if (listening) return
  media().addEventListener('change', () => {
    // A device setting must never override an explicit light/dark preference.
    if ((getTheme() || 'system') === 'system') applyTheme('system')
  })
  listening = true
}

export function setTheme(theme?: string, save = false): Theme | undefined {
  if (theme !== undefined && !validTheme(theme)) return
  const current = getTheme() || 'system'
  const preference: Theme = theme === undefined
    ? (save ? themes[(themes.indexOf(current) + 1) % themes.length]! : current)
    : theme as Theme

  if (save) {
    try {
      localStorage.setItem('theme', preference)
      unsavedTheme = undefined
    } catch {
      // Keep the preference usable when browser storage is unavailable.
      unsavedTheme = preference
    }
  }
  applyTheme(preference)
  listenThemeChange()
  return preference
}
