import { Icon } from './Icon'

/** Attribution tag shown on foods imported from Open Food Facts. */
export function SourceTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
      <Icon name="public" className="text-[14px]" />
      Open Food Facts
    </span>
  )
}
