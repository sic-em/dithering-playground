import { luma } from "@/lib/dithering/utils"
import type { RGB } from "@/lib/dithering/utils"

export function applyThreshold(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  fg: RGB,
  bg: RGB
) {
  for (let i = 0; i < w * h; i++) {
    const l = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
    const [r, g, b] = l < t ? fg : bg
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
  }
}

export function applyFloydSteinberg(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  fg: RGB,
  bg: RGB,
  serpentine = false,
  strength = 1
) {
  const buf = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    buf[i] = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  }
  for (let y = 0; y < h; y++) {
    const reverse = serpentine && y % 2 === 1
    const x0 = reverse ? w - 1 : 0
    const x1 = reverse ? -1 : w
    const dx = reverse ? -1 : 1
    for (let x = x0; x !== x1; x += dx) {
      const i = y * w + x
      const old = buf[i]
      const nw = old < t ? 0 : 255
      buf[i] = nw
      const e = (old - nw) * strength
      const d = reverse ? -1 : 1
      if (x + d >= 0 && x + d < w) buf[i + d] += (e * 7) / 16
      if (y + 1 < h) {
        if (x - d >= 0 && x - d < w) buf[i + w - d] += (e * 3) / 16
        buf[i + w] += (e * 5) / 16
        if (x + d >= 0 && x + d < w) buf[i + w + d] += e / 16
      }
    }
  }
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = buf[i] < 128 ? fg : bg
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
  }
}

export function applyAtkinson(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  fg: RGB,
  bg: RGB,
  serpentine = false,
  strength = 1
) {
  const buf = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    buf[i] = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  }
  for (let y = 0; y < h; y++) {
    const reverse = serpentine && y % 2 === 1
    const x0 = reverse ? w - 1 : 0
    const x1 = reverse ? -1 : w
    const dx = reverse ? -1 : 1
    for (let x = x0; x !== x1; x += dx) {
      const i = y * w + x
      const old = buf[i]
      const nw = old < t ? 0 : 255
      buf[i] = nw
      const e = ((old - nw) / 8) * strength
      const d = reverse ? -1 : 1
      const spread: [number, number][] = [
        [0, d],
        [0, 2 * d],
        [1, -d],
        [1, 0],
        [1, d],
        [2, 0],
      ]
      for (const [dy, ddx] of spread) {
        const nx = x + ddx
        const ny = y + dy
        if (nx >= 0 && nx < w && ny < h) buf[ny * w + nx] += e
      }
    }
  }
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = buf[i] < 128 ? fg : bg
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
  }
}

export function applyBurkes(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  fg: RGB,
  bg: RGB,
  serpentine = false,
  strength = 1
) {
  const buf = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    buf[i] = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  }
  for (let y = 0; y < h; y++) {
    const reverse = serpentine && y % 2 === 1
    const x0 = reverse ? w - 1 : 0
    const x1 = reverse ? -1 : w
    const dx = reverse ? -1 : 1
    for (let x = x0; x !== x1; x += dx) {
      const i = y * w + x
      const old = buf[i]
      const nw = old < t ? 0 : 255
      buf[i] = nw
      const e = (old - nw) * strength
      const d = reverse ? -1 : 1
      const spread: [number, number, number][] = [
        [0, d, 8],
        [0, 2 * d, 4],
        [1, -2 * d, 2],
        [1, -d, 4],
        [1, 0, 8],
        [1, d, 4],
        [1, 2 * d, 2],
      ]
      for (const [dy, ddx, weight] of spread) {
        const nx = x + ddx,
          ny = y + dy
        if (nx >= 0 && nx < w && ny < h) buf[ny * w + nx] += (e * weight) / 32
      }
    }
  }
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = buf[i] < 128 ? fg : bg
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
  }
}

export function applyBayer(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  matrix: number[][],
  fg: RGB,
  bg: RGB
) {
  const n = matrix.length
  const size = n * n
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const l = luma(data[i], data[i + 1], data[i + 2])
      const T = matrix[y % n][x % n] / size
      const threshold = 255 * (1 - T) + (t - 128)
      const [r, g, b] = l < threshold ? fg : bg
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }
  }
}
