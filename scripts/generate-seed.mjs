import { writeFileSync, mkdirSync } from 'node:fs'
import { questionBank, QUESTIONNAIRE_VERSION } from '../src/lib/questionBank.ts'

const esc = (s) => String(s ?? '').replace(/'/g, "''")

const lines = []
lines.push('-- ============================================================')
lines.push('-- SynaptEssence360® — Seed do banco de perguntas ' + QUESTIONNAIRE_VERSION)
lines.push('-- Gerado por scripts/generate-seed.mjs')
lines.push('-- ============================================================')
lines.push('')

lines.push("insert into public.questionnaire_versions (code, name, active) values")
lines.push(`  ('v0.1', 'SynaptEssence360® — Levantamento v0.1', true)`)
lines.push('on conflict (code) do nothing;')
lines.push('')

const rows = questionBank.map((q, i) => {
  const options = JSON.stringify(q.options)
  return `  ('${q.id}', '${QUESTIONNAIRE_VERSION}', '${q.axis}', ${i + 1}, '${q.type}', '${esc(q.text)}', '${esc(options)}'::jsonb, ${q.required}, '${q.module}', ${q.archetype ? `'${q.archetype}'` : 'null'})`
})

lines.push('insert into public.questions')
lines.push('  (qid, version, axis, ord, type, text, options, required, module, archetype)')
lines.push('values')
lines.push(rows.join(',\n'))
lines.push('on conflict (qid, version) do update set')
lines.push('  text = excluded.text, options = excluded.options, ord = excluded.ord;')
lines.push('')

lines.push('-- Configurações padrão')
lines.push('insert into public.settings (key, value) values')
lines.push(`  ('analyst_name', 'Letícia Maria'),`)
lines.push(`  ('analyst_title', 'Criadora da metodologia SynaptEssence360®'),`)
lines.push(`  ('analyst_photo', ''),`)
lines.push(`  ('analyst_bio', 'Especialista responsável pela condução da análise e devolutiva. Toda transformação começa quando novas conexões são criadas.'),`)
lines.push(`  ('hero_message', 'Toda transformação começa quando novas conexões são criadas.'),`)
lines.push(`  ('closing_message', 'Toda transformação começa quando novas conexões são criadas.'),`)
lines.push(`  ('institutional_text', 'A SynaptEssence360® foi concebida para organizar diferentes dimensões da experiência humana em uma leitura estratégica de desenvolvimento.'),`)
lines.push(`  ('privacy_email', 'contato@synaptessence.com.br')`)
lines.push('on conflict (key) do update set value = excluded.value;')
lines.push('')

mkdirSync('supabase', { recursive: true })
writeFileSync('supabase/seed.sql', lines.join('\n'), 'utf8')
console.log(`seed.sql gerado com ${questionBank.length} perguntas.`)
