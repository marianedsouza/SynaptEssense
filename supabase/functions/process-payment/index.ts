import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const {
      token,
      issuer_id,
      payment_method_id,
      transaction_amount,
      installments,
      payer_email,
      payer_name,
      payer_phone,
      lead_id,
      modality,
    } = await req.json()

    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")
    if (!mpAccessToken) {
      throw new Error("MP_ACCESS_TOKEN não configurado no Supabase.")
    }

    const body: Record<string, unknown> = {
      token,
      issuer_id,
      payment_method_id,
      transaction_amount: Number(transaction_amount),
      installments: Number(installments),
      description: `Protocolo SynaptEssence360® - Modalidade ${modality === "social" ? "Social" : "Integral"}`,
      payer: {
        email: payer_email,
      },
    }

    if (payer_name) {
      ;(body.payer as Record<string, unknown>).first_name = payer_name
    }
    if (payer_phone) {
      ;(body.payer as Record<string, unknown>).phone = { number: payer_phone }
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    })

    const mpData = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", mpData)
      return new Response(
        JSON.stringify({
          error: mpData.message || "Erro ao processar pagamento.",
          status: mpData.status,
          detail: mpData.cause,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Save payment to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error: dbError } = await supabase.from("payments").insert({
      lead_id: lead_id || null,
      modality,
      amount: Number(transaction_amount),
      currency: "BRL",
      status: mpData.status,
      mp_payment_id: String(mpData.id),
      payer_name,
      payer_email,
      payer_phone,
    })

    if (dbError) {
      console.error("Supabase error:", dbError)
      // Payment was processed but DB save failed - still return success
      // The payment ID can be used to reconcile later
    }

    return new Response(
      JSON.stringify({
        status: mpData.status,
        payment_id: mpData.id,
        status_detail: mpData.status_detail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err) {
    console.error("Function error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})
