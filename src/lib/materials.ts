import { supabase } from './supabase'

const MATERIALS_BUCKET = 'materials'

export interface Material {
  id: string
  title: string
  type: 'audio' | 'pdf'
  description: string | null
  duration: string | null
  storage_path: string
  file_name: string
  file_size: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []) as Material[]
}

export function materialPublicUrl(path: string): string {
  const { data } = supabase.storage.from(MATERIALS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadMaterial(
  file: File,
): Promise<{ path: string; error: string | null }> {
  const path = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || undefined,
  })
  if (error) {
    return {
      path: '',
      error: 'Não foi possível enviar o arquivo. Verifique se o bucket "materials" existe e as políticas de upload.',
    }
  }
  return { path, error: null }
}

export async function deleteMaterialFile(path: string) {
  return supabase.storage.from(MATERIALS_BUCKET).remove([path])
}