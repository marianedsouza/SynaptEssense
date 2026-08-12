import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchSettings } from '../lib/settings'
import type { AnalystProfile } from '../lib/types'

interface SettingsContextValue {
  settings: Record<string, string>
  analystProfile: AnalystProfile
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: {},
  analystProfile: {
    name: 'Letícia Maria',
    title: 'Criadora da metodologia SynaptEssence360®',
    photoUrl: '',
    bio: '',
  },
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings().then(setSettings)
  }, [])

  const analystProfile: AnalystProfile = {
    name: settings.analyst_name ?? 'Letícia Maria',
    title: settings.analyst_title ?? 'Criadora da metodologia SynaptEssence360®',
    photoUrl: settings.analyst_photo ?? '',
    bio: settings.analyst_bio ?? '',
  }

  return (
    <SettingsContext.Provider value={{ settings, analystProfile }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
