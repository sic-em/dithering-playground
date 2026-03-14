"use client"

import { useDialKit } from "dialkit"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { ActionButtons } from "@/components/dithering/action-buttons"
import { useInfiniteCanvas } from "@/hooks/use-infinite-canvas"
import { BAYER_MATRICES } from "@/lib/dithering/constants"
import { hexToRgb } from "@/lib/dithering/utils"
import { preprocess, blur } from "@/lib/dithering/preprocess"
import {
  applyThreshold,
  applyFloydSteinberg,
  applyAtkinson,
  applyBurkes,
  applyBayer,
} from "@/lib/dithering/algorithms"

export function DitheringPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const fileNameRef = useRef<string>("image")
  const [imageKey, setImageKey] = useState(0)
  const {
    containerRef,
    contentRef,
    cursor,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  } = useInfiniteCanvas(0.75, -80, -80)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const config = useMemo(
    () => ({
      upload: { type: "action", label: "Upload Image" },
      algorithm: {
        type: "select",
        options: [
          "floyd steinberg",
          "atkinson",
          "threshold",
          "bayer 2x2",
          "bayer 4x4",
          "bayer 8x8",
          "burkes",
        ],
        default: "bayer 8x8",
      },
      threshold: [130, 0, 255],
      scale: [2, 1, 8, 1],
      adjustments: {
        brightness: [-50, -100, 100],
        contrast: [10, -100, 100],
        invert: false,
        serpentine: true,
        strength: [100, 0, 200, 1],
        gamma: [10, 1, 30, 1],
        blur: [0, 0, 10, 1],
      },
      colors: {
        fg: { type: "color", default: "#000000" },
        bg: { type: "color", default: "#f5f0e8" },
      },
    }),
    []
  )

  type Params = {
    algorithm: string
    threshold: number
    scale: number
    adjustments: {
      brightness: number
      contrast: number
      invert: boolean
      serpentine: boolean
      strength: number
      gamma: number
      blur: number
    }
    colors: { fg: string; bg: string }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = useDialKit("Controls", config as any, {
    onAction: (action) => {
      if (action === "upload") {
        fileInputRef.current?.click()
      }
    },
  }) as unknown as Params

  useEffect(() => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    const scale = Math.max(1, Math.round(params.scale))
    const w = Math.ceil(img.naturalWidth / scale)
    const h = Math.ceil(img.naturalHeight / scale)
    canvas.width = w
    canvas.height = h
    canvas.style.width = `${img.naturalWidth}px`
    canvas.style.height = `${img.naturalHeight}px`

    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const { data } = imageData

    preprocess(
      data,
      params.adjustments.brightness,
      params.adjustments.contrast,
      params.adjustments.invert,
      params.adjustments.gamma / 10
    )
    blur(data, w, h, params.adjustments.blur)

    const fg = hexToRgb(params.colors.fg)
    const bg = hexToRgb(params.colors.bg)
    const t = params.threshold
    const algo = params.algorithm as string
    const s = params.adjustments.serpentine
    const strength = params.adjustments.strength / 100

    if (algo === "threshold") applyThreshold(data, w, h, t, fg, bg)
    else if (algo === "floyd steinberg")
      applyFloydSteinberg(data, w, h, t, fg, bg, s, strength)
    else if (algo === "atkinson")
      applyAtkinson(data, w, h, t, fg, bg, s, strength)
    else if (algo === "burkes") applyBurkes(data, w, h, t, fg, bg, s, strength)
    else if (algo in BAYER_MATRICES)
      applyBayer(data, w, h, t, BAYER_MATRICES[algo], fg, bg)

    ctx.putImageData(imageData, 0, 0)
  }, [
    imageKey,
    params.algorithm,
    params.threshold,
    params.scale,
    params.adjustments.brightness,
    params.adjustments.contrast,
    params.adjustments.invert,
    params.adjustments.serpentine,
    params.adjustments.strength,
    params.adjustments.gamma,
    params.adjustments.blur,
    params.colors.fg,
    params.colors.bg,
  ])

  const loadImage = useCallback((src: string) => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImageKey((k) => k + 1)
    }
    img.src = src
  }, [])

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return
    const dotIndex = file.name.lastIndexOf(".")
    fileNameRef.current =
      dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      URL.revokeObjectURL(url)
      setImageKey((k) => k + 1)
    }
    img.src = url
  }, [])

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement("a")
    a.download = `${fileNameRef.current}-d.png`
    a.href = canvas.toDataURL()
    a.click()
  }, [])

  const handleCopy = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
    })
  }, [])

  useEffect(() => {
    loadImage("/placeholder.webp")
  }, [loadImage])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      )
      if (!item) return
      const file = item.getAsFile()
      if (file) loadFile(file)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [loadFile])

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden"
      style={{ cursor }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) loadFile(f)
          e.target.value = ""
        }}
      />
      <div
        ref={contentRef}
        className="absolute flex h-full w-full items-center justify-center"
        style={{ transformOrigin: "0 0" }}
      >
        <canvas ref={canvasRef} style={{ imageRendering: "pixelated" }} />
      </div>
      <ActionButtons onSave={handleSave} onCopy={handleCopy} />
    </div>
  )
}
