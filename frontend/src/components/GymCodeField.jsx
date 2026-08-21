import { useRef, useState } from 'react'
import { searchGyms } from '../lib/db'

// Search-as-you-type by gym name, so nobody has to remember/copy-paste
// an exact code - picking a suggestion fills in the real code, but
// typing a code directly still works too (same field, same onChange).
export default function GymCodeField({ value, onChange, id = 'gym-code', label = 'Gym name or code' }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)

  function handleChange(e) {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    clearTimeout(timerRef.current)
    if (v.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(() => {
      searchGyms(v)
        .then((matches) => {
          setResults(matches)
          setOpen(matches.length > 0)
        })
        .catch(() => {})
    }, 300)
  }

  function pick(gym) {
    setQuery(gym.gymCode)
    onChange(gym.gymCode)
    setResults([])
    setOpen(false)
  }

  return (
    <div className="field" style={{ position: 'relative' }}>
      <label className="label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        placeholder="Start typing your gym's name…"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && (
        <div className="gym-search-dropdown">
          {results.map((g) => (
            <button type="button" key={g.gymCode} className="gym-search-option" onMouseDown={() => pick(g)}>
              {g.gymName} <span className="small">({g.gymCode})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}