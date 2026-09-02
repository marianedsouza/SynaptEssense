const MP_SDK_URL = 'https://sdk.mercadopago.com/js/v2'

let sdkLoaded = false
let sdkPromise: Promise<void> | null = null

export function getMpPublicKey(): string {
  return (import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string) || ''
}

export function isMpConfigured(): boolean {
  return !!getMpPublicKey()
}

export async function loadMercadoPagoSdk(): Promise<void> {
  if (sdkLoaded) return
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${MP_SDK_URL}"]`)) {
      sdkLoaded = true
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = MP_SDK_URL
    script.async = true
    script.onload = () => {
      sdkLoaded = true
      resolve()
    }
    script.onerror = () => {
      reject(new Error('Falha ao carregar o SDK do Mercado Pago.'))
    }
    document.head.appendChild(script)
  })

  return sdkPromise
}

export function getMercadoPago(): unknown {
  const mp = (window as unknown as Record<string, unknown>).MercadoPago
  return mp || null
}
