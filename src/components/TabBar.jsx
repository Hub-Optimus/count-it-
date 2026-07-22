// The tally mark: four chalk strokes, the fifth in plate-yellow.
export function Tally({ size = 28 }) {
  const h = size
  const w = size * 1.15
  return (
    <span className="tally" aria-hidden="true">
      <svg width={w} height={h} viewBox="0 0 46 40" fill="none">
        {[8, 18, 28, 38].map((x) => (
          <line key={x} className="stroke" x1={x} y1="6" x2={x} y2="34" strokeWidth="4.5" strokeLinecap="round" />
        ))}
        <line className="slash" x1="2" y1="30" x2="44" y2="10" strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

const icons = {
  log: (
    // barbell
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <rect x="4.5" y="7" width="3" height="10" rx="1" />
      <rect x="16.5" y="7" width="3" height="10" rx="1" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
    </svg>
  ),
  progress: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,17 9,11 13,14 21,6" />
      <polyline points="15,6 21,6 21,12" />
    </svg>
  ),
  settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" />
    </svg>
  ),
}

export default function TabBar({ tab, onChange }) {
  const tabs = [
    { id: 'log', label: 'Workouts' },
    { id: 'progress', label: 'Progress' },
    { id: 'settings', label: 'Settings' },
  ]
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
          {icons[t.id]}
          {t.label}
        </button>
      ))}
    </nav>
  )
}
