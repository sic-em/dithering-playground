import { clamp } from "@/lib/dithering/utils"

export function blur(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number
) {
  if (radius < 1) return
  const tmp = new Uint8ClampedArray(data)

  // horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        count = 0
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.min(w - 1, Math.max(0, x + dx))
        const idx = (y * w + nx) * 4
        r += tmp[idx]
        g += tmp[idx + 1]
        b += tmp[idx + 2]
        count++
      }
      const i = (y * w + x) * 4
      data[i] = r / count
      data[i + 1] = g / count
      data[i + 2] = b / count
    }
  }

  tmp.set(data)

  // vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0,
        g = 0,
        b = 0,
        count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.min(h - 1, Math.max(0, y + dy))
        const idx = (ny * w + x) * 4
        r += tmp[idx]
        g += tmp[idx + 1]
        b += tmp[idx + 2]
        count++
      }
      const i = (y * w + x) * 4
      data[i] = r / count
      data[i + 1] = g / count
      data[i + 2] = b / count
    }
  }
}

export function preprocess(
  data: Uint8ClampedArray,
  brightness: number,
  contrast: number,
  invert: boolean,
  gamma: number
) {
  const cFactor = contrast >= 0 ? 1 + (contrast / 100) * 3 : 1 + contrast / 100
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = data[i + c] + brightness
      v = cFactor * (v - 128) + 128
      if (invert) v = 255 - v
      v = clamp(v)
      if (gamma !== 1) v = Math.pow(v / 255, gamma) * 255
      data[i + c] = clamp(v)
    }
  }
}
