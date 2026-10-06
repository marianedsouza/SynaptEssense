import { supabase } from './supabase'

export interface Campaign {
  id: string
  name: string
  description: string | null
  slug: string
  path: string
  active: boolean
  created_at: string
  updated_at: string
}

export type CampaignInput = Pick<
  Campaign,
  'name' | 'description' | 'slug' | 'path'
>

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Campaign[]) ?? []
}

export async function createCampaign(
  input: CampaignInput,
): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...input, active: true })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Campaign
}

export async function updateCampaign(
  id: string,
  patch: Partial<CampaignInput> & { active?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Slug normalizado para usar como ?ref (minúsculas, sem acentos, hífens). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** URL rastreável da campanha no formato usado pelo restante do painel. */
export function campaignUrl(campaign: Pick<Campaign, 'path' | 'slug'>): string {
  const separator = campaign.path.includes('?') ? '&' : '?'
  return `${window.location.origin}${campaign.path}${separator}ref=${campaign.slug}`
}