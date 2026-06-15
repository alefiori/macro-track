/** Material Symbols Outlined icon. */
export function Icon({
  name,
  fill = false,
  className = '',
  style,
}: {
  name: string
  fill?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined${fill ? ' icon-fill' : ''} ${className}`}
      style={style}
    >
      {name}
    </span>
  )
}
