/** Local-date helpers working in YYYY-MM-DD (no timezone surprises). */

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Parse a YYYY-MM-DD string into a local Date (midnight local). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, delta: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + delta)
  return toISODate(d)
}

/** JS day-of-week (0 = Sunday) for a YYYY-MM-DD string. */
export function dayOfWeek(iso: string): number {
  return fromISODate(iso).getDay()
}

export function isToday(iso: string): boolean {
  return iso === todayISO()
}

/** e.g. "Thursday, October 26" */
export function formatLong(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** e.g. "Oct 26, 2023" */
export function formatShort(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
