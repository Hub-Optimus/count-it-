import { useEffect, useMemo, useState } from 'react'
import { currentStreakWeeks, recentPRs, goalStatus } from '../lib/goalAnalytics'
import { fetchBodyMetrics } from '../lib/db'
import { fmtWeight, fmtVolume, fmtDate } from '../lib/format'
import { Tally } from './TabBar'

// Arrow glyph shows the factual direction of change; color reflects
// whether that direction is good news for THIS goal (onTrack), since
// weight going down is good for "Lose weight" but bad for "Gain weight".
function TrendArrow({ change, good }) {
  if (change == null) return <span className="small">new</span>
  const up = change >= 0
  const rounded = Math.abs(change) < 0.5 ? 0 : Math.round(Math.abs(change))
  const colorClass = good == null ? (up ? 'trend-up' : 'trend-down') : (good ? 'trend-up' : 'trend-down')
  return (
    <span className={`trend-arrow ${colorClass}`}>
      {up ? '↑' : '↓'} {rounded}%
    </span>
  )
}

function metricValue(g) {
  if (g.metric === 'Estimated 1RM') return `${fmtWeight(g.current)} kg`
  if (g.metric === 'Training volume') return fmtVolume(g.current)
  if (g.metric === 'Workouts logged') return String(g.current)
  if (g.metric === 'Body weight') return `${fmtWeight(g.current)} kg`
  return '—'
}

export default function GoalProgress({ user, workouts, profile }) {
  const [bodyMetrics, setBodyMetrics] = useState([])

  useEffect(() => {
    fetchBodyMetrics(user.id).then(setBodyMetrics).catch(() => setBodyMetrics([]))
  }, [user.id])

  const streak = useMemo(() => currentStreakWeeks(workouts), [workouts])
  const prs = useMemo(() => recentPRs(workouts, 14), [workouts])
  const goals = profile?.goals || []
  const status = useMemo(() => goalStatus(workouts, goals, 28, new Date(), bodyMetrics), [workouts, goals, bodyMetrics])

  if (!workouts.length) {
    return (
      <div className="empty">
        <Tally size={44} />
        <p>Nothing to track yet.</p>
        <p className="small">Log a workout and your goal progress shows up here.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{streak}</div>
          <div className="stat-label">Week streak</div>
        </div>
        <div className="stat">
          <div className="stat-value">{prs.length}</div>
          <div className="stat-label">PRs (14 days)</div>
        </div>
      </div>

      {goals.length === 0 && (
        <div className="card">
          <p className="small" style={{ margin: 0 }}>
            No goals set — add some in Settings and this view will track whether you're on pace for them.
          </p>
        </div>
      )}

      {status.map((g) => (
        <div className="card goal-card" key={g.goal}>
          <div className="goal-card-head">
            <span className="wc-split">{g.goal}</span>
            {!g.needsWeightLog && !g.unsupported && <TrendArrow change={g.change} good={g.onTrack} />}
          </div>
          {g.needsWeightLog ? (
            <p className="small" style={{ margin: '6px 0 0' }}>
              Can't track this from workout logs alone — body weight isn't recorded in the app yet.
            </p>
          ) : g.unsupported ? (
            <p className="small" style={{ margin: '6px 0 0' }}>Not enough data to track this goal yet.</p>
          ) : (
            <>
              <p className="small" style={{ margin: '6px 0 0' }}>{g.metric}: <strong style={{ color: 'var(--ink)' }}>{metricValue(g)}</strong> (last 28 days)</p>
              {g.note && <p className="small" style={{ margin: '4px 0 0' }}>{g.note}</p>}
              {g.change != null && (
                <p className={`small goal-status ${g.onTrack ? 'goal-on' : 'goal-off'}`} style={{ margin: '6px 0 0' }}>
                  {g.onTrack ? `On track — ${g.change >= 0 ? 'trending up' : 'trending down'}` : `Needs attention — ${g.change >= 0 ? 'trending up' : 'trending down'} vs the last 4 weeks`}
                </p>
              )}
            </>
          )}
        </div>
      ))}

      {prs.length > 0 && (
        <div className="card">
          <label className="label">Recent PRs</label>
          {prs.slice(0, 6).map((pr) => (
            <div className="session-row" key={pr.name + pr.date}>
              <span className="session-date" style={{ flex: 1, minWidth: 0 }}>{pr.name}</span>
              <span className="session-best">{fmtWeight(pr.e1rm)} kg</span>
              <span className="session-vol">{fmtDate(pr.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
