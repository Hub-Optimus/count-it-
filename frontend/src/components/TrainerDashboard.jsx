import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchTrainerClients } from '../lib/db'
import { Tally } from './TabBar'

export default function TrainerDashboard({ user }) {
  const [clients, setClients] = useState(null) // null = loading
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTrainerClients().then(setClients).catch((e) => setError(e.message || 'Could not load your clients.'))
  }, [])

  return (
    <div className="app-shell">
      <div className="app">
        <header className="app-header">
          <span className="brand">
            <Tally size={26} />
            <span className="brand-name">Count It</span>
          </span>
          <span className="brand-sub">{user.email}</span>
          <h1 className="page-title">My Clients</h1>
          <button className="btn header-action" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </header>

        {error && <p className="error">{error}</p>}
        {clients === null && !error && <p className="empty">Loading…</p>}
        {clients && clients.length === 0 && (
          <div className="empty">
            <p>No clients assigned to you yet.</p>
            <p className="small">Your gym owner assigns members to trainers from their dashboard.</p>
          </div>
        )}

        {clients && clients.length > 0 && (
          <div className="card">
            {clients.map((c) => (
              <div key={c.userId} className="quick-log-row">
                <div className="quick-log-info">
                  <div className="quick-log-name">{c.email || 'Member'}</div>
                  <div className="quick-log-target">
                    {c.totalSessions} session{c.totalSessions === 1 ? '' : 's'} logged
                    {c.lastWorkoutDate ? ` · last on ${c.lastWorkoutDate}` : ' · nothing logged yet'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}