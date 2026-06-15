export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  )
}

/** Full-area centered spinner for page/section loading states. */
export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm py-2xl text-on-surface-variant">
      <Spinner className="h-6 w-6 text-primary" />
      <span className="font-label-md text-label-md">{label}</span>
    </div>
  )
}
