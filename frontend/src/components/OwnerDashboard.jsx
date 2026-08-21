import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchGymMembers, assignTrainer, fetchGymAttendance, createMembership, fetchGymMemberships, createGymClass, fetchGymClasses, deleteGymClass, fetchClassRoster } from '../lib/db'
import { Tally } from './TabBar'
import { Main } from '../App'

export default function OwnerDashboard({ user, profile }) {
  const [view, setView] = useState('gym') // 'gym' | 'workouts'
  const [data, setData] = useState(null) // null = loading
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [attendance, setAttendance] = useState(null) // null = loading

  const load = () => fetchGymMembers().then(setData).catch((e) => setError(e.message || 'Could not load your gym.'))
  useEffect(() => { load() }, [])
  useEffect(() => { fetchGymAttendance().then(setAttendance).catch(() => setAttendance(null)) }, [])

  const [memberships, setMemberships] = useState([])
  const loadMemberships = () => fetchGymMemberships().then(setMemberships).catch(() => {})
  useEffect(() => { loadMemberships() }, [])

  const [classes, setClasses] = useState([])
  const loadClasses = () => fetchGymClasses().then(setClasses).catch(() => {})
  useEffect(() => { loadClasses() }, [])
  const [showClassForm, setShowClassForm] = useState(false)

  async function copyCode() {
    if (!data?.gymCode) return
    try {
      await navigator.clipboard.writeText(data.gymCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard permission denied or unavailable - the code is still
      // right there on screen to copy by hand, no need to surface an error
    }
  }

  if (view === 'workouts') {
    return (
      <>
        <div className="app">
          <div className="role-view-back-bar">
            <button className="btn btn-ghost" onClick={() => setView('gym')}>← Back to gym</button>
          </div>
        </div>
        <Main user={user} skipRoleRouting />
      </>
    )
  }

  return (
    <div className="app-shell">
      <div className="app">
        <header className="app-header">
          <span className="brand">
            <Tally size={26} />
            <span className="brand-name">Count It</span>
          </span>
          <span className="brand-sub">{user.email}</span>
          <h1 className="page-title">{profile?.gym_name || 'Your Gym'}</h1>
          <button className="btn header-action" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </header>

        <div className="role-view-switch">
          <button className="chip on">Gym</button>
          <button className="chip" onClick={() => setView('workouts')}>My Workouts</button>
        </div>

        <div className="card">
          <label className="label">Gym code</label>
          <p className="small" style={{ margin: '0 0 10px' }}>
            Share this with your trainers and members - they enter it when they sign up to join your gym.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>{data?.gymCode || '······'}</span>
            <button className="btn btn-ghost" onClick={copyCode} disabled={!data?.gymCode}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="card">
          <label className="label">Today's check-ins {attendance ? `(${attendance.todayCount})` : ''}</label>
          {attendance === null && <p className="small" style={{ margin: '6px 0 0' }}>Loading…</p>}
          {attendance && attendance.today.length === 0 && (
            <p className="small" style={{ margin: '6px 0 0' }}>No one has checked in yet today.</p>
          )}
          {attendance && attendance.today.map((c) => (
            <div key={c.userId} className="quick-log-row">
              <div className="quick-log-info">
                <div className="quick-log-name">{c.email || 'Member'}</div>
                <div className="quick-log-target">{new Date(c.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="error">{error}</p>}
        {data === null && !error && <p className="empty">Loading…</p>}

        {data && (
          <>
            <div className="card">
              <label className="label">Trainers ({data.trainers.length})</label>
              {data.trainers.length === 0 && <p className="small" style={{ margin: '6px 0 0' }}>No trainers have joined with your code yet.</p>}
              {data.trainers.map((t) => (
                <div key={t.userId} className="quick-log-row">
                  <div className="quick-log-info">
                    <div className="quick-log-name">{t.fullName || t.email || 'Trainer'}</div>
                    {t.fullName && t.email && <div className="quick-log-target">{t.email}</div>}
                    {t.contact && <div className="quick-log-target">{t.contact}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <label className="label">Members ({data.members.length})</label>
              {data.members.length === 0 && <p className="small" style={{ margin: '6px 0 0' }}>No members have joined with your code yet.</p>}
              {data.members.map((m) => (
                <MemberRow
                  key={m.userId}
                  member={m}
                  trainers={data.trainers}
                  onAssigned={load}
                  membership={memberships.find((mem) => mem.userId === m.userId)}
                  onMembershipSaved={loadMemberships}
                />
              ))}
            </div>
          </>
        )}

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="label" style={{ margin: 0 }}>Upcoming classes</label>
            <button type="button" className="text-link-btn" onClick={() => setShowClassForm((v) => !v)}>
              {showClassForm ? 'Cancel' : '+ Schedule a class'}
            </button>
          </div>
          {showClassForm && (
            <ClassForm
              trainers={data?.trainers || []}
              onDone={() => {
                setShowClassForm(false)
                loadClasses()
              }}
            />
          )}
          {classes.length === 0 && <p className="small" style={{ margin: '6px 0 0' }}>No upcoming classes scheduled.</p>}
          {classes.map((c) => (
            <ClassRow key={c.id} cls={c} onChanged={loadClasses} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MemberRow({ member, trainers, onAssigned, membership, onMembershipSaved }) {
  const [busy, setBusy] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)

  async function handleChange(e) {
    const trainerId = e.target.value || null
    setBusy(true)
    try {
      await assignTrainer(member.userId, trainerId)
      onAssigned()
    } catch (err) {
      window.alert(err.message || 'Could not update that assignment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="quick-log-row">
        <div className="quick-log-info">
          <div className="quick-log-name">{member.fullName || member.email || 'Member'}</div>
          {member.fullName && member.email && <div className="quick-log-target">{member.email}</div>}
          {member.contact && <div className="quick-log-target">{member.contact}</div>}
          {membership && (
            <div className="quick-log-target" style={{ color: membership.active ? 'var(--green)' : 'var(--red)' }}>
              {membership.planMonths}-month plan · {membership.active ? `active until ${membership.endsOn}` : `expired ${membership.endsOn}`}
            </div>
          )}
          <button type="button" className="text-link-btn" style={{ padding: 0, marginTop: 2 }} onClick={() => setShowPlanForm((v) => !v)}>
            {membership ? 'Renew / change plan' : '+ Set membership plan'}
          </button>
        </div>
        <select className="input" style={{ width: 160 }} value={member.assignedTrainerId || ''} onChange={handleChange} disabled={busy}>
          <option value="">No trainer</option>
          {trainers.map((t) => (
            <option key={t.userId} value={t.userId}>{t.fullName || t.email || 'Trainer'}</option>
          ))}
        </select>
      </div>
      {showPlanForm && (
        <MembershipForm
          memberUserId={member.userId}
          onDone={() => {
            setShowPlanForm(false)
            onMembershipSaved()
          }}
        />
      )}
    </div>
  )
}

function MembershipForm({ memberUserId, onDone }) {
  const [planMonths, setPlanMonths] = useState(1)
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const numericPrice = parseFloat(price)
    if (!numericPrice || numericPrice <= 0) {
      setError('Enter a valid price.')
      return
    }
    setBusy(true)
    try {
      await createMembership({ memberUserId, planMonths, price: numericPrice, paymentMethod: 'cash' })
      onDone()
    } catch (e) {
      setError(e.message || 'Could not save that. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ margin: '0 0 10px' }}>
      <div className="field">
        <label className="label" htmlFor="plan-months">Plan length</label>
        <select id="plan-months" className="input" value={planMonths} onChange={(e) => setPlanMonths(Number(e.target.value))}>
          <option value={1}>1 month</option>
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>1 year</option>
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="plan-price">Price (₹)</label>
        <input
          id="plan-price"
          className="input"
          inputMode="decimal"
          placeholder="e.g. 3000"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <p className="small" style={{ margin: '0 0 10px' }}>Payment method: Cash (UPI/card coming soon)</p>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
        {busy ? 'Saving…' : 'Mark as paid (cash) & activate'}
      </button>
    </div>
  )
}

function ClassForm({ trainers, onDone }) {
  const [name, setName] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [capacity, setCapacity] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!name.trim() || !date || !time) {
      setError('Fill in the class name, date, and time.')
      return
    }
    const startsAt = new Date(`${date}T${time}`)
    if (Number.isNaN(startsAt.getTime())) {
      setError('That date/time looks invalid.')
      return
    }
    setBusy(true)
    try {
      await createGymClass({
        name: name.trim(),
        trainerId: trainerId || null,
        startsAt: startsAt.toISOString(),
        durationMinutes: Number(duration),
        capacity: Number(capacity),
      })
      onDone()
    } catch (e) {
      setError(e.message || 'Could not schedule that class. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ margin: '10px 0' }}>
      <div className="field">
        <label className="label" htmlFor="class-name">Class name</label>
        <input id="class-name" className="input" placeholder="e.g. Yoga" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {trainers.length > 0 && (
        <div className="field">
          <label className="label" htmlFor="class-trainer">Trainer (optional)</label>
          <select id="class-trainer" className="input" value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
            <option value="">No trainer assigned</option>
            {trainers.map((t) => (
              <option key={t.userId} value={t.userId}>{t.fullName || t.email || 'Trainer'}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label className="label" htmlFor="class-date">Date</label>
        <input id="class-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="class-time">Time</label>
        <input id="class-time" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="class-duration">Duration (minutes)</label>
        <input id="class-duration" className="input" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="class-capacity">Capacity (max members)</label>
        <input id="class-capacity" className="input" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
        {busy ? 'Scheduling…' : 'Schedule class'}
      </button>
    </div>
  )
}

function ClassRow({ cls, onChanged }) {
  const [showRoster, setShowRoster] = useState(false)
  const [roster, setRoster] = useState(null)
  const [busy, setBusy] = useState(false)

  function toggleRoster() {
    if (showRoster) {
      setShowRoster(false)
      return
    }
    setShowRoster(true)
    if (roster === null) {
      fetchClassRoster(cls.id).then(setRoster).catch(() => setRoster([]))
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Cancel "${cls.name}"? Members who booked will lose their spot.`)) return
    setBusy(true)
    try {
      await deleteGymClass(cls.id)
      onChanged()
    } catch (e) {
      window.alert(e.message || 'Could not cancel that class.')
      setBusy(false)
    }
  }

  const when = new Date(cls.startsAt)

  return (
    <div className="quick-log-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div className="quick-log-info">
          <div className="quick-log-name">{cls.name}</div>
          <div className="quick-log-target">
            {when.toLocaleDateString()} · {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {cls.durationMinutes} min
          </div>
          <div className="quick-log-target">
            {cls.bookedCount}/{cls.capacity} booked{cls.trainerEmail ? ` · ${cls.trainerEmail}` : ''}
          </div>
          <button type="button" className="text-link-btn" style={{ padding: 0, marginTop: 2 }} onClick={toggleRoster}>
            {showRoster ? 'Hide roster' : 'View roster'}
          </button>
        </div>
        <button type="button" className="btn btn-ghost" onClick={handleDelete} disabled={busy}>Cancel</button>
      </div>
      {showRoster && (
        <div style={{ marginTop: 8, paddingLeft: 4 }}>
          {roster === null && <p className="small">Loading…</p>}
          {roster && roster.length === 0 && <p className="small">No one has booked yet.</p>}
          {roster && roster.map((r) => (
            <p key={r.userId} className="small" style={{ margin: '2px 0' }}>{r.email || 'Member'}</p>
          ))}
        </div>
      )}
    </div>
  )
}