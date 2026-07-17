// Small id helper. Uses crypto.randomUUID when available, falls back otherwise.
export function newId(prefix = 'id'): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}_${uuid}`
}
