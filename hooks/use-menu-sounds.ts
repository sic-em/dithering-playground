"use client"

import { useEffect, useRef } from "react"

interface NoiseBurstConfig {
  freq: number
  q: number
  gain: number
  durationSec: number
  decay: number
}

function playNoiseBurst(ctx: AudioContext, cfg: NoiseBurstConfig) {
  const frameCount = Math.ceil(ctx.sampleRate * cfg.durationSec)
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frameCount; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (frameCount / cfg.decay))
  }

  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.value = cfg.freq * (1 + (Math.random() - 0.5) * 0.1)
  filter.Q.value = cfg.q

  const gain = ctx.createGain()
  gain.gain.value = cfg.gain

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    gain.disconnect()
  }
  source.start()
}

function playTone(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  gain: number
) {
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(
    freqEnd,
    ctx.currentTime + durationSec
  )
  gainNode.gain.setValueAtTime(gain, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + durationSec
  )
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + durationSec)
  osc.onended = () => {
    osc.disconnect()
    gainNode.disconnect()
  }
}

const CLICK_SELECTOR = [
  ".dialkit-select-trigger",
  ".dialkit-folder-header",
  ".dialkit-button",
  ".dialkit-color-swatch",
].join(", ")

export function useMenuSounds() {
  const ctxRef = useRef<AudioContext | null>(null)
  const sliderActiveRef = useRef(false)
  const lastSliderTickRef = useRef(0)

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }

    function getCtx(): AudioContext | null {
      if (!ctxRef.current) {
        if (typeof AudioContext === "undefined") return null
        ctxRef.current = new AudioContext()
      }
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume()
      }
      return ctxRef.current
    }

    function playClick() {
      const ctx = getCtx()
      if (!ctx) return
      playNoiseBurst(ctx, {
        freq: 2600,
        q: 8,
        gain: 0.4,
        durationSec: 0.005,
        decay: 16,
      })
    }

    function playSegmentedClick(label: string) {
      const ctx = getCtx()
      if (!ctx) return
      const lower = label.toLowerCase()
      if (lower === "on") {
        playTone(ctx, 460, 680, 0.07, 0.16)
      } else if (lower === "off") {
        playTone(ctx, 520, 330, 0.07, 0.13)
      } else {
        playNoiseBurst(ctx, {
          freq: 3200,
          q: 9,
          gain: 0.32,
          durationSec: 0.004,
          decay: 18,
        })
      }
    }

    function playSliderTick() {
      const ctx = getCtx()
      if (!ctx) return
      playNoiseBurst(ctx, {
        freq: 5200,
        q: 16,
        gain: 0.1,
        durationSec: 0.002,
        decay: 28,
      })
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element

      const segBtn = target.matches(".dialkit-segmented-button")
        ? (target as HTMLElement)
        : (target.closest(".dialkit-segmented-button") as HTMLElement | null)
      if (segBtn) {
        playSegmentedClick(segBtn.textContent?.trim() ?? "")
        return
      }

      if (
        target.matches(".dialkit-slider-wrapper") ||
        target.closest(".dialkit-slider-wrapper")
      ) {
        sliderActiveRef.current = true
        playSliderTick()
        return
      }

      if (target.matches(CLICK_SELECTOR) || target.closest(CLICK_SELECTOR)) {
        playClick()
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!sliderActiveRef.current) return
      const now = performance.now()
      if (now - lastSliderTickRef.current < 80) return
      lastSliderTickRef.current = now
      playSliderTick()
    }

    function onPointerUp() {
      sliderActiveRef.current = false
    }

    document.addEventListener("pointerdown", onPointerDown, { capture: true })
    document.addEventListener("pointermove", onPointerMove, { capture: true })
    document.addEventListener("pointerup", onPointerUp)

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("pointermove", onPointerMove, true)
      document.removeEventListener("pointerup", onPointerUp)
    }
  }, [])

  useEffect(() => {
    return () => {
      ctxRef.current?.close()
      ctxRef.current = null
    }
  }, [])
}
