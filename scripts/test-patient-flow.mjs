/**
 * Teste inteligente de validação da ÁREA DO PACIENTE (SynaptEssence360®)
 *
 * Simula, de ponta a ponta, exatamente o que o navegador do participante faz,
 * usando as mesmas funções RPC do Supabase que a aplicação usa.
 *
 * Fluxo validado:
 *  1. create_participant        → a pessoa inicia o levantamento (entra na área)
 *  2. get_participant           → consegue carregar o próprio registro (acesso)
 *  3. save_participant_answers  → consegue salvar respostas (progresso)
 *  4. get_participant_by_email  → consegue retomar de onde parou
 *  5. complete_participant      → consegue concluir
 *
 * Uso:  node scripts/test-patient-flow.mjs
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ─── Carregar variáveis do .env ──────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    return env
  } catch {
    return {}
  }
}

const env = loadEnv()
const URL_ = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL
const KEY_ = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY

// ─── Util de log ─────────────────────────────────────────────────────────────
const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
}

let passed = 0
let failed = 0
const results = []

function ok(name, detail = '') {
  passed++
  results.push({ name, ok: true, detail })
  console.log(`  ${C.green('✓')} ${name}${detail ? C.dim(' — ' + detail) : ''}`)
}
function fail(name, detail = '') {
  failed++
  results.push({ name, ok: false, detail })
  console.log(`  ${C.red('✗')} ${name}${detail ? C.red(' — ' + detail) : ''}`)
}

// ─── Início ──────────────────────────────────────────────────────────────────
console.log('\n' + C.bold(C.cyan('── Teste da Área do Paciente — SynaptEssence360® ──')) + '\n')

if (!URL_ || !KEY_) {
  console.log(C.red('✗ Credenciais do Supabase não encontradas.'))
  console.log(C.dim('  Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env'))
  process.exit(1)
}

console.log(C.dim(`  Supabase: ${URL_}`))
console.log(C.dim(`  Chave:    ${KEY_.slice(0, 12)}…\n`))

const supabase = createClient(URL_, KEY_)

const stamp = Date.now()
const testEmail = `teste.fluxo.${stamp}@synapt-test.local`
const identification = {
  fullName: 'Paciente de Teste Automatizado',
  email: testEmail,
  city: 'São Paulo',
  state: 'SP',
  birthDate: '1990-01-01',
  age: '35',
  field: 'Teste QA',
  experienceTime: '4 a 7 anos',
  organization: 'Synapt QA',
  surveyFor: 'Para mim',
}

let participantId = null

async function run() {
  // ── 1. Conectividade básica ────────────────────────────────────────────────
  console.log(C.bold('1) Conectividade e configuração'))
  try {
    const { error } = await supabase.from('settings').select('key').limit(1)
    if (error) fail('Conexão com o banco (settings legível)', error.message)
    else ok('Conexão com o banco de dados')
  } catch (e) {
    fail('Conexão com o banco de dados', String(e.message || e))
  }

  // ── 2. Criar participante (entrar na área) ──────────────────────────────────
  console.log('\n' + C.bold('2) Entrada na área do paciente (create_participant)'))
  const now = new Date().toISOString()
  const payload = {
    name: identification.fullName,
    email: identification.email,
    city: identification.city,
    state: identification.state,
    birth_date: identification.birthDate,
    age: identification.age,
    field: identification.field,
    experience_time: identification.experienceTime,
    organization: identification.organization,
    survey_for: identification.surveyFor,
    answers: {},
    questionnaire_version: 'v0.1',
    identification,
    started_at: now,
    consent: true,
  }
  try {
    const { data, error } = await supabase.rpc('create_participant', { payload })
    if (error) {
      fail('Criar participante', error.message)
    } else if (!data || !data.id) {
      fail('Criar participante', 'resposta sem id')
    } else {
      participantId = data.id
      ok('Participante criado', `id ${data.id.slice(0, 8)}…`)
      if (data.status === 'em_andamento') ok('Status inicial = em_andamento')
      else fail('Status inicial', `esperado em_andamento, veio ${data.status}`)
      if (data.consent === true) ok('Consentimento registrado')
      else fail('Consentimento registrado', `veio ${data.consent}`)
    }
  } catch (e) {
    fail('Criar participante', String(e.message || e))
  }

  if (!participantId) {
    summary()
    return
  }

  // ── 3. Carregar o próprio registro (acesso à área) ──────────────────────────
  console.log('\n' + C.bold('3) Acesso ao questionário (get_participant)'))
  try {
    const { data, error } = await supabase.rpc('get_participant', { p_id: participantId })
    if (error) fail('Carregar participante por id', error.message)
    else if (!data || data.id !== participantId) fail('Carregar participante por id', 'registro não corresponde')
    else {
      ok('Participante carregado por id')
      if (data.name === identification.fullName) ok('Dados de identificação persistidos')
      else fail('Dados de identificação persistidos', `nome veio ${data.name}`)
    }
  } catch (e) {
    fail('Carregar participante por id', String(e.message || e))
  }

  // ── 4. Salvar respostas (progresso) ─────────────────────────────────────────
  console.log('\n' + C.bold('4) Salvar progresso (save_participant_answers)'))
  const partialAnswers = { q1: '4', q2: '3', q3: 'Resposta aberta de teste' }
  try {
    const { error } = await supabase.rpc('save_participant_answers', {
      p_id: participantId,
      p_answers: partialAnswers,
      p_progress: 35,
    })
    if (error) {
      fail('Salvar respostas parciais', error.message)
    } else {
      ok('Respostas parciais salvas')
      // Verificar persistência
      const { data: check } = await supabase.rpc('get_participant', { p_id: participantId })
      if (check && check.progress === 35) ok('Progresso persistido = 35%')
      else fail('Progresso persistido', `veio ${check?.progress}`)
      if (check && check.answers && check.answers.q1 === '4') ok('Respostas persistidas corretamente')
      else fail('Respostas persistidas', 'q1 não encontrado')
    }
  } catch (e) {
    fail('Salvar respostas parciais', String(e.message || e))
  }

  // ── 5. Retomar por e-mail ───────────────────────────────────────────────────
  console.log('\n' + C.bold('5) Retomar de onde parou (get_participant_by_email)'))
  try {
    const { data, error } = await supabase.rpc('get_participant_by_email', { p_email: testEmail })
    if (error) {
      fail('Buscar por e-mail', error.message + C.yellow(' — rode supabase/delete-resume.sql'))
    } else if (!data || data.id !== participantId) {
      fail('Buscar por e-mail', 'não retornou o participante correto')
    } else {
      ok('Retomada por e-mail funciona')
      if (data.progress === 35) ok('Retomada preserva o progresso')
      else fail('Retomada preserva o progresso', `veio ${data.progress}`)
    }
  } catch (e) {
    fail('Buscar por e-mail', String(e.message || e))
  }

  // ── 6. Concluir levantamento ────────────────────────────────────────────────
  console.log('\n' + C.bold('6) Conclusão do levantamento (complete_participant)'))
  const fullAnswers = { ...partialAnswers, q4: '5', q5: 'Concluído' }
  try {
    const { error } = await supabase.rpc('complete_participant', {
      p_id: participantId,
      p_answers: fullAnswers,
      p_progress: 100,
      p_time_seconds: 420,
    })
    if (error) {
      fail('Concluir levantamento', error.message)
    } else {
      ok('Levantamento concluído')
      const { data: check } = await supabase.rpc('get_participant', { p_id: participantId })
      if (check && check.status === 'concluido') ok('Status final = concluido')
      else fail('Status final', `veio ${check?.status}`)
      if (check && check.progress === 100) ok('Progresso final = 100%')
      else fail('Progresso final', `veio ${check?.progress}`)
      if (check && check.completed_at) ok('Data de conclusão registrada')
      else fail('Data de conclusão', 'completed_at vazio')
    }
  } catch (e) {
    fail('Concluir levantamento', String(e.message || e))
  }

  // ── 7. Segurança: anon não lê a tabela diretamente ──────────────────────────
  console.log('\n' + C.bold('7) Segurança (RLS)'))
  try {
    const { data, error } = await supabase.from('participants').select('*').limit(1)
    if (error || !data || data.length === 0) {
      ok('Tabela participants protegida contra leitura anônima direta')
    } else {
      fail('RLS da tabela participants', C.yellow('leitura anônima direta permitida — revise as policies'))
    }
  } catch {
    ok('Tabela participants protegida contra leitura anônima direta')
  }

  summary()
}

function summary() {
  console.log('\n' + C.bold('── Resultado ──'))
  console.log(`  ${C.green(passed + ' passaram')}   ${failed > 0 ? C.red(failed + ' falharam') : C.dim('0 falharam')}`)
  if (participantId) {
    console.log(C.dim(`\n  Registro de teste criado: ${participantId}`))
    console.log(C.dim(`  E-mail de teste: ${testEmail}`))
    console.log(C.dim('  (pode ser removido no painel admin ou via delete_participant)'))
  }
  console.log('')
  if (failed === 0) {
    console.log(C.green(C.bold('  ✓ A ÁREA DO PACIENTE ESTÁ FUNCIONANDO — a pessoa consegue entrar, responder, retomar e concluir.\n')))
    process.exit(0)
  } else {
    console.log(C.red(C.bold('  ✗ Há falhas no fluxo. Veja os itens marcados acima.\n')))
    process.exit(1)
  }
}

run().catch((e) => {
  console.error(C.red('Erro inesperado: ' + (e.message || e)))
  process.exit(1)
})
