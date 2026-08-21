import { useEffect, useState } from 'react'
import { fetchGymClasses, bookClass, cancelClassBooking } from '../lib/db'

export default function ClassSchedule() {
  const [classes, setClasses] = useState(null) // null = loading
  const [error, setError] = useState('')

  const load = () => fetchGymClasses().then(setClasses).catch((e) => setError(e.message || 'Could not load the class schedule.'))
  useEffect(() => { load() }, [])

  return (
    <div>
      <h1 className="page-title">Classes</h1>
      {error && <p className="error">{error}</p>}
      {classes === null && !error && <p className="empty">Loading…</p>}
      {classes && classes.length === 0 && (
        <div className="empty">
          <p>No upcoming classes scheduled.</p>
          <p className="small">Check back later, or ask your gym owner.</p>
        </div>
      )}
      {classes && classes.length > 0 && (
        <div className="card">
          {classes.map((c) => (
            <ClassEntry key={c.id} cls={c} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClassEntry({ cls, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const when = new Date(cls.startsAt)
  const full = cls.bookedCount >= cls.capacity && !cls.isBooked

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      if (cls.isBooked) {
        await cancelClassBooking(cls.id)
      } else {
        await bookClass(cls.id)
      }
      onChanged()
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="quick-log-row">
      <div className="quick-log-info">
        <div className="quick-log-name">{cls.name}</div>
        <div className="quick-log-target">
          {when.toLocaleDateString()} · {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {cls.durationMinutes} min
        </div>
        <div className="quick-log-target">
          {cls.bookedCount}/{cls.capacity} booked{cls.trainerEmail ? ` · ${cls.trainerEmail}` : ''}
        </div>
        {error && <p className="error" style={{ margin: '4px 0 0' }}>{error}</p>}
      </div>
      <button
        type="button"
        className={`btn ${cls.isBooked ? 'btn-ghost' : 'btn-primary'}`}
        onClick={toggle}
        disabled={busy || full}
      >
        {busy ? '…' : cls.isBooked ? 'Cancel' : full ? 'Full' : 'Book'}
      </button>
    </div>
  )
}