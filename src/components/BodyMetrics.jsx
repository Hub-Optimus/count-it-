import { useState } from 'react'
import { saveHeight, insertBodyMetric, deleteBodyMetric } from '../lib/db'
import { fmtWeight, fmtDate, todayISO } from '../lib/format'

function cmToFeetInches(cm) {
  const totalIn = cm / 2.54
  const ft = Math.floor(totalIn / 12)
  const inch = Math.round(totalIn % 12)
  return `${ft}'${inch}"`
}

export default function BodyMetrics({ user, height, bodyMetrics, onHeightChange, onMetricsChange }) {
  const [heightInput, setHeightInput] = useState(height ?? '')
  const [savingHeight, setSavingHeight] = useState(false)

  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState('kg')
  const [savingWeight, setSavingWeight] = useState(false)
  const [error, setError] = useState('')

  async function saveHeightValue() {
    const n = parseFloat(heightInput)
    if (!Number.isFinite(n) || n <= 0) return
    setSavingHeight(true)
    try {
      await saveHeight(user.id, n)
      onHeightChange(n)
    } catch (e) {
      setError(e.message || 'Could not save height.')
    } finally {
      setSavingHeight(false)
    }
  }

  async function logWeight() {
    setError('')
    const n = parseFloat(weight)
    if (!Number.isFinite(n) || n <= 0) { setError('Enter a valid weight.'); return }
    setSavingWeight(true)
    try {
      await insertBodyMetric(user.id, { date, weight: n, weightUnit: unit })
      setWeight('')
      onMetricsChange()
    } catch (e) {
      setError(e.message || 'Could not log weight.')
    } finally {
      setSavingWeight(false)
    }
  }

  async function removeEntry(id) {
    try {
      await deleteBodyMetric(id)
      onMetricsChange()
    } catch (e) {
      setError(e.message || 'Could not remove that entry.')
    }
  }

  const latest = bodyMetrics[0]

  return (
    <>
      <label className="label">Height</label>
      <div className="set-row" style={{ gridTemplateColumns: '1fr 90px', marginBottom: 4 }}>
        <input
          className="input"
          type="text"
          inputMode="decimal"
          placeholder="cm"
          value={heightInput}
          onChange={(e) => setHeightInput(e.target.value)}
          onBlur={saveHeightValue}
        />
        <span className="small" style={{ display: 'flex', alignItems: 'center' }}>
          {heightInput && Number.isFinite(parseFloat(heightInput)) ? cmToFeetInches(parseFloat(heightInput)) : ''}
        </span>
      </div>
      {savingHeight && <p className="small">Saving…</p>}

      <hr className="hr" />

      <label className="label">Body weight</label>
      {latest && (
        <p className="small" style={{ margin: '0 0 10px' }}>
          Last logged: <strong style={{ color: 'var(--ink)' }}>{fmtWeight(latest.weight)} {latest.weight_unit}</strong> on {fmtDate(latest.date)}
        </p>
      )}

      <div className="set-row" style={{ gridTemplateColumns: '90px 1fr 60px 70px', marginBottom: 8 }}>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          className="input"
          type="text"
          inputMode="decimal"
          placeholder="weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <button className="mini-btn" onClick={() => setUnit(unit === 'kg' ? 'lbs' : 'kg')}>{unit === 'kg' ? 'kg' : 'lb'}</button>
        <button className="btn btn-primary" onClick={logWeight} disabled={savingWeight}>
          {savingWeight ? '…' : 'Log'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {bodyMetrics.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {bodyMetrics.slice(0, 5).map((m) => (
            <div className="session-row" key={m.id}>
              <span className="session-date">{fmtDate(m.date)}</span>
              <span className="session-best">{fmtWeight(m.weight)} {m.weight_unit}</span>
              <button className="remove-set" onClick={() => removeEntry(m.id)} aria-label="Remove entry">✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
