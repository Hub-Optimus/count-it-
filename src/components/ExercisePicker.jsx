import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { GROUPS, EXERCISES, groupFor, pictogramFor, GROUP_COLOR } from '../lib/exerciseLibrary'
import { PICTOGRAMS } from '../lib/pictograms'

// Built once, reused across every picker open — 873 items, cheap to keep in memory.
// Tuned for typos and word-order (e.g. "dumble press" finds "Dumbbell Bench Press"):
// tokenize matches per-word regardless of order, threshold allows small typos.
const fuse = new Fuse(EXERCISES, {
  keys: ['name'],
  threshold: 0.32,
  ignoreLocation: true,
  useTokenSearch: true,
  tokenMatch: 'all',
})

const GROUP_ABBR = {
  Chest: 'CH', Back: 'BK', Shoulders: 'SH', Legs: 'LG',
  Biceps: 'BI', Triceps: 'TR', Core: 'CO', Cardio: 'CD', Other: '?',
}

function GroupBadge({ group }) {
  const color = GROUP_COLOR[group] || GROUP_COLOR.Other
  const abbr = GROUP_ABBR[group] || GROUP_ABBR.Other
  return (
    <span className="group-badge" style={{ background: color }} aria-hidden="true">
      {abbr}
    </span>
  )
}

function RowIcon({ name, group }) {
  const cat = pictogramFor(name)
  const Pic = cat && PICTOGRAMS[cat]
  if (Pic) {
    const color = GROUP_COLOR[group] || GROUP_COLOR.Other
    return (
      <span className="picker-row-picto" style={{ background: color + '26' }}>
        <Pic width="26" height="26" />
      </span>
    )
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
    const inLib = fuse.search(query.trim()).map((r) => r.item)
    const inRecent = recentNames
      .filter((n) => n.toLowerCase().includes(q) && !inLib.some((e) => e.name === n))
      .map((name) => ({ name, group: groupFor(name) || 'Other' }))
    return [...inRecent, ...inLib]
  }, [q, query, recentNames])

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
              <>
                {filtered.slice(0, 40).map((e) => (
                  <button key={e.name} className="picker-row" onClick={() => pick(e.name)}>
                    <RowIcon name={e.name} group={e.group} />
                    {e.name}
                  </button>
                ))}
                {filtered.length > 40 && (
                  <p className="small" style={{ padding: '10px 4px' }}>
                    {filtered.length - 40} more match — keep typing to narrow it down.
                  </p>
                )}
              </>
            ) : (
              <p className="small" style={{ padding: '12px 4px' }}>No matches in the library.</p>
            )
          ) : (
            <>
              {recent.length > 0 && (
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
              {group === 'All' ? (
                <p className="small" style={{ padding: '14px 4px' }}>
                  873 exercises available — search above, or pick a muscle group to browse.
                </p>
              ) : (
                [...grouped.entries()].map(([g, list]) => (
                  <div className="picker-section" key={g}>
                    <div className="picker-section-title">{g} ({list.length})</div>
                    {list.map((e) => (
                      <button key={e.name} className="picker-row" onClick={() => pick(e.name)}>
                        <RowIcon name={e.name} group={g} />
                        {e.name}
                      </button>
                    ))}
                  </div>
                ))
              )}
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
