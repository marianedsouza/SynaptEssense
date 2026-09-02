import { supabase } from './supabase'
import type { AnalystProfile, SiteSetting } from './types'

export const DEFAULT_SETTINGS: Record<string, string> = {
  analyst_name: 'Letícia Maria',
  analyst_title: 'Criadora da metodologia SynaptEssence360®',
  analyst_photo: '',
  analyst_bio:
    'Responsável pela condução da análise com devolutiva da jornada de desenvolvimento da Identidade de Impacto com Essência.',
  hero_message: 'Toda transformação começa quando novas conexões são criadas.',
  closing_message:
    'Toda transformação começa quando novas conexões são criadas.',
  institutional_text:
    'A SynaptEssence360® foi concebida para organizar diferentes dimensões da experiência humana em uma leitura estratégica de desenvolvimento.',
  privacy_email: 'contato@synaptessence.com.br',
  payment_social_price: '3.00',
  payment_integral_price: '3.00',
}

export function getDefaultAnalystProfile(): AnalystProfile {
  return {
    name: DEFAULT_SETTINGS.analyst_name,
    title: DEFAULT_SETTINGS.analyst_title,
    photoUrl: DEFAULT_SETTINGS.analyst_photo,
    bio: DEFAULT_SETTINGS.analyst_bio,
  }
}

export async function fetchSettings(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.from('settings').select('key, value')
    if (!data || data.length === 0) return { ...DEFAULT_SETTINGS }
    const merged = { ...DEFAULT_SETTINGS }
    for (const row of data as SiteSetting[]) {
      merged[row.key] = row.value
    }
    return merged
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSetting(
  key: string,
  value: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true, error: null }
}
