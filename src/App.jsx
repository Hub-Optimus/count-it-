import { useCallback, useEffect, useMemo, useState, Suspense, lazy } from 'react'
import { supabase, configured } from './lib/supabase'
import { fetchWorkouts, fetchProfile, mergeWorkouts, fetchTemplates, fetchBodyMetrics } from './lib/db'
import { todayISO } from './lib/format'
import { peekDraft } from './lib/draft'
import TabBar, { Tally } from './components/TabBar'
import Auth from './components/Auth'
import WorkoutList from './components/WorkoutList'
import WorkoutEditor from './components/WorkoutEditor'
import SidePanel from './components/SidePanel'
import Onboarding from './components/Onboarding'

// Lazy: these are only needed once someone actually navigates away from
// the primary logging tab - no reason to make everyone download them on
// first load just to log a set. WorkoutEditor/WorkoutList/SidePanel/
// Onboarding stay eager since they're what a visit needs immediately
// (Onboarding only for brand-new or not-yet-onboarded users, but it's
// small and sits on the critical path right after signup).
const Progress = lazy(() => import('./components/Progress'))
const Trends = lazy(() => import('./components/Trends'))
const GoalProgress = lazy(() => import('./components/GoalProgress'))
const Settings = lazy(() => import('./components/Settings'))

const UNIT_KEY = 'countit-unit'

// Reads which JS bundle THIS loaded page is actually running, straight
// from the DOM - no separate version file to remember to update on
// every deploy, since Vite already stamps a fresh content hash into
// this filename on every single build automatically.
function currentBundleSrc() {
  return document.querySelector('script[src*="/assets/index-"]')?.src ?? null
}

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

export function Main({ user }) {
  const [tab, setTab] = useState('log')
  const [workouts, setWorkouts] = useState(null) // null = loading
  const [loadError, setLoadError] = useState('')
  const [editor, setEditor] = useState(null) // null | { workout: null } | { workout }
  const [defaultUnit, setDefaultUnit] = useState(() => localStorage.getItem(UNIT_KEY) || 'kg')
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = needs onboarding

  // Lets him and any other user know, right in the app, when they're
  // running an older build than what's actually live - no more silent
  // "why does this work for you and not me" mismatches. Checks every
  // 5 minutes and immediately whenever the tab regains focus (catches
  // the common case of leaving a tab open for hours), comparing the
  // currently-loaded bundle against whatever the server is serving
  // right now. Never auto-reloads on its own - a mid-set page refresh
  // he didn't ask for would be its own kind of data-loss risk.
  const [newVersionAvailable, setNewVersionAvailable] = useState(false)
  useEffect(() => {
    const mine = currentBundleSrc()
    if (!mine) return // dev server or unexpected markup - nothing reliable to compare
    async function check() {
      try {
        const res = await fetch('/', { cache: 'no-store' })
        const html = await res.text()
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/)
        if (match && !mine.endsWith(match[1])) setNewVersionAvailable(true)
      } catch { /* offline or a network hiccup - just try again next interval */ }
    }
    check()
    const interval = setInterval(check, 5 * 60 * 1000)
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

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

  const [templates, setTemplates] = useState([])
  const reloadTemplates = useCallback(() => {
    withJwtRetry(() => fetchTemplates(user.id)).then(setTemplates).catch(() => {})
  }, [user.id])
  useEffect(() => { reloadTemplates() }, [reloadTemplates])
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  // Most recent logged bodyweight - lets the weight field offer a
  // one-tap "use my bodyweight" fill for bodyweight-loaded exercises
  // (pull-ups etc.), instead of having to remember and retype it.
  const [latestBodyweight, setLatestBodyweight] = useState(null)
  useEffect(() => {
    withJwtRetry(() => fetchBodyMetrics(user.id))
      .then((rows) => setLatestBodyweight(rows[0] ? { weight: rows[0].weight, unit: rows[0].weight_unit } : null))
      .catch(() => {})
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

  const [draftBanner, setDraftBanner] = useState(null)
  useEffect(() => {
    if (tab === 'log' && !editor) setDraftBanner(peekDraft())
  }, [tab, editor])

  const duplicateDatePairs = useMemo(() => {
    if (!workouts) return []
    const byDate = new Map()
    for (const w of workouts) {
      if (!byDate.has(w.date)) byDate.set(w.date, [])
      byDate.get(w.date).push(w)
    }
    const pairs = []
    for (const group of byDate.values()) {
      if (group.length > 1) pairs.push(group) // rare to have 3+, but handle generically
    }
    return pairs
  }, [workouts])

  const [merging, setMerging] = useState(false)

  async function doMerge(group) {
    const [keep, ...rest] = [...group].sort((a, b) => b.exercises.length - a.exercises.length)
    setMerging(true)
    try {
      for (const other of rest) {
        await mergeWorkouts(user.id, keep, other)
      }
      await load()
    } catch (e) {
      window.alert(e.message || 'Could not merge those sessions.')
    } finally {
      setMerging(false)
    }
  }

  function startNewWorkout() {
    const draft = peekDraft()
    if (draft) {
      const target = draft.target === 'new' ? null : (workouts ?? []).find((w) => w.id === draft.target) || null
      const resumeIt = window.confirm(
        `You have an unfinished session from ${draft.date} (${draft.exercises.length} exercises) that was never finished. ` +
        `Press OK to resume it, or Cancel to start a separate new session.`
      )
      if (resumeIt) {
        setEditor({ workout: target, autoResumeDraft: true })
        return
      }
    }
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
    if (templates.length > 0) {
      setShowTemplatePicker(true)
      return
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

  // profile === null: brand-new user, no row yet. profile with no
  // onboarding_completed_at: an existing user (from before this wizard
  // existed) who has a row but hasn't answered the new questions - both
  // get the same wall, so nobody skips it just because a row exists.
  if (!profile || !profile.onboarding_completed_at) {
    return <Onboarding user={user} initial={profile} defaultUnit={defaultUnit} onDone={setProfile} />
  }

  if (editor) {
    return (
      <WorkoutEditor
        user={user}
        workout={editor.workout}
        workouts={workouts ?? []}
        exerciseNames={exerciseNames}
        defaultUnit={defaultUnit}
        autoResumeDraft={Boolean(editor.autoResumeDraft)}
        initialExercises={editor.initialExercises}
        latestBodyweight={latestBodyweight}
        onClose={() => { setEditor(null); reloadTemplates() }}
        onSaved={() => { setEditor(null); load(); reloadTemplates() }}
      />
    )
  }

  const pageTitle = { log: 'Workouts', progress: 'Progress', settings: 'Settings' }[tab]

  return (
    <div className="app-shell">
      {newVersionAvailable && (
        <div className="version-banner">
          <span>A newer version of Count It is available.</span>
          <button className="btn btn-block version-banner-btn" onClick={() => window.location.reload()}>
            Refresh to update
          </button>
        </div>
      )}
      {showTemplatePicker && (
        <div className="template-picker-overlay" onClick={() => setShowTemplatePicker(false)}>
          <div className="template-picker" onClick={(e) => e.stopPropagation()}>
            <div className="template-picker-header">
              <h2>Start from a template?</h2>
              <button className="btn btn-ghost" onClick={() => setShowTemplatePicker(false)}>Cancel</button>
            </div>
            {templates.map((t) => (
              <button
                key={t.id}
                className="template-picker-row"
                onClick={() => {
                  setShowTemplatePicker(false)
                  setEditor({ workout: null, initialExercises: t.exerciseNames })
                }}
              >
                <span className="template-picker-name">{t.name}</span>
                <span className="template-picker-count">{t.exerciseNames.length} exercises</span>
              </button>
            ))}
            <button
              className="btn btn-block template-picker-blank"
              onClick={() => {
                setShowTemplatePicker(false)
                setEditor({ workout: null })
              }}
            >
              Start blank instead
            </button>
          </div>
        </div>
      )}
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
            {draftBanner && (
              <div className="banner">
                <span>Unfinished session from {draftBanner.date} ({draftBanner.exercises.length} exercises) — never finished.</span>
                <span className="banner-actions">
                  <button className="btn btn-ghost" onClick={() => setDraftBanner(null)}>Dismiss</button>
                  <button className="btn" onClick={() => {
                    const target = draftBanner.target === 'new' ? null : (workouts.find((w) => w.id === draftBanner.target) || null)
                    setEditor({ workout: target, autoResumeDraft: true })
                  }}>Resume</button>
                </span>
              </div>
            )}
            {duplicateDatePairs.map((group) => (
              <div className="banner" key={group[0].date}>
                <span>{group.length} sessions logged on {group[0].date} — probably meant to be one.</span>
                <span className="banner-actions">
                  <button className="btn" disabled={merging} onClick={() => doMerge(group)}>
                    {merging ? 'Merging…' : 'Merge'}
                  </button>
                </span>
              </div>
            ))}
            <WorkoutList workouts={workouts} onOpen={(w) => setEditor({ workout: w })} />
            <button className="fab" onClick={startNewWorkout} aria-label="New workout">+</button>
          </>
        )
      )}

      {tab === 'progress' && (
        <ProgressTab user={user} workouts={workouts ?? []} profile={profile} />
      )}

      {tab === 'settings' && (
        <Suspense fallback={<p className="empty">Loading…</p>}>
          <Settings
            user={user}
            workouts={workouts ?? []}
            defaultUnit={defaultUnit}
            onUnitChange={changeUnit}
            profile={profile}
            onProfileChange={setProfile}
          />
        </Suspense>
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
      <Suspense fallback={<p className="empty">Loading…</p>}>
        {view === 'goals' && <GoalProgress user={user} workouts={workouts} profile={profile} />}
        {view === 'trends' && <Trends workouts={workouts} profile={profile} />}
        {view === 'exercise' && <Progress user={user} workouts={workouts} />}
      </Suspense>
    </div>
  )
}
