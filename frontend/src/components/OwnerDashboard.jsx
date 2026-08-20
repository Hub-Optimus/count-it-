import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchGymMembers, assignTrainer, fetchGymAttendance, createMembership, fetchGymMemberships } from '../lib/db'
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
                    <div className="quick-log-name">{t.email || 'Trainer'}</div>
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
          <div className="quick-log-name">{member.email || 'Member'}</div>
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
            <option key={t.userId} value={t.userId}>{t.email || 'Trainer'}</option>
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