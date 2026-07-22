import { useMemo, useState } from 'react'
import { GROUPS, EXERCISES, groupFor } from '../lib/exerciseLibrary'

// Minimal line icons per muscle group — consistent stroke style with the rest of the app.
const groupIcons = {
  Chest: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <rect x="4.5" y="8" width="2.5" height="8" rx="1" />
      <rect x="17" y="8" width="2.5" height="8" rx="1" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
    </svg>
  ),
  Back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M12 3 5 9M12 3l7 6M7 13l-2 8M17 13l2 8" />
    </svg>
  ),
  Shoulders: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 15c1-6 5-9 9-9s8 3 9 9" />
      <circle cx="6" cy="16" r="2" /><circle cx="18" cy="16" r="2" />
    </svg>
  ),
  Legs: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l1 8-2 10h-2l-1-8-1 8H8l-1-10Z" />
    </svg>
  ),
  Biceps: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 18c-1-5 0-9 3-11 3-2 7-1 8 2 1 2 0 4-2 4-1 3-4 5-9 5Z" />
    </svg>
  ),
  Triceps: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5c6 0 10 4 10 9 0 3-2 5-5 5" />
      <path d="M11 14l3 3-3 3" />
    </svg>
  ),
  Core: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="7" y="4" width="4" height="4" rx="0.5" /><rect x="13" y="4" width="4" height="4" rx="0.5" />
      <rect x="7" y="10" width="4" height="4" rx="0.5" /><rect x="13" y="10" width="4" height="4" rx="0.5" />
      <rect x="7" y="16" width="4" height="4" rx="0.5" /><rect x="13" y="16" width="4" height="4" rx="0.5" />
    </svg>
  ),
  Cardio: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 8.5c0 5-8.5 10.5-8.5 10.5S3.5 13.5 3.5 8.5a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20.5 8.5Z" />
    </svg>
  ),
  Other: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
}

export default function ExercisePicker({ recentNames = [], onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All')

  const recent = useMemo(
    () => recentNames.slice(0, 8).map((name) => ({ name, group: groupFor(name) || 'Other' })),
    [recentNames]
  )

  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return null // browsing mode, not searching
    const inLib = EXERCISES.filter((e) => e.name.toLowerCase().includes(q))
    const inRecent = recentNames
      .filter((n) => n.toLowerCase().includes(q) && !inLib.some((e) => e.name === n))
      .map((name) => ({ name, group: groupFor(name) || 'Other' }))
    return [...inRecent, ...inLib]
  }, [q, recentNames])

  const grouped = useMemo(() => {
    const list = group === 'All' ? EXERCISES : EXERCISES.filter((e) => e.group === group)
    const byGroup = new Map()
    for (const e of list) {
      if (!byGroup.has(e.group)) byGroup.set(e.group, [])
      byGroup.get(e.group).push(e)
    }
    return byGroup
  }, [group])

  const exactMatch = q && EXERCISES.some((e) => e.name.toLowerCase() === q)

  function pick(name) {
    onSelect(name)
    onClose()
  }

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="picker-top">
          <input
            className="input"
            autoFocus
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>

        {!q && (
          <div className="chip-row picker-filters">
            <button className={`chip ${group === 'All' ? 'on' : ''}`} onClick={() => setGroup('All')}>All</button>
            {GROUPS.map((g) => (
              <button key={g} className={`chip picker-group-chip ${group === g ? 'on' : ''}`} onClick={() => setGroup(g)}>
                {groupIcons[g]}{g}
              </button>
            ))}
          </div>
        )}

        <div className="picker-list">
          {q ? (
            filtered.length > 0 ? (
              filtered.map((e) => (
                <button key={e.name} className="picker-row" onClick={() => pick(e.name)}>
                  <span className="picker-row-icon">{groupIcons[e.group] || groupIcons.Other}</span>
                  {e.name}
                </button>
              ))
            ) : (
              <p className="small" style={{ padding: '12px 4px' }}>No matches in the library.</p>
            )
          ) : (
            <>
              {group === 'All' && recent.length > 0 && (
                <div className="picker-section">
                  <div className="picker-section-title">Recently used</div>
                  {recent.map((e) => (
                    <button key={e.name} className="picker-row" onClick={() => pick(e.name)}>
                      <span className="picker-row-icon">{groupIcons[e.group] || groupIcons.Other}</span>
                      {e.name}
                    </button>
                  ))}
                </div>
              )}
              {[...grouped.entries()].map(([g, list]) => (
                <div className="picker-section" key={g}>
                  <div className="picker-section-title">{g}</div>
                  {list.map((e) => (
                    <button key={e.name} className="picker-row" onClick={() => pick(e.name)}>
                      <span className="picker-row-icon">{groupIcons[g]}</span>
                      {e.name}
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {q && !exactMatch && (
          <div className="picker-custom">
            <button className="btn btn-primary btn-block" onClick={() => pick(query.trim())}>
              Use "{query.trim()}" as custom exercise
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
