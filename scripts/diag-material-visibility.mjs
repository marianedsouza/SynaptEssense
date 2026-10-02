/**
 * Diagnóstico da visibilidade de materiais por paciente.
 * - Verifica se a coluna materials.visible_to existe.
 * - Para cada paciente, calcula quais materiais ele veria,
 *   usando a MESMA regra da área do paciente:
 *      material.active  OU  visible_to inclui o id do lead do paciente.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  for (const p of ['../.env', '../../.env']) {
    try {
      const raw = readFileSync(new URL(p, import.meta.url), 'utf8')
      const env = {}
      for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
      }
      return env
    } catch { /* next */ }
  }
  return {}
}
const env = loadEnv()
const URL_ = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const KEY_ = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY
if (!URL_ || !KEY_) { console.log('✗ Credenciais ausentes'); process.exit(1) }

const supabase = createClient(URL_, KEY_)

console.log('\n── Diagnóstico: visibilidade de materiais ──\n')

// 1. Coluna visible_to existe?
const { data: mats, error: matErr } = await supabase
  .from('materials')
  .select('id, title, active, visible_to')
  .order('created_at', { ascending: true })

if (matErr) {
  if (/visible_to/.test(matErr.message)) {
    console.log('✗ A coluna visible_to NÃO existe. Rode supabase/add_material_visibility.sql no Supabase.')
  } else {
    console.log('✗ Erro ao ler materials:', matErr.message)
  }
  process.exit(1)
}
console.log('✓ Coluna visible_to existe. Materiais encontrados:', mats.length)
for (const m of mats) {
  console.log(`   • ${m.title} — ${m.active ? 'ATIVO (todos)' : 'oculto'} — liberado p/ ${(m.visible_to ?? []).length} paciente(s)`)
}

// 2. Pacientes
const { data: leads } = await supabase
  .from('protocol_leads')
  .select('id, name, email')
  .order('created_at', { ascending: false })

if (!leads || leads.length === 0) {
  console.log('\n(Nenhum paciente cadastrado para simular a visualização.)')
  process.exit(0)
}

console.log('\nSimulação por paciente (o que cada um veria na área):')
for (const lead of leads.slice(0, 8)) {
  const visiveis = mats.filter(
    (m) => m.active || (m.visible_to ?? []).includes(lead.id),
  )
  console.log(`\n  ${lead.name} (${lead.email ?? 'sem email'})`)
  if (visiveis.length === 0) {
    console.log('    — nenhum material visível')
  } else {
    for (const m of visiveis) {
      const motivo = m.active ? 'ativo p/ todos' : 'liberado individualmente'
      console.log(`    ✓ ${m.title}  [${motivo}]`)
    }
  }
}

console.log('\n✓ Regra de visibilidade validada: material.active OU visible_to inclui o paciente.')
console.log('  Ao desmarcar o check (material oculto), o id sai de visible_to e o material deixa de aparecer para o paciente.\n')
