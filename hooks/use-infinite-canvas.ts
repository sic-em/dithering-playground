"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react"

const MIN_SCALE = 0.05
const MAX_SCALE = 16

export function useInfiniteCanvas(
  initialScale = 1,
  initialOffsetX = 0,
  initialOffsetY = 0
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const transform = useRef({ x: 0, y: 0, scale: initialScale })
  const spaceHeld = useRef(false)
  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const [cursor, setCursor] = useState("default")

  const applyTransform = useCallback(() => {
    if (!contentRef.current) return
    const { x, y, scale } = transform.current
    contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  }, [])

  useLayoutEffect(() => {
    if (initialScale === 1) return
    const container = containerRef.current
    if (!container) return
    const { width, height } = container.getBoundingClientRect()
    transform.current = {
      x: (width * (1 - initialScale)) / 2 + initialOffsetX,
      y: (height * (1 - initialScale)) / 2 + initialOffsetY,
      scale: initialScale,
    }
    applyTransform()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // wheel zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { x, y, scale } = transform.current
      const rect = container.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY / 500)
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor))
      const ratio = newScale / scale
      transform.current = {
        x: cx - ratio * (cx - x),
        y: cy - ratio * (cy - y),
        scale: newScale,
      }
      applyTransform()
    }

    container.addEventListener("wheel", onWheel, { passive: false })
    return () => container.removeEventListener("wheel", onWheel)
  }, [applyTransform])

  // space key for panning
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault()
        spaceHeld.current = true
        setCursor("grab")
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false
        isPanning.current = false
        setCursor("default")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (spaceHeld.current && e.button === 0) {
      isPanning.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
      setCursor("grabbing")
    }
  }, [])

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      transform.current.x += dx
      transform.current.y += dy
      applyTransform()
    },
    [applyTransform]
  )

  const onMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false
      setCursor(spaceHeld.current ? "grab" : "default")
    }
  }, [])

  return {
    containerRef,
    contentRef,
    cursor,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  }
}
