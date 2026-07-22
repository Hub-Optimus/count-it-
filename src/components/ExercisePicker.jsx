import { useMemo, useState } from 'react'
import { GROUPS, EXERCISES, groupFor, imageFor } from '../lib/exerciseLibrary'

// Small icons didn't read clearly at this size (confirmed: several were
// mistaken for unrelated symbols). Colored letter badges are unambiguous
// at any size and match how Strong/Hevy tag exercise categories.
const GROUP_BADGE = {
  Chest: { abbr: 'CH', color: '#e5484d' },
  Back: { abbr: 'BK', color: '#4e86f7' },
  Shoulders: { abbr: 'SH', color: '#f5b93b' },
  Legs: { abbr: 'LG', color: '#57a35f' },
  Biceps: { abbr: 'BI', color: '#c77dff' },
  Triceps: { abbr: 'TR', color: '#4dd0c8' },
  Core: { abbr: 'CO', color: '#ff9f5b' },
  Cardio: { abbr: 'CD', color: '#f06fa8' },
  Other: { abbr: '?', color: '#767b84' },
}

function GroupBadge({ group }) {
  const b = GROUP_BADGE[group] || GROUP_BADGE.Other
  return (
    <span className="group-badge" style={{ background: b.color }} aria-hidden="true">
      {b.abbr}
    </span>
  )
}

function RowIcon({ name, group }) {
  const src = imageFor(name)
  if (src) {
    return <img className="picker-row-thumb" src={src} alt="" width="32" height="32" loading="lazy" />
  }
  return <GroupBadge group={group} />
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
                <GroupBadge group={g} />{g}
              </button>
            ))}
          </div>
        )}

        <div className="picker-list">
          {q ? (
            filtered.length > 0 ? (
              filtered.map((e) => (
                <button key={e.name} className="picker-row" onClick={() => pick(e.name)}>
                  <RowIcon name={e.name} group={e.group} />
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
                      <RowIcon name={e.name} group={e.group} />
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
                      <RowIcon name={e.name} group={g} />
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
