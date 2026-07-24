export const DRAFT_KEY = 'countit-draft-v1'

// Returns the raw draft object (whatever session it belongs to), or null.
// Callers that care about a SPECIFIC workout should check d.target
// themselves (either 'new' or a workout id).
export function peekDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    return d && Array.isArray(d.exercises) ? d : null
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch { /* best effort */ }
}
