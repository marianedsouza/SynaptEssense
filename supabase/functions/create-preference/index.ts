import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-site-url",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { modalidade, plan, amount, name, email, phone, lead_id, user_id } = await req.json()

    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN")
    if (!mpAccessToken) {
      throw new Error("MP_ACCESS_TOKEN não configurado no Supabase.")
    }

    const origin = req.headers.get("x-site-url") || Deno.env.get("SITE_URL") || ""

    const modalityLabel =
      modalidade === "social" ? "Modalidade Social" : "Protocolo Integral de Reconstrução"
    const planLabel = plan === "mensal" ? "Plano Mensal" : "Plano Completo"

    const preferenceBody: Record<string, unknown> = {
      items: [
        {
          title: `Protocolo SynaptEssence360® - ${modalityLabel} (${planLabel})`,
          quantity: 1,
          unit_price: Number(amount),
          currency_id: "BRL",
        },
      ],
      payer: {
        name,
        email,
        phone: phone ? { number: phone } : undefined,
      },
      back_urls: {
        success: `${origin}/minha-area?status=approved`,
        pending: `${origin}/minha-area?status=pending`,
        failure: `${origin}/minha-area?status=failure`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/mercadopago-webhook`,
      statement_descriptor: "SYNAPTESSENCE360",
      metadata: {
        modality: modalidade,
        plan: plan || "completo",
        lead_id: lead_id || "",
        user_id: user_id || "",
      },
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preferenceBody),
    })

    const mpData = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error("Mercado Pago create preference error:", mpData)
      return new Response(
        JSON.stringify({
          error: mpData.message || "Erro ao criar preferência de pagamento.",
          status: mpData.status,
          detail: mpData.cause,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Save preference id to payments table
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase.from("payments").insert({
        lead_id: lead_id || null,
        modality: modalidade,
        plan: plan || "completo",
        amount: Number(amount),
        currency: "BRL",
        status: "pending",
        mp_preference_id: mpData.id,
        payer_name: name,
        payer_email: email,
        payer_phone: phone || null,
      })
    } catch (dbErr) {
      console.error("Supabase insert payment error:", dbErr)
    }

    return new Response(
      JSON.stringify({
        id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
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
