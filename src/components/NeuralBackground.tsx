import { useEffect, useRef } from 'react'

interface NeuralBackgroundProps {
  className?: string
}

// Cores da logo Synapt
const COLORS = {
  teal: { r: 43, g: 139, b: 148 },
  tealLight: { r: 61, g: 165, b: 174 },
  violet: { r: 123, g: 94, b: 167 },
  violetLight: { r: 155, g: 123, b: 199 },
  glow: { r: 200, g: 230, b: 255 },
}

interface Neuron {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  phase: number
  // Axônios que saem deste neurônio
  axons: Axon[]
}

interface Axon {
  // Pontos de controle da curva (relativo ao neurônio)
  segments: { angle: number; length: number; curve: number }[]
  thickness: number
  branchCount: number
}

interface Spark {
  fromNeuron: number
  toNeuron: number
  progress: number
  speed: number
  size: number
  active: boolean
}

const NEURON_COUNT = 8
const SPARK_COUNT = 20

function createAxon(): Axon {
  const segCount = 2 + Math.floor(Math.random() * 3)
  const segments = []
  let angle = Math.random() * Math.PI * 2
  for (let i = 0; i < segCount; i++) {
    angle += (Math.random() - 0.5) * 0.8
    segments.push({
      angle,
      length: 40 + Math.random() * 80,
      curve: (Math.random() - 0.5) * 60,
    })
  }
  return {
    segments,
    thickness: 0.5 + Math.random() * 1.2,
    branchCount: 2 + Math.floor(Math.random() * 3),
  }
}

function createNeuron(): Neuron {
  const axonCount = 3 + Math.floor(Math.random() * 4)
  return {
    x: 0.08 + Math.random() * 0.84,
    y: 0.08 + Math.random() * 0.84,
    vx: (Math.random() - 0.5) * 0.00006,
    vy: (Math.random() - 0.5) * 0.00006,
    size: 6 + Math.random() * 8,
    phase: Math.random() * Math.PI * 2,
    axons: Array.from({ length: axonCount }, createAxon),
  }
}

export function NeuralBackground({ className = '' }: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let raf = 0

    const neurons: Neuron[] = Array.from({ length: NEURON_COUNT }, createNeuron)
    const sparks: Spark[] = Array.from({ length: SPARK_COUNT }, () => ({
      fromNeuron: Math.floor(Math.random() * NEURON_COUNT),
      toNeuron: Math.floor(Math.random() * NEURON_COUNT),
      progress: Math.random(),
      speed: 0.003 + Math.random() * 0.006,
      size: 1.5 + Math.random() * 2,
      active: Math.random() > 0.3,
    }))

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      width = rect?.width ?? window.innerWidth
      height = rect?.height ?? window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Desenha o corpo celular (soma) com glow realista
    function drawSoma(x: number, y: number, size: number, pulse: number) {
      if (!ctx) return

      // Glow externo amplo
      const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 4)
      outerGlow.addColorStop(0, `rgba(${COLORS.tealLight.r}, ${COLORS.tealLight.g}, ${COLORS.tealLight.b}, ${0.08 * pulse})`)
      outerGlow.addColorStop(0.4, `rgba(${COLORS.violet.r}, ${COLORS.violet.g}, ${COLORS.violet.b}, ${0.04 * pulse})`)
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = outerGlow
      ctx.beginPath()
      ctx.arc(x, y, size * 4, 0, Math.PI * 2)
      ctx.fill()

      // Corpo celular - membrana
      const bodyGrad = ctx.createRadialGradient(x, y, 0, x, y, size)
      bodyGrad.addColorStop(0, `rgba(${COLORS.glow.r}, ${COLORS.glow.g}, ${COLORS.glow.b}, ${0.6 * pulse})`)
      bodyGrad.addColorStop(0.3, `rgba(${COLORS.tealLight.r}, ${COLORS.tealLight.g}, ${COLORS.tealLight.b}, ${0.4 * pulse})`)
      bodyGrad.addColorStop(0.7, `rgba(${COLORS.teal.r}, ${COLORS.teal.g}, ${COLORS.teal.b}, ${0.2 * pulse})`)
      bodyGrad.addColorStop(1, `rgba(${COLORS.violet.r}, ${COLORS.violet.g}, ${COLORS.violet.b}, ${0.05 * pulse})`)
      ctx.fillStyle = bodyGrad
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()

      // Ponto central brilhante (nucléolo)
      const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.35)
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.7 * pulse})`)
      coreGrad.addColorStop(0.5, `rgba(${COLORS.glow.r}, ${COLORS.glow.g}, ${COLORS.glow.b}, ${0.4 * pulse})`)
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(x, y, size * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }

    // Desenha axônios com ramificações orgânicas
    function drawAxons(nx: number, ny: number, neuron: Neuron, pulse: number) {
      if (!ctx) return

      neuron.axons.forEach((axon) => {
        let curX = nx
        let curY = ny

        // Desenha segmentos do axônio principal
        const pathPoints: { x: number; y: number }[] = [{ x: curX, y: curY }]

        axon.segments.forEach((seg) => {
          const endX = curX + Math.cos(seg.angle) * seg.length
          const endY = curY + Math.sin(seg.angle) * seg.length
          const ctrlX = (curX + endX) / 2 + Math.cos(seg.angle + Math.PI / 2) * seg.curve
          const ctrlY = (curY + endY) / 2 + Math.sin(seg.angle + Math.PI / 2) * seg.curve

          // Axônio principal com gradiente
          const alpha = 0.15 + pulse * 0.1
          ctx.strokeStyle = `rgba(${COLORS.tealLight.r}, ${COLORS.tealLight.g}, ${COLORS.tealLight.b}, ${alpha})`
          ctx.lineWidth = axon.thickness
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(curX, curY)
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY)
          ctx.stroke()

          // Glow sutil no axônio
          ctx.strokeStyle = `rgba(${COLORS.tealLight.r}, ${COLORS.tealLight.g}, ${COLORS.tealLight.b}, ${alpha * 0.3})`
          ctx.lineWidth = axon.thickness + 2
          ctx.beginPath()
          ctx.moveTo(curX, curY)
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY)
          ctx.stroke()

          pathPoints.push({ x: endX, y: endY })
          curX = endX
          curY = endY
        })

        // Ramificações (dendritos) no final do axônio
        for (let b = 0; b < axon.branchCount; b++) {
          const branchAngle = axon.segments[axon.segments.length - 1].angle + (Math.random() - 0.5) * 2
          const branchLen = 15 + Math.random() * 35
          const bEndX = curX + Math.cos(branchAngle) * branchLen
          const bEndY = curY + Math.sin(branchAngle) * branchLen
          const bCtrlX = curX + Math.cos(branchAngle + 0.3) * branchLen * 0.6
          const bCtrlY = curY + Math.sin(branchAngle - 0.2) * branchLen * 0.6

          const bAlpha = 0.1 + pulse * 0.06
          ctx.strokeStyle = `rgba(${COLORS.violet.r}, ${COLORS.violet.g}, ${COLORS.violet.b}, ${bAlpha})`
          ctx.lineWidth = axon.thickness * 0.4
          ctx.beginPath()
          ctx.moveTo(curX, curY)
          ctx.quadraticCurveTo(bCtrlX, bCtrlY, bEndX, bEndY)
          ctx.stroke()

          // Sub-ramificações finas
          for (let s = 0; s < 2; s++) {
            const subAngle = branchAngle + (Math.random() - 0.5) * 1.5
            const subLen = 8 + Math.random() * 18
            const midT = 0.4 + Math.random() * 0.4
            const startX = curX + (bEndX - curX) * midT
            const startY = curY + (bEndY - curY) * midT
            const sEndX = startX + Math.cos(subAngle) * subLen
            const sEndY = startY + Math.sin(subAngle) * subLen

            ctx.strokeStyle = `rgba(${COLORS.violetLight.r}, ${COLORS.violetLight.g}, ${COLORS.violetLight.b}, ${bAlpha * 0.5})`
            ctx.lineWidth = 0.3
            ctx.beginPath()
            ctx.moveTo(startX, startY)
            ctx.lineTo(sEndX, sEndY)
            ctx.stroke()

            // Ponto sináptico na ponta
            ctx.fillStyle = `rgba(${COLORS.violetLight.r}, ${COLORS.violetLight.g}, ${COLORS.violetLight.b}, ${bAlpha * 0.8})`
            ctx.beginPath()
            ctx.arc(sEndX, sEndY, 0.8, 0, Math.PI * 2)
            ctx.fill()
          }

          // Terminal sináptico (bouton) com glow
          const boutonGrad = ctx.createRadialGradient(bEndX, bEndY, 0, bEndX, bEndY, 3)
          boutonGrad.addColorStop(0, `rgba(${COLORS.glow.r}, ${COLORS.glow.g}, ${COLORS.glow.b}, ${0.4 * pulse})`)
          boutonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = boutonGrad
          ctx.beginPath()
          ctx.arc(bEndX, bEndY, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    }

    // Desenha conexões entre neurônios próximos (como na imagem)
    function drawConnection(x1: number, y1: number, x2: number, y2: number, strength: number, time: number) {
      if (!ctx) return
      if (strength < 0.01) return

      const midX = (x1 + x2) / 2
      const midY = (y1 + y2) / 2
      // Curva orgânica com ondulação temporal
      const perpX = -(y2 - y1) * 0.15
      const perpY = (x2 - x1) * 0.15
      const ctrlX = midX + perpX * Math.sin(time * 0.5)
      const ctrlY = midY + perpY * Math.sin(time * 0.5)

      // Conexão principal
      const alpha = strength * 0.12
      ctx.strokeStyle = `rgba(${COLORS.tealLight.r}, ${COLORS.tealLight.g}, ${COLORS.tealLight.b}, ${alpha})`
      ctx.lineWidth = 0.6 + strength * 0.4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2)
      ctx.stroke()

      // Glow da conexão
      ctx.strokeStyle = `rgba(${COLORS.teal.r}, ${COLORS.teal.g}, ${COLORS.teal.b}, ${alpha * 0.3})`
      ctx.lineWidth = 2 + strength * 2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2)
      ctx.stroke()
    }

    // Sparks (impulsos elétricos viajando entre neurônios)
    function drawSpark(spark: Spark, time: number) {
      if (!ctx || !spark.active) return

      const from = neurons[spark.fromNeuron]
      const to = neurons[spark.toNeuron]
      const fx = from.x * width
      const fy = from.y * height
      const tx = to.x * width
      const ty = to.y * height

      const t = spark.progress
      // Curva suave entre os dois neurônios
      const midX = (fx + tx) / 2 + Math.sin(time + spark.fromNeuron) * 30
      const midY = (fy + ty) / 2 + Math.cos(time + spark.toNeuron) * 30

      const x = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * midX + t * t * tx
      const y = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * midY + t * t * ty

      // Intensidade varia durante o trajeto
      const intensity = Math.sin(t * Math.PI)

      // Glow do spark
      const sparkGrad = ctx.createRadialGradient(x, y, 0, x, y, spark.size * 4)
      sparkGrad.addColorStop(0, `rgba(255, 255, 255, ${0.6 * intensity})`)
      sparkGrad.addColorStop(0.3, `rgba(${COLORS.glow.r}, ${COLORS.glow.g}, ${COLORS.glow.b}, ${0.3 * intensity})`)
      sparkGrad.addColorStop(0.6, `rgba(${COLORS.violetLight.r}, ${COLORS.violetLight.g}, ${COLORS.violetLight.b}, ${0.1 * intensity})`)
      sparkGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = sparkGrad
      ctx.beginPath()
      ctx.arc(x, y, spark.size * 4, 0, Math.PI * 2)
      ctx.fill()

      // Núcleo brilhante
      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * intensity})`
      ctx.beginPath()
      ctx.arc(x, y, spark.size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Partículas flutuantes de fundo (como na imagem)
    const bgParticles = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 1.5,
      speed: 0.0001 + Math.random() * 0.0003,
      phase: Math.random() * Math.PI * 2,
    }))

    function drawBgParticles(time: number) {
      if (!ctx) return
      bgParticles.forEach((p) => {
        p.y -= p.speed
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random() }

        const px = p.x * width
        const py = p.y * height
        const twinkle = 0.3 + Math.sin(time * 2 + p.phase) * 0.3

        const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3)
        grad.addColorStop(0, `rgba(${COLORS.violetLight.r}, ${COLORS.violetLight.g}, ${COLORS.violetLight.b}, ${twinkle * 0.5})`)
        grad.addColorStop(0.5, `rgba(${COLORS.tealLight.r}, ${COLORS.tealLight.g}, ${COLORS.tealLight.b}, ${twinkle * 0.2})`)
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(px, py, p.size * 3, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const draw = () => {
      const time = performance.now() * 0.001
      ctx.clearRect(0, 0, width, height)

      // Atualizar neurônios
      neurons.forEach((n) => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0.05 || n.x > 0.95) n.vx *= -1
        if (n.y < 0.05 || n.y > 0.95) n.vy *= -1
      })

      // Partículas de fundo
      drawBgParticles(time)

      // Conexões entre neurônios próximos
      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          const dx = (neurons[i].x - neurons[j].x) * width
          const dy = (neurons[i].y - neurons[j].y) * height
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = Math.min(width, height) * 0.45
          if (dist < maxDist) {
            const strength = 1 - dist / maxDist
            drawConnection(
              neurons[i].x * width, neurons[i].y * height,
              neurons[j].x * width, neurons[j].y * height,
              strength, time
            )
          }
        }
      }

      // Axônios de cada neurônio
      neurons.forEach((n) => {
        const pulse = 0.6 + Math.sin(time * 1.2 + n.phase) * 0.4
        drawAxons(n.x * width, n.y * height, n, pulse)
      })

      // Corpos celulares
      neurons.forEach((n) => {
        const pulse = 0.6 + Math.sin(time * 1.2 + n.phase) * 0.4
        drawSoma(n.x * width, n.y * height, n.size, pulse)
      })

      // Sparks (impulsos nervosos)
      sparks.forEach((s) => {
        if (!s.active) {
          if (Math.random() < 0.005) {
            s.active = true
            s.progress = 0
            s.fromNeuron = Math.floor(Math.random() * NEURON_COUNT)
            s.toNeuron = Math.floor(Math.random() * NEURON_COUNT)
            if (s.fromNeuron === s.toNeuron) s.toNeuron = (s.toNeuron + 1) % NEURON_COUNT
          }
          return
        }

        s.progress += s.speed
        if (s.progress >= 1) {
          s.active = false
          return
        }

        drawSpark(s, time)
      })

      raf = requestAnimationFrame(draw)
    }

    resize()
    const observer = new ResizeObserver(resize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    draw()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true" />
}
