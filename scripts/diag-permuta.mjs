/**
 * Diagnóstico do fluxo de PERMUTA — verifica se protocol_leads e sessions
 * aceitam a inserção que a página Permuta tenta fazer.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const paths = ['../.env', '../../.env']
  for (const p of paths) {
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

if (!URL_ || !KEY_) {
  console.log('✗ Credenciais ausentes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(URL_, KEY_)

console.log('\n── Diagnóstico PERMUTA ──\n')

// 1. Tentar inserir um lead de permuta EXATAMENTE como a página faz
const email = `diag.permuta.${Date.now()}@synapt-test.local`
const leadPayload = {
  name: 'Diagnóstico Permuta',
  phone: '(11) 99999-0000',
  email,
  plan: 'completo',
  user_id: null,
  modality: 'social',
  payment_mode: 'permuta',
  created_at: new Date().toISOString(),
}

console.log('1) Inserindo em protocol_leads (como a página Permuta faz)...')
const { data: lead, error: leadErr } = await supabase
  .from('protocol_leads')
  .insert(leadPayload)
  .select()
  .single()

if (leadErr) {
  console.log('   ✗ FALHOU:', leadErr.message)
  console.log('   → Código:', leadErr.code || '(sem código)')
  console.log('   → Detalhe:', leadErr.details || '(sem detalhe)')
  console.log('\n   Esse é o motivo de a pessoa só aparecer em Authentication.')
  process.exit(0)
} else {
  console.log('   ✓ Lead inserido com sucesso. id =', lead.id)
  console.log('   → Colunas retornadas:', Object.keys(lead).join(', '))
}

// 2. Tentar criar uma sessão vinculada
console.log('\n2) Inserindo em sessions (vínculo ao lead)...')
const { error: sessErr } = await supabase.from('sessions').insert({
  lead_id: lead.id,
  date: new Date().toISOString().slice(0, 10),
  status: 'agendada',
})
if (sessErr) {
  console.log('   ✗ FALHOU:', sessErr.message)
  console.log('   → sessions provavelmente exige role autenticada (RLS).')
} else {
  console.log('   ✓ Sessão criada.')
}

console.log('\n(Registros de diagnóstico podem ser removidos no painel admin.)\n')
