import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'
import { AXIS } from './axes'
import { LIKERT_SCALE } from './questionBank'
import type { Participant, Question } from './types'

function optionLabel(question: Question, value: string): string {
  const option = question.options.find((o) => o.id === value)
  return option ? option.label : value
}

export function formatAnswer(question: Question, value: string | string[] | undefined): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) {
    return value.map((v) => optionLabel(question, v)).join(', ')
  }
  if (question.type === 'likert') {
    const scale = LIKERT_SCALE.find((s) => s.value === Number(value))
    return scale ? `${value} — ${scale.label}` : value
  }
  if (question.type === 'single' || question.type === 'multiple') {
    return optionLabel(question, value)
  }
  return value
}

export function groupAnswersByAxis(
  questions: Question[],
  answers: Record<string, string | string[]>,
): { axis: string; items: { question: Question; answer: string }[] }[] {
  const groups: { axis: string; items: { question: Question; answer: string }[] }[] = []
  for (const q of questions) {
    const group = groups.find((g) => g.axis === q.axis)
    const answer = formatAnswer(q, answers[q.id])
    const item = { question: q, answer }
    if (group) group.items.push(item)
    else groups.push({ axis: q.axis, items: [item] })
  }
  return groups
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function exportParticipantPdf(
  participant: Participant,
  questions: Question[],
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 48
  const contentWidth = pageWidth - margin * 2
  let y = 0

  const sectionTitle = (title: string, color: [number, number, number] = [30, 77, 140]) => {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage()
      y = margin
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(color[0], color[1], color[2])
    doc.text(title.toUpperCase(), margin, y)
    y += 6
    doc.setDrawColor(230, 227, 243)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageWidth - margin, y)
    y += 18
  }

  const text = (
    content: string,
    size = 10,
    color: [number, number, number] = [47, 55, 75],
    bold = false,
  ) => {
    const lines = doc.splitTextToSize(content, contentWidth)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color[0], color[1], color[2])
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += size + 4
    }
  }

  // Capa
  y = 70
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 41)
  doc.text('SynaptEssence360®', margin, y)
  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(107, 79, 160)
  doc.text('Levantamento Estratégico — Dossiê do Participante', margin, y)
  y += 40

  sectionTitle('Identificação')
  const rows: [string, string][] = [
    ['Nome', participant.name ?? '—'],
    ['E-mail', participant.email ?? '—'],
    ['Cidade / Estado', `${participant.city ?? '—'} / ${participant.state ?? '—'}`],
    ['Data de nascimento', participant.birth_date ? fmtDate(participant.birth_date) : '—'],
    ['Idade', participant.age ? String(participant.age) : '—'],
    ['Área de atuação', participant.field ?? '—'],
    ['Tempo de atuação', participant.experience_time ?? '—'],
    ['Empresa / Marca', participant.organization ?? '—'],
    ['Levantamento para', participant.survey_for ?? '—'],
    ['Versão do questionário', participant.questionnaire_version ?? '—'],
    ['Data de preenchimento', fmtDate(participant.started_at)],
    ['Status', participant.status === 'concluido' ? 'Concluído' : 'Em andamento'],
  ]
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(47, 55, 75)
    doc.text(label, margin, y)
    const labelWidth = doc.getTextWidth(label) + 16
    doc.setFont('helvetica', 'normal')
    const valLines = doc.splitTextToSize(value, contentWidth - labelWidth)
    const lines = valLines.length ? valLines : ['']
    doc.text(lines[0], margin + labelWidth, y)
    y += 14
    for (let i = 1; i < lines.length; i++) {
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage()
        y = margin
      }
      doc.text(lines[i], margin + labelWidth, y)
      y += 14
    }
  }
  y += 12

  for (const group of groupAnswersByAxis(questions, participant.answers ?? {})) {
    sectionTitle(AXIS[group.axis]?.label ?? group.axis, group.axis === 'brand' ? [47, 51, 128] : [30, 77, 140])
    for (const item of group.items) {
      text(item.question.text, 10, [47, 55, 75], true)
      text(item.answer || '(sem resposta)', 10, [107, 79, 160])
      y += 6
    }
  }

  y += 14
  sectionTitle('Frase institucional')
  text('Toda transformação começa quando novas conexões são criadas.', 11, [47, 51, 128], true)

  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 170)
    doc.text(`SynaptEssence360® — Página ${p} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 24, {
      align: 'center',
    })
  }

  const safeName = (participant.name ?? 'participante').replace(/[^\w\s]/g, '').trim()
  doc.save(`SynaptEssence360-${safeName}.pdf`)
}

export async function exportParticipantExcel(
  participant: Participant,
  questions: Question[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'SynaptEssence360®'
  workbook.created = new Date()

  const info = workbook.addWorksheet('Dados')
  const addInfoRow = (label: string, value: string, bold = false) => {
    const row = info.addRow([label, value])
    row.getCell(1).font = { bold: true, color: { argb: 'FF1E4D8C' } }
    if (bold) row.getCell(2).font = { bold: true }
    return row
  }
  addInfoRow('SynaptEssence360®', 'Levantamento Estratégico', true)
  addInfoRow('Nome', participant.name ?? '')
  addInfoRow('E-mail', participant.email ?? '')
  addInfoRow('Cidade / Estado', `${participant.city ?? ''} / ${participant.state ?? ''}`)
  addInfoRow('Data de nascimento', participant.birth_date ?? '')
  addInfoRow('Idade', participant.age ? String(participant.age) : '')
  addInfoRow('Área de atuação', participant.field ?? '')
  addInfoRow('Tempo de atuação', participant.experience_time ?? '')
  addInfoRow('Empresa / Marca', participant.organization ?? '')
  addInfoRow('Levantamento para', participant.survey_for ?? '')
  addInfoRow('Versão', participant.questionnaire_version ?? '')
  addInfoRow('Iniciado em', participant.started_at ?? '')
  addInfoRow('Concluído em', participant.completed_at ?? '')
  addInfoRow('Status', participant.status)
  info.getColumn(1).width = 26
  info.getColumn(2).width = 46

  const answers = workbook.addWorksheet('Respostas')
  answers.columns = [
    { header: 'Eixo', key: 'axis', width: 22 },
    { header: 'Pergunta', key: 'question', width: 60 },
    { header: 'Resposta', key: 'answer', width: 60 },
  ]
  answers.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  answers.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B4FA0' },
  }

  const ordered = [...questions].sort((a, b) => a.order - b.order)
  for (const group of groupAnswersByAxis(ordered, participant.answers ?? {})) {
    for (const item of group.items) {
      answers.addRow({
        axis: AXIS[group.axis]?.label ?? group.axis,
        question: item.question.text,
        answer: item.answer,
      })
    }
  }
  answers.eachRow((row) => {
    row.alignment = { vertical: 'top', wrapText: true }
  })

  const safeName = (participant.name ?? 'participante').replace(/[^\w\s]/g, '').trim()
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `SynaptEssence360-${safeName}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
