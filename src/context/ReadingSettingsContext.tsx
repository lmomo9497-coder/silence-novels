import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ReadingSettings {
  fontSize: number // px
  lineHeight: number
  font: string
  width: 'narrow' | 'normal' | 'wide'
}

const DEFAULTS: ReadingSettings = {
  fontSize: 20,
  lineHeight: 2,
  font: 'reading',
  width: 'normal',
}

interface Ctx extends ReadingSettings {
  update: (patch: Partial<ReadingSettings>) => void
  reset: () => void
}

const Ctx = createContext<Ctx>({ ...DEFAULTS, update: () => {}, reset: () => {} })

const LS = 'silence-reading-settings'

export function ReadingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {
      /* ignore */
    }
    return DEFAULTS
  })

  useEffect(() => {
    localStorage.setItem(LS, JSON.stringify(settings))
    const root = document.documentElement
    root.style.setProperty('--reading-font-size', `${settings.fontSize}px`)
    root.style.setProperty('--reading-line-height', String(settings.lineHeight))
    const fontMap: Record<string, string> = {
      reading: "'Amiri', 'Noto Naskh Arabic', Georgia, serif",
      sans: "'IBM Plex Sans Arabic', system-ui, sans-serif",
      serif: 'Georgia, serif',
    }
    root.style.setProperty('--reading-font', fontMap[settings.font] || fontMap.reading)
  }, [settings])

  const update = (patch: Partial<ReadingSettings>) => setSettings((s) => ({ ...s, ...patch }))
  const reset = () => setSettings(DEFAULTS)

  return <Ctx.Provider value={{ ...settings, update, reset }}>{children}</Ctx.Provider>
}

export const useReadingSettings = () => useContext(Ctx)
