import { useEffect } from 'react'

/**
 * Locks background scrolling while `active` is true.
 *
 * Uses the `position: fixed` technique rather than `overflow: hidden` alone,
 * because iOS Safari still rubber-band scrolls (and pans the background behind
 * an overlay) when only `overflow` is set. The scroll position is captured on
 * lock and restored on unlock so the page doesn't jump.
 *
 * Locks are ref-counted at module scope, so several overlays can be open at
 * once (e.g. a confirm dialog above a modal) without one closing prematurely
 * restoring scroll for the others.
 */
let lockCount = 0
let savedScrollY = 0

function applyLock() {
  savedScrollY = window.scrollY
  const { style } = document.body
  style.position = 'fixed'
  style.top = `-${savedScrollY}px`
  style.left = '0'
  style.right = '0'
  style.width = '100%'
  style.overflow = 'hidden'
}

function releaseLock() {
  const { style } = document.body
  style.position = ''
  style.top = ''
  style.left = ''
  style.right = ''
  style.width = ''
  style.overflow = ''
  window.scrollTo(0, savedScrollY)
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (lockCount === 0) applyLock()
    lockCount += 1
    return () => {
      lockCount -= 1
      if (lockCount === 0) releaseLock()
    }
  }, [active])
}
