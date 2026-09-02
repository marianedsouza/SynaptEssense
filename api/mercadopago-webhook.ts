import type { IncomingMessage, ServerResponse } from 'node:http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const setJson = (status: number, body: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end(JSON.stringify(body))
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' })
    return res.end('ok')
  }

  if (req.method !== 'POST') {
    return setJson(405, { error: 'Método não permitido.' })
  }

  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))

    const action = data?.action
    const paymentId = data?.data?.id

    if (!action || !paymentId) {
      return setJson(200, { received: true })
    }

    const accessToken = process.env.MP_ACCESS_TOKEN
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const payment = await paymentRes.json()

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey) {
      const headers = {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      }

      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/payments?mp_payment_id=eq.${payment.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: payment.status }),
        },
      )

      if (updateRes.status === 404) {
        await fetch(`${supabaseUrl}/rest/v1/payments`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({
            modality: payment.metadata?.modality || 'social',
            plan: payment.metadata?.plan || 'completo',
            amount: payment.transaction_amount,
            currency: 'BRL',
            status: payment.status,
            mp_payment_id: String(payment.id),
            payer_email: payment.payer?.email,
            payer_name: payment.payer?.first_name,
          }),
        })
      }
    }

    return setJson(200, { received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return setJson(200, { received: true })
  }
}
