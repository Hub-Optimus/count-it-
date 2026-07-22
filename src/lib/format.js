export const KG_PER_LB = 0.45359237

export const toKg = (weight, unit) => (unit === 'lbs' ? weight * KG_PER_LB : weight)

// 17.5 -> "17.5", 20 -> "20", 40.82 -> "40.82"
export const fmtWeight = (w) => (w == null ? '' : String(Number(Number(w).toFixed(2))))

export const fmtVolume = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`)

export const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export const fmtDateLong = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export const todayISO = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
