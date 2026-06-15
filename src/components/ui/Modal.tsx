import { useEffect, type ReactNode } from 'react'

/**
 * Overlay container. On desktop it renders as a centered modal; on mobile as a
 * full-screen bottom sheet. The backdrop uses a 20% blur (DESIGN.md overlays).
 */
export function Modal({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/30 backdrop-blur-[4px] sm:items-center sm:p-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-surface-container-lowest shadow-card sm:h-[90vh] sm:max-w-5xl sm:rounded-2xl">
        {children}
      </div>
    </div>
  )
}
