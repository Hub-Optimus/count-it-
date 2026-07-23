import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, configured } from './lib/supabase'
import { fetchWorkouts, fetchProfile } from './lib/db'
import { todayISO } from './lib/format'
import TabBar, { Tally } from './components/TabBar'
import Auth from './components/Auth'
import WorkoutList from './components/WorkoutList'
import WorkoutEditor from './components/WorkoutEditor'
import Progress from './components/Progress'
import Trends from './components/Trends'
import GoalProgress from './components/GoalProgress'
import Settings from './components/Settings'
import Goals from './components/Goals'
import SidePanel from './components/SidePanel'

const UNIT_KEY = 'countit-unit'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still checking

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (!configured) {
    return (
      <div className="auth-wrap">
        <div className="auth-logo">
          <Tally size={40} />
          <div className="auth-title">Count It</div>
        </div>
        <p className="auth-tag">
          Supabase isn't connected yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
          (in .env locally, or in Vercel project settings), then redeploy. The README has the full steps.
        </p>
      </div>
    )
  }

  if (session === undefined) {
    return (
      <div className="splash">
        <Tally size={52} />
      </div>
    )
  }

  if (!session) return <Auth />

  return <Main user={session.user} />
}

function Main({ user }) {
  const [tab, setTab] = useState('log')
  const [workouts, setWorkouts] = useState(null) // null = loading
  const [loadError, setLoadError] = useState('')
  const [editor, setEditor] = useState(null) // null | { workout: null } | { workout }
  const [defaultUnit, setDefaultUnit] = useState(() => localStorage.getItem(UNIT_KEY) || 'kg')
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = needs onboarding

  // Right after a fresh sign-in, the very first request can occasionally
  // race a brand-new token before Supabase's clock-skew correction has
  // settled ("jwt issued in the future") - self-heals on reload, so retry
  // once automatically instead of showing an error the user has to act on.
  async function withJwtRetry(fn) {
    try {
      return await fn()
    } catch (e) {
      const msg = (e.message || '').toLowerCase()
      if (msg.includes('jwt') || msg.includes('issued')) {
        await new Promise((r) => setTimeout(r, 900))
        return await fn()
      }
      throw e
    }
  }

  const load = useCallback(async () => {
    setLoadError('')
    try {
      setWorkouts(await withJwtRetry(fetchWorkouts))
    } catch (e) {
      setLoadError(e.message || 'Could not load your workouts.')
      setWorkouts([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    withJwtRetry(() => fetchProfile(user.id)).then(setProfile).catch(() => setProfile(null))
  }, [user.id])

  const exerciseNames = useMemo(() => {
    if (!workouts) return []
    const freq = new Map()
    for (const w of workouts) {
      for (const ex of w.exercises) {
        freq.set(ex.name, (freq.get(ex.name) || 0) + 1)
      }
    }
    return [...freq.keys()].sort((a, b) => freq.get(b) - freq.get(a) || a.localeCompare(b))
  }, [workouts])

  function changeUnit(u) {
    setDefaultUnit(u)
    localStorage.setItem(UNIT_KEY, u)
  }

  function startNewWorkout() {
    const existing = (workouts ?? []).find((w) => w.date === todayISO())
    if (existing) {
      const label = existing.split || 'session'
      const continueIt = window.confirm(
        `You already logged a ${label} today (${existing.exercises.length} exercises). ` +
        `Press OK to add more to it, or Cancel to start a separate new session for today.`
      )
      if (continueIt) {
        setEditor({ workout: existing })
        return
      }
    }
    setEditor({ workout: null })
  }

  if (profile === undefined) {
    return (
      <div className="splash">
        <Tally size={52} />
      </div>
    )
  }

  if (profile === null) {
    return <Goals user={user} initial={null} mode="onboard" onDone={setProfile} />
  }

  if (editor) {
    return (
      <WorkoutEditor
        user={user}
        workout={editor.workout}
        workouts={workouts ?? []}
        exerciseNames={exerciseNames}
        defaultUnit={defaultUnit}
        onClose={() => setEditor(null)}
        onSaved={() => { setEditor(null); load() }}
      />
    )
  }

  const pageTitle = { log: 'Workouts', progress: 'Progress', settings: 'Settings' }[tab]

  return (
    <div className="app-shell">
      <TabBar tab={tab} onChange={setTab} user={user} sessionCount={workouts?.length} />
      <div className="app">
      <header className="app-header">
        <span className="brand">
          <Tally size={26} />
          <span className="brand-name">Count It</span>
        </span>
        <span className="brand-sub">{user.email}</span>
        <h1 className="page-title">{pageTitle}</h1>
        {tab === 'log' && (
          <button className="btn btn-primary header-action" onClick={startNewWorkout}>
            + New workout
          </button>
        )}
      </header>

      {tab === 'log' && (
        workouts === null ? (
          <div className="empty"><p>Loading your sessions…</p></div>
        ) : (
          <>
            {loadError && <p className="error">{loadError}</p>}
            <WorkoutList workouts={workouts} onOpen={(w) => setEditor({ workout: w })} />
            <button className="fab" onClick={startNewWorkout} aria-label="New workout">+</button>
          </>
        )
      )}

      {tab === 'progress' && (
        <ProgressTab user={user} workouts={workouts ?? []} profile={profile} />
      )}

      {tab === 'settings' && (
        <Settings
          user={user}
          workouts={workouts ?? []}
          defaultUnit={defaultUnit}
          onUnitChange={changeUnit}
          profile={profile}
          onProfileChange={setProfile}
        />
      )}
      </div>
      <SidePanel workouts={workouts ?? []} profile={profile} />
    </div>
  )
}

function ProgressTab({ user, workouts, profile }) {
  const [view, setView] = useState('goals')
  return (
    <div>
      <div className="chip-row">
        <button className={`chip ${view === 'goals' ? 'on' : ''}`} onClick={() => setView('goals')}>Goals</button>
        <button className={`chip ${view === 'trends' ? 'on' : ''}`} onClick={() => setView('trends')}>Trends</button>
        <button className={`chip ${view === 'exercise' ? 'on' : ''}`} onClick={() => setView('exercise')}>Per exercise</button>
      </div>
      {view === 'goals' && <GoalProgress user={user} workouts={workouts} profile={profile} />}
      {view === 'trends' && <Trends workouts={workouts} profile={profile} />}
      {view === 'exercise' && <Progress workouts={workouts} />}
    </div>
  )
}
