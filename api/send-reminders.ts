import type { IncomingMessage, ServerResponse } from 'node:http'

interface PendingPayment {
  id: string
  payer_email: string | null
  payer_name: string | null
  amount: number | null
  modality: 'social' | 'integral' | null
  plan: 'mensal' | 'completo' | null
  created_at: string
  reminder_count: number
}

interface ScheduledSession {
  id: string
  date: string
  time: string | null
  lead_id: string | null
  protocol_leads: {
    name: string | null
    email: string | null
  } | null
  reminder_count: number
}

function setJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function requireJson<T>(value: string | undefined, fallback: T): T {
  return value ? (JSON.parse(value) as T) : fallback
}

function buildUrl(base: string, path: string, params: Record<string, string>) {
  const url = new URL(path, base)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value)
  }
  return url
}

const EMAIL_FROM_NAME = 'SynaptEssence360®'
const COMPANY_TAGLINE = 'Plataforma de Tecnologia Social para o Desenvolvimento Humano Integral'

const COLORS = {
  violet: '#6d5ce7',
  teal: '#17a2a2',
  ink: '#1c1d21',
  muted: '#6b7280',
  soft: '#f7f6fb',
  border: '#e7e5f0',
}

function wrapEmail(htmlBody: string, preview: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#f4f3fa;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden">${preview}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3fa;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">
            <tr>
              <td style="background:linear-gradient(90deg, ${COLORS.teal} 0%, ${COLORS.violet} 100%);padding:28px 32px;">
                <div style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">SynaptEssence360<span style="font-size:12px;vertical-align:super;">®</span></div>
                <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:2px;">${COMPANY_TAGLINE}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${htmlBody}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;text-align:center;">
                <div style="border-top:1px solid ${COLORS.border};padding-top:20px;color:${COLORS.muted};font-size:11px;line-height:1.6;">
                  SynaptEssence360® — Toda transformação começa quando novas conexões são criadas.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:999px;background:linear-gradient(90deg, ${COLORS.violet} 0%, ${COLORS.teal} 100%);padding:14px 28px;">
        <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">${text}</a>
      </td>
    </tr>
  </table>`
}

function paymentEmailHtml(opts: {
  name: string
  amount: string | null
  planLabel: string | null
  siteUrl: string
  analystName: string
}): string {
  const amountLine = opts.amount
    ? `<p style="margin:0 0 8px;font-size:14px;color:${COLORS.ink};"><strong>Valor:</strong> ${opts.amount}</p>`
    : ''
  const planLine = opts.planLabel
    ? `<p style="margin:0 0 8px;font-size:14px;color:${COLORS.ink};"><strong>Plano:</strong> ${opts.planLabel}</p>`
    : ''
  return `
    <p style="margin:0 0 16px;color:${COLORS.ink};font-size:16px;line-height:1.6;">${opts.name}, tudo bem?</p>
    <p style="margin:0 0 16px;color:${COLORS.ink};font-size:14px;line-height:1.6;">
      Você deu o primeiro passo e <strong>entrou no Protocolo de Resgate de Identidade</strong>.
      Percebemos que o pagamento do seu plano ainda está <strong>pendente</strong>.
    </p>
    ${amountLine}
    ${planLine}
    <p style="margin:0 0 16px;color:${COLORS.ink};font-size:14px;line-height:1.6;">
      Assim que a confirmação acontecer, seu levantamento, as sessões e toda a sua jornada são liberados.
      É bem rápido: basta retornar a sua área e concluir o pagamento.
    </p>
    ${ctaButton('Concluir meu pagamento', `${opts.siteUrl}/minha-area`)}
    <p style="margin:0 0 16px;color:${COLORS.muted};font-size:13px;line-height:1.6;">
      Se tiver qualquer dúvida ou quiser ajustar algo, é só responder este e-mail — ficaremos felizes em te ajudar.
    </p>
    <p style="margin:0;color:${COLORS.ink};font-size:14px;line-height:1.6;">
      Com carinho,<br/><strong>${opts.analystName}</strong><br/><span style="color:${COLORS.muted};font-size:12px;">Equipe SynaptEssence360®</span>
    </p>`
}

function sessionEmailHtml(opts: {
  name: string
  dateLabel: string
  timeLabel: string
  siteUrl: string
  analystName: string
}): string {
  const timeLine =
    opts.timeLabel === 'horário a definir'
      ? `<p style="margin:0 0 16px;color:${COLORS.ink};font-size:14px;line-height:1.6;"><strong>Horário:</strong> ${opts.timeLabel} — você receberá a confirmação em breve.</p>`
      : `<p style="margin:0 0 16px;color:${COLORS.ink};font-size:14px;line-height:1.6;"><strong>Horário:</strong> ${opts.timeLabel}.</p>`
  return `
    <p style="margin:0 0 16px;color:${COLORS.ink};font-size:16px;line-height:1.6;">${opts.name}, amanhã é dia de consulta!</p>
    <p style="margin:0 0 16px;color:${COLORS.ink};font-size:14px;line-height:1.6;">
      Lembrando que a sua sessão do <strong>Protocolo de Resgate de Identidade</strong> está agendada para:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background-color:${COLORS.soft};border-radius:12px;padding:16px;width:100%;">
      <tr>
        <td style="padding:16px;">
          <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:${COLORS.ink};">${opts.dateLabel}</p>
          ${timeLine}
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;color:${COLORS.ink};font-size:14px;line-height:1.6;">
      Separe esse momento (em torno de 50 minutos) em um lugar tranquilo e sem interrupções.
      Nenhuma preparação é necessária — só a sua presença.
    </p>
    <p style="margin:0 0 16px;color:${COLORS.ink};font-size:14px;line-height:1.6;">
      Se precisar remarcar ou cancelar, avise-nos respondendo este e-mail com antecedência.
    </p>
    ${ctaButton('Ver minha agenda', `${opts.siteUrl}/minha-area`)}
    <p style="margin:0;color:${COLORS.ink};font-size:14px;line-height:1.6;">
      Até amanhã!<br/><strong>${opts.analystName}</strong><br/><span style="color:${COLORS.muted};font-size:12px;">Equipe SynaptEssence360®</span>
    </p>`
}

function plainText(lines: string[]): string {
  return ['', ...lines, ''].join('\n')
}

async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  html: string
  from: string
  apiKey: string
}): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({ from: opts.from, to: [opts.to], subject: opts.subject, text: opts.text, html: opts.html }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`Resend error (${res.status}): ${body}`)
      return false
    }
    return true
  } catch (err) {
    console.error('Resend request failed:', err)
    return false
  }
}

function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' })
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalized}, ${date}`
}

function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

function planLabel(plan: 'mensal' | 'completo' | null | undefined): string | null {
  if (plan === 'mensal') return 'Mensal'
  if (plan === 'completo') return 'Completo (3 meses)'
  return null
}

function datePlusDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return setJson(res, 405, { error: 'Método não permitido.' })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return setJson(res, 503, { error: 'CRON_SECRET não configurado.' })
  }
  const auth = req.headers['authorization']
  if (auth !== `Bearer ${cronSecret}`) {
    return setJson(res, 401, { error: 'Não autorizado.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  const fromRaw = process.env.EMAIL_FROM
  const siteUrl = (process.env.SITE_URL || process.env.VERCEL_URL || '').replace(/\/+$/, '')

  if (!supabaseUrl || !supabaseServiceKey) {
    return setJson(res, 503, { error: 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.' })
  }
  if (!resendApiKey || !fromRaw) {
    return setJson(res, 503, { error: 'RESEND_API_KEY e EMAIL_FROM são obrigatórios para envio.' })
  }
  if (!siteUrl) {
    return setJson(res, 503, { error: 'SITE_URL ou VERCEL_URL é obrigatório para montar os links.' })
  }

  const from = `${EMAIL_FROM_NAME} <${fromRaw}>`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
  }

  try {
    const settingsRes = await fetch(
      buildUrl(supabaseUrl, '/rest/v1/settings', {
        select: 'key,value',
        'or': '(key.eq.analyst_name,key.eq.analyst_title)',
      }).toString(),
      { headers },
    )
    const settings: Array<{ key: string; value: string | null }> = settingsRes.ok
      ? await settingsRes.json()
      : []
    const analystName =
      settings.find((s) => s.key === 'analyst_name')?.value?.trim() || 'Equipe SynaptEssence360®'

    const now = new Date()
    const tomorrow = datePlusDays(now, 1)
    const graceDate = new Date(now.getTime() - 30 * 60 * 1000).toISOString()

    // --- 1) Lembrete de pagamento pendente ---
    const pendingUrl = buildUrl(supabaseUrl, '/rest/v1/payments', {
      select: 'id,payer_email,payer_name,amount,modality,plan,created_at,reminder_count',
      'status': 'eq.pending',
      'reminder_sent_at': 'is.null',
      'created_at': `lt.${graceDate}`,
      'order': 'created_at.asc',
    }).toString()
    const pendingRes = await fetch(pendingUrl, { headers })
    const pendingPayments: PendingPayment[] = pendingRes.ok ? requireJson(await pendingRes.text(), []) : []

    let paymentReminders = 0
    for (const payment of pendingPayments) {
      const to = payment.payer_email?.trim()
      if (!to) continue
      const name = payment.payer_name?.trim() || 'Olá'
      const amount = payment.amount != null ? formatBRL(payment.amount) : null
      const plan = planLabel(payment.plan)

      const html = wrapEmail(
        paymentEmailHtml({
          name: name.split(' ')[0],
          amount,
          planLabel: plan,
          siteUrl,
          analystName,
        }),
        'Seu Levantamento Estratégico está te esperando — conclua o pagamento.',
      )
      const text = plainText([
        'Seu Levantamento Estratégico está te esperando.',
        '',
        `${name}, você entrou no Protocolo de Resgate de Identidade e o pagamento ainda está pendente.`,
        plan ? `Plano: ${plan}` : '',
        amount ? `Valor: ${amount}` : '',
        '',
        'Conclua o pagamento em: ' + `${siteUrl}/minha-area`,
        '',
        'Dúvidas? Responda este e-mail — ficaremos felizes em ajudar.',
        '',
        `Com carinho, ${analystName} — ${COMPANY_TAGLINE}`,
      ])

      const ok = await sendEmail({
        to,
        from,
        apiKey: resendApiKey,
        subject: 'Seu Levantamento Estratégico está te esperando',
        text,
        html,
      })
      if (!ok) continue

      await fetch(
        buildUrl(supabaseUrl, '/rest/v1/payments', { id: `eq.${payment.id}` }).toString(),
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({
            reminder_sent_at: new Date().toISOString(),
            reminder_count: (payment.reminder_count ?? 0) + 1,
          }),
        },
      )
      paymentReminders += 1
    }

    // --- 2) Lembrete de consulta agendada para amanhã ---
    const sessionsUrl = buildUrl(supabaseUrl, '/rest/v1/sessions', {
      select: 'id,date,time,lead_id,reminder_count,protocol_leads(name,email)',
      'status': 'eq.agendada',
      'date': `eq.${tomorrow}`,
      'reminder_sent_at': 'is.null',
      'order': 'date.asc',
    }).toString()
    const sessionsRes = await fetch(sessionsUrl, { headers })
    const sessions: ScheduledSession[] = sessionsRes.ok ? requireJson(await sessionsRes.text(), []) : []

    let sessionReminders = 0
    for (const session of sessions) {
      const to = session.protocol_leads?.email?.trim()
      if (!to) continue
      const name = session.protocol_leads?.name?.trim() || 'Olá'
      const dateLabel = formatDateLabel(session.date)
      const timeLabel = session.time?.trim() || 'horário a definir'

      const html = wrapEmail(
        sessionEmailHtml({
          name: name.split(' ')[0],
          dateLabel,
          timeLabel,
          siteUrl,
          analystName,
        }),
        'Sua consulta é amanhã — estamos ansiosos para te ver.',
      )
      const text = plainText([
        'Sua consulta é amanhã!',
        '',
        `${name}, lembrando que sua sessão do Protocolo de Resgate de Identidade está agendada:`,
        `Data: ${dateLabel}`,
        `Horário: ${timeLabel}`,
        '',
        'Separe cerca de 50 minutos em um lugar tranquilo. Nenhuma preparação é necessária.',
        'Para remarcar ou cancelar, responda este e-mail.',
        '',
        `Até amanhã, ${analystName} — ${COMPANY_TAGLINE}`,
      ])

      const ok = await sendEmail({
        to,
        from,
        apiKey: resendApiKey,
        subject: 'Sua consulta é amanhã — estamos ansiosos para te ver',
        text,
        html,
      })
      if (!ok) continue

      await fetch(
        buildUrl(supabaseUrl, '/rest/v1/sessions', { id: `eq.${session.id}` }).toString(),
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({
            reminder_sent_at: new Date().toISOString(),
            reminder_count: (session.reminder_count ?? 0) + 1,
          }),
        },
      )
      sessionReminders += 1
    }

    return setJson(res, 200, { ok: true, paymentReminders, sessionReminders, tomorrow })
  } catch (err) {
    console.error('send-reminders error:', err)
    return setJson(res, 500, { error: 'Erro interno ao enviar lembretes.' })
  }
}