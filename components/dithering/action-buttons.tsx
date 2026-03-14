"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { IconCheck } from "@tabler/icons-react"

interface ActionButtonsProps {
  onSave: () => void
  onCopy: () => void
}

const transition = {
  duration: 0.15,
  ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
}
const variants = {
  initial: { opacity: 0, scale: 0.7 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.7 },
}

function ActionButtonsContent({ onSave, onCopy }: ActionButtonsProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopy() {
    onCopy()
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button className="dialkit-button" onClick={onSave} style={{ flex: 1 }}>
        Save
      </button>
      <button
        className="dialkit-button"
        onClick={handleCopy}
        style={{ flex: 1 }}
      >
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ opacity: 0, pointerEvents: "none" }} aria-hidden>
            Copy
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                style={{ position: "absolute" }}
              >
                <IconCheck size={13} />
              </motion.span>
            ) : (
              <motion.span
                key="label"
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                style={{ position: "absolute" }}
              >
                Copy
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </button>
    </div>
  )
}

export function ActionButtons({ onSave, onCopy }: ActionButtonsProps) {
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    const sync = () => {
      const el = document.querySelector(".dialkit-folder-inner")
      setTarget(el ?? null)
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (!target) return null
  return createPortal(
    <ActionButtonsContent onSave={onSave} onCopy={onCopy} />,
    target
  )
}
