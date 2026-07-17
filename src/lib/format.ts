// Formatting helpers for money + dates.

export function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-KE')}`
}

export function formatKESShort(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000
    return `KES ${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  return `KES ${Math.round(amount)}`
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + 'T00:00:00')
  const b = new Date(isoB + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function daysSince(iso: string): number {
  return daysBetween(iso, todayISO())
}

export function relativeDay(iso: string): string {
  const d = daysSince(iso)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 14) return 'Last week'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
  })
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7) // yyyy-mm
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
  })
}
