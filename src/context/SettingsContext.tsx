import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchSettings } from '../lib/settings'
import type { AnalystProfile } from '../lib/types'

interface SettingsContextValue {
  settings: Record<string, string>
  analystProfile: AnalystProfile
  analystProfile2: AnalystProfile | null
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: {},
  analystProfile: {
    name: 'Letícia Maria',
    title: 'Criadora da metodologia SynaptEssence360®',
    photoUrl: '',
    bio: '',
  },
  analystProfile2: null,
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = () => fetchSettings().then(setSettings)
    load()
    const refreshOnVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', refreshOnVisible)
    window.addEventListener('focus', refreshOnVisible)
    return () => {
      document.removeEventListener('visibilitychange', refreshOnVisible)
      window.removeEventListener('focus', refreshOnVisible)
    }
  }, [])

  const analystProfile: AnalystProfile = {
    name: settings.analyst_name ?? 'Letícia Maria',
    title: settings.analyst_title ?? 'Criadora da metodologia SynaptEssence360®',
    photoUrl: settings.analyst_photo ?? '',
    bio: settings.analyst_bio ?? '',
  }

  const analystProfile2: AnalystProfile | null = settings.analyst2_name
    ? {
        name: settings.analyst2_name,
        title: settings.analyst2_title ?? '',
        photoUrl: settings.analyst2_photo ?? '',
        bio: settings.analyst2_bio ?? '',
      }
    : null

  return (
    <SettingsContext.Provider value={{ settings, analystProfile, analystProfile2 }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
