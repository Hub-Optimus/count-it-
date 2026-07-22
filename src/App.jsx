import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, configured } from './lib/supabase'
import { fetchWorkouts } from './lib/db'
import TabBar, { Tally } from './components/TabBar'
import Auth from './components/Auth'
import WorkoutList from './components/WorkoutList'
import WorkoutEditor from './components/WorkoutEditor'
import Progress from './components/Progress'
import Settings from './components/Settings'

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

  const load = useCallback(async () => {
    setLoadError('')
    try {
      setWorkouts(await fetchWorkouts())
    } catch (e) {
      setLoadError(e.message || 'Could not load your workouts.')
      setWorkouts([])
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">
          <Tally size={26} />
          <span className="brand-name">Count It</span>
        </span>
        <span className="brand-sub">{user.email}</span>
      </header>

      {tab === 'log' && (
        workouts === null ? (
          <div className="empty"><p>Loading your sessions…</p></div>
        ) : (
          <>
            {loadError && <p className="error">{loadError}</p>}
            <WorkoutList workouts={workouts} onOpen={(w) => setEditor({ workout: w })} />
            <button className="fab" onClick={() => setEditor({ workout: null })} aria-label="New workout">+</button>
          </>
        )
      )}

      {tab === 'progress' && <Progress workouts={workouts ?? []} />}

      {tab === 'settings' && (
        <Settings
          user={user}
          workouts={workouts ?? []}
          defaultUnit={defaultUnit}
          onUnitChange={changeUnit}
        />
      )}

      <TabBar tab={tab} onChange={setTab} />
    </div>
  )
}
