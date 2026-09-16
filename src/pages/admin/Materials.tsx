import { useCallback, useEffect, useState } from 'react'
import {
  AudioLines,
  CloudUpload,
  FileText,
  Headphones,
  Music2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import {
  deleteMaterialFile,
  fetchMaterials,
  materialPublicUrl,
  uploadMaterial,
  type Material,
} from '../../lib/materials'
import { supabase } from '../../lib/supabase'
import defaultMeditationUrl from '../../assets/meditacao.mp3'

const DEFAULT_MEDITATION_PATH = 'padrao/meditacao.mp3'
const DEFAULT_MEDITATION_TITLE = 'Meditação guiada — padrão'
const DEFAULT_MEDITATION_DESCRIPTION =
  'Meditação padrão do protocolo. Recomendamos ouvir em um ambiente tranquilo e sem interrupções.'

function fmtSize(bytes: number | null) {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function Materials() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [active, setActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [seedingDefault, setSeedingDefault] = useState(false)

  const load = useCallback(async () => {
    setMaterials(await fetchMaterials())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setTitle('')
    setDescription('')
    setDuration('')
    setFile(null)
    setActive(true)
    setError(null)
  }

  async function handleUploadSubmit() {
    setError(null)
    if (!file) {
      setError('Selecione um arquivo para enviar.')
      return
    }
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Informe um título para o material.')
      return
    }

    const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isAudio && !isPdf) {
      setError('Envie um arquivo de áudio (MP3, WAV, OGG, M4A) ou um PDF.')
      return
    }

    setUploading(true)
    try {
      const { path, error: uploadErr } = await uploadMaterial(file)
      if (uploadErr || !path) {
        setError(uploadErr ?? 'Não foi possível enviar o arquivo.')
        setUploading(false)
        return
      }

      const { error: insertErr } = await supabase.from('materials').insert({
        title: trimmedTitle,
        type: isAudio ? 'audio' : 'pdf',
        description: description.trim() || null,
        duration: isAudio && duration.trim() ? duration.trim() : null,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        active,
      })
      if (insertErr) {
        await deleteMaterialFile(path)
        setError(`Não foi possível cadastrar o material: ${insertErr.message}`)
        setUploading(false)
        return
      }

      resetForm()
      setShowForm(false)
      await load()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(material: Material) {
    const path = material.storage_path
    await deleteMaterialFile(path)
    await supabase.from('materials').delete().eq('id', material.id)
    await load()
  }

  async function handleToggleActive(material: Material) {
    await supabase.from('materials').update({ active: !material.active }).eq('id', material.id)
    await load()
  }

  const defaultRegistered = materials.some((m) => m.storage_path === DEFAULT_MEDITATION_PATH)

  async function handleSeedDefaultMeditation() {
    setError(null)
    setSeedingDefault(true)
    try {
      const blob = await (await fetch(defaultMeditationUrl)).blob()
      const file = new File([blob], 'meditacao.mp3', { type: blob.type || 'audio/mpeg' })
      const { error: upErr } = await supabase.storage
        .from('materials')
        .upload(DEFAULT_MEDITATION_PATH, file, { upsert: true, cacheControl: '3600', contentType: blob.type || 'audio/mpeg' })
      if (upErr) {
        setError('Não foi possível enviar a meditação padrão. Verifique as políticas do bucket "materials".')
        return
      }

      const { data: existing } = await supabase
        .from('materials')
        .select('id')
        .eq('storage_path', DEFAULT_MEDITATION_PATH)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('materials')
          .update({ title: DEFAULT_MEDITATION_TITLE, description: DEFAULT_MEDITATION_DESCRIPTION, active: true, file_size: file.size })
          .eq('id', existing.id)
      } else {
        await supabase.from('materials').insert({
          title: DEFAULT_MEDITATION_TITLE,
          type: 'audio',
          description: DEFAULT_MEDITATION_DESCRIPTION,
          duration: null,
          storage_path: DEFAULT_MEDITATION_PATH,
          file_name: 'meditacao.mp3',
          file_size: file.size,
          active: true,
        })
      }

      await load()
    } catch {
      setError('Não foi possível cadastrar a meditação padrão. Verifique se o bucket "materials" existe e as políticas de upload.')
    } finally {
      setSeedingDefault(false)
    }
  }

  const audios = materials.filter((m) => m.type === 'audio')
  const pdfs = materials.filter((m) => m.type === 'pdf')

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-se-violet">
            Área do participante
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Materiais e meditação</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Envie áudios de meditação e PDFs que ficam disponíveis na área do paciente. Quem inicia um
            protocolo ativo pode ouvir e baixar os materiais cadastrados aqui.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm((v) => !v)
          }}
          className="btn-primary !px-6 !py-3 shrink-0"
        >
          <Upload className="h-4 w-4" />
          {showForm ? 'Fechar' : 'Enviar material'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="card mb-6 p-5 md:p-8">
          <h2 className="font-display text-lg font-semibold text-ink">Novo material</h2>
          <p className="mt-1 text-sm text-ink-muted">
            O tipo é identificado pelo arquivo: áudio (MP3, WAV, OGG, M4A) ou PDF.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="material-file">Arquivo</label>
              <label
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                  file ? 'border-se-violet bg-se-lavender/40' : 'border-ink/15 hover:border-se-violet/40'
                }`}
              >
                {file ? (
                  <>
                    {file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name) ? (
                      <Music2 className="h-8 w-8 text-se-violet" />
                    ) : (
                      <FileText className="h-8 w-8 text-se-violet" />
                    )}
                    <span className="text-sm font-medium text-ink">{file.name}</span>
                    <span className="text-xs text-ink-muted">{fmtSize(file.size)}</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-8 w-8 text-ink-muted" />
                    <span className="text-sm text-ink-soft">Clique para selecionar o arquivo</span>
                    <span className="text-xs text-ink-muted">PDF, MP3, WAV, OGG ou M4A</span>
                  </>
                )}
                <input
                  id="material-file"
                  type="file"
                  accept=".pdf,audio/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div>
              <label className="label" htmlFor="material-title">Título</label>
              <input
                id="material-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Meditação guiada — respiração consciente"
              />
            </div>

            <div>
              <label className="label" htmlFor="material-duration">Duração (opcional)</label>
              <input
                id="material-duration"
                className="input"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex.: 12 min"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="material-description">Descrição (opcional)</label>
              <input
                id="material-description"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição exibida ao paciente"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActive((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${active ? 'bg-se-teal' : 'bg-ink/15'}`}
                aria-label="Material ativo"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    active ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
              <span className="text-sm text-ink-soft">
                {active ? 'Visível para os participantes' : 'Oculto para os participantes'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={handleUploadSubmit} disabled={uploading} className="btn-primary">
              <CloudUpload className="h-4 w-4" />
              {uploading ? 'Enviando…' : 'Salvar material'}
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-se-violet border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Áudio de meditação */}
          <div className="card mb-6 p-5 md:p-8">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-se-violet" />
              <h2 className="font-display text-lg font-semibold text-ink">Áudios de meditação</h2>
              <span className="ml-auto rounded-full bg-se-lavender px-3 py-1 text-xs font-medium text-se-violet">
                {audios.length} cadastrado{audios.length === 1 ? '' : 's'}
              </span>
            </div>

            {audios.length === 0 ? (
              <p className="mt-5 text-sm text-ink-muted">
                Nenhum áudio cadastrado ainda. Envie a meditação para ela aparecer na área do paciente.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {audios.map((m) => (
                  <MaterialRow
                    key={m.id}
                    material={m}
                    onDelete={() => handleDelete(m)}
                    onToggle={() => handleToggleActive(m)}
                  />
                ))}
              </div>
            )}

            {!defaultRegistered && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-se-violet/20 bg-se-lavender/40 px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 shrink-0 text-se-violet" />
                  <div>
                    <div className="text-sm font-semibold text-ink">Meditação padrão do protocolo</div>
                    <div className="text-xs text-ink-muted">
                      Cadastrar o áudio de meditação pré-carregado na plataforma.
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSeedDefaultMeditation}
                  disabled={seedingDefault}
                  className="btn-primary !px-5 !py-2.5 text-xs shrink-0"
                >
                  {seedingDefault ? 'Cadastrando…' : 'Cadastrar meditação padrão'}
                </button>
              </div>
            )}
          </div>

          {/* PDFs / materiais */}
          <div className="card p-5 md:p-8">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-se-violet" />
              <h2 className="font-display text-lg font-semibold text-ink">Documentos (PDF)</h2>
              <span className="ml-auto rounded-full bg-se-lavender px-3 py-1 text-xs font-medium text-se-violet">
                {pdfs.length} cadastrado{pdfs.length === 1 ? '' : 's'}
              </span>
            </div>

            {pdfs.length === 0 ? (
              <p className="mt-5 text-sm text-ink-muted">
                Nenhum documento cadastrado ainda. Envie PDFs com orientações, roteiros ou materiais de apoio.
              </p>
            ) : (
              <div className="mt-5 space-y-2.5">
                {pdfs.map((m) => (
                  <MaterialRow
                    key={m.id}
                    material={m}
                    onDelete={() => handleDelete(m)}
                    onToggle={() => handleToggleActive(m)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}

function MaterialRow({
  material,
  onDelete,
  onToggle,
}: {
  material: Material
  onDelete: () => void
  onToggle: () => void
}) {
  const url = materialPublicUrl(material.storage_path)
  const Icon = material.type === 'audio' ? AudioLines : FileText

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center ${
        material.active ? 'border-ink/10 bg-se-mist/50' : 'border-ink/10 bg-ink/5 opacity-70'
      }`}
    >
      {material.type === 'audio' ? (
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-se-violet" />
            <span className="text-sm font-semibold text-ink">{material.title}</span>
            {material.duration && (
              <span className="rounded-full bg-se-lavender px-2 py-0.5 text-[10px] font-medium text-se-violet">
                {material.duration}
              </span>
            )}
          </div>
          {material.description && <p className="mt-1 text-xs text-ink-muted">{material.description}</p>}
          <audio controls src={url} className="mt-2 w-full max-w-md" preload="none" />
        </div>
      ) : (
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-se-violet" />
            <span className="text-sm font-semibold text-ink">{material.title}</span>
          </div>
          {material.description && <p className="mt-1 text-xs text-ink-muted">{material.description}</p>}
        </div>
      )}

      <div className="flex items-center gap-2 self-start sm:self-center">
        <span
          onClick={onToggle}
          className={`relative h-6 w-11 cursor-pointer rounded-full transition ${material.active ? 'bg-se-teal' : 'bg-ink/15'}`}
          aria-label="Ativo"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              material.active ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-se-violet/30 hover:text-se-violet"
        >
          {material.type === 'audio' ? 'Abrir' : 'Ver PDF'}
        </a>
        <button
          onClick={onDelete}
          className="rounded-full p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-600"
          aria-label="Excluir material"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="text-[10px] text-ink-muted">
        {fmtDate(material.created_at)}
        {material.file_size ? ` • ${fmtSize(material.file_size)}` : ''}
      </div>
    </div>
  )
}
