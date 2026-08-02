import { useEffect, useState } from 'react'
import { saveOnboarding } from '../lib/db'
import { Tally } from './TabBar'

const SEX_OPTIONS = [
  { v: 'male', label: 'Male' },
  { v: 'female', label: 'Female' },
]

const PRIMARY_GOALS = [
  { v: 'lose_fat', label: 'Lose fat' },
  { v: 'build_muscle', label: 'Build muscle' },
  { v: 'maintain', label: 'Maintain' },
  { v: 'general_fitness', label: 'General fitness' },
  { v: 'strength', label: 'Get stronger' },
  { v: 'endurance', label: 'Build endurance' },
]

// Feeds the existing Progress-tab goal charts (goalAnalytics.js), which
// only recognize these exact strings. This is what lets "Primary goal"
// stay the only goal question in onboarding instead of also showing the
// older multi-select chip picker - one answer now drives both. 'maintain'
// deliberately maps to no chart goal: there's no clear on-pace direction
// for it the way there is for the others, so an empty array gives the
// honest "no goals set" state instead of a confusing "unsupported" card.
// Someone can still hand-pick specific chart goals later from Settings.
const PRIMARY_GOAL_TO_CHART_GOALS = {
  lose_fat: ['Lose weight'],
  build_muscle: ['Build muscle'],
  maintain: [],
  general_fitness: ['General fitness'],
  strength: ['Build strength'],
  endurance: ['Improve stamina'],
}

// Only these goals give a clear direction for a weight target - asking
// for a target weight under "maintain" or "endurance" has no obvious
// answer and just adds a confusing field nobody knows how to fill in.
const WEIGHT_RELEVANT_GOALS = ['lose_fat', 'build_muscle']

const ACTIVITY_LEVELS = [
  { v: 'sedentary', label: 'Sedentary', hint: 'little to no exercise' },
  { v: 'light', label: 'Light', hint: '1-2 days/week' },
  { v: 'moderate', label: 'Moderate', hint: '3-4 days/week' },
  { v: 'active', label: 'Active', hint: '5-6 days/week' },
  { v: 'very_active', label: 'Very active', hint: 'daily / physical job' },
]

const EXPERIENCE_LEVELS = [
  { v: 'beginner', label: 'Beginner', hint: '< 6 months' },
  { v: 'intermediate', label: 'Intermediate', hint: '6 months - 2 years' },
  { v: 'advanced', label: 'Advanced', hint: '2+ years' },
  { v: 'pro', label: 'Pro / competitive' },
]

const TRAIN_LOCATIONS = [
  { v: 'gym', label: 'Gym' },
  { v: 'home', label: 'Home' },
  { v: 'bodyweight', label: 'Bodyweight only' },
]

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Dairy-free', 'Gluten-free', 'Halal', 'Kosher',
]

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
}

// mode: 'onboard' (full screen, gates the app) | could later support 'settings'
export default function Onboarding({ user, initial, defaultUnit = 'kg', onDone }) {
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [dateOfBirth, setDateOfBirth] = useState(initial?.date_of_birth ?? '')
  const [sex, setSex] = useState(initial?.sex ?? '')
  const [heightCm, setHeightCm] = useState(initial?.height_cm ?? '')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState(defaultUnit)

  // Step 2
  const [goalNote, setGoalNote] = useState(initial?.goal_note ?? '')
  const [primaryGoal, setPrimaryGoal] = useState(initial?.primary_goal ?? '')
  const [targetWeight, setTargetWeight] = useState(initial?.target_weight ?? '')
  const [targetWeightUnit, setTargetWeightUnit] = useState(initial?.target_weight_unit ?? defaultUnit)
  const [activityLevel, setActivityLevel] = useState(initial?.activity_level ?? '')
  const [experienceLevel, setExperienceLevel] = useState(initial?.experience_level ?? '')
  const [trainLocations, setTrainLocations] = useState(initial?.train_locations ?? [])

  // Step 3 (all optional)
  const [injuryNotes, setInjuryNotes] = useState(initial?.injury_notes ?? '')
  const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState(initial?.workout_days_per_week ?? '')
  const [remindersEnabled, setRemindersEnabled] = useState(initial?.reminders_enabled ?? true)
  const [restDayNudgesEnabled, setRestDayNudgesEnabled] = useState(initial?.rest_day_nudges_enabled ?? false)
  const [dietaryPrefs, setDietaryPrefs] = useState(initial?.dietary_prefs ?? [])

  // Clears the "please fill in..." message the moment the relevant field
  // actually changes, rather than leaving a stale warning up until the
  // next Continue click.
  useEffect(() => { setError('') }, [dateOfBirth, sex, heightCm, weight])
  useEffect(() => { setError('') }, [primaryGoal, activityLevel, experienceLevel, trainLocations])

  function missingStep1Fields() {
    const missing = []
    if (!dateOfBirth) missing.push('Date of birth')
    if (!sex) missing.push('Sex')
    if (!heightCm) missing.push('Height')
    if (!weight) missing.push('Current weight')
    return missing
  }

  function missingStep2Fields() {
    const missing = []
    if (!primaryGoal) missing.push('Primary goal')
    if (!activityLevel) missing.push('Activity level')
    if (!experienceLevel) missing.push('Experience level')
    if (trainLocations.length === 0) missing.push('Where you train')
    return missing
  }

  function goToStep2() {
    const missing = missingStep1Fields()
    if (missing.length) { setError(`Please fill in: ${missing.join(', ')}`); return }
    setStep(2)
  }

  function goToStep3() {
    const missing = missingStep2Fields()
    if (missing.length) { setError(`Please fill in: ${missing.join(', ')}`); return }
    setStep(3)
  }

  async function finish() {
    setBusy(true)
    setError('')
    try {
      await saveOnboarding(user.id, {
        dateOfBirth, sex, heightCm: parseFloat(heightCm), weight: parseFloat(weight), weightUnit,
        goals: PRIMARY_GOAL_TO_CHART_GOALS[primaryGoal] ?? [], goalNote: goalNote.trim(),
        primaryGoal,
        targetWeight: WEIGHT_RELEVANT_GOALS.includes(primaryGoal) && targetWeight ? parseFloat(targetWeight) : null,
        targetWeightUnit: WEIGHT_RELEVANT_GOALS.includes(primaryGoal) && targetWeight ? targetWeightUnit : null,
        activityLevel, experienceLevel, trainLocations,
        injuryNotes: injuryNotes.trim(),
        workoutDaysPerWeek: workoutDaysPerWeek ? parseInt(workoutDaysPerWeek, 10) : null,
        remindersEnabled, restDayNudgesEnabled, dietaryPrefs,
      })
      onDone?.({
        goals: PRIMARY_GOAL_TO_CHART_GOALS[primaryGoal] ?? [], goal_note: goalNote.trim() || null, height_cm: parseFloat(heightCm),
        date_of_birth: dateOfBirth, sex,
        primary_goal: primaryGoal, activity_level: activityLevel, experience_level: experienceLevel,
        train_locations: trainLocations,
        onboarding_completed_at: new Date().toISOString(),
      })
    } catch (e) {
      setError(e.message || 'Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-logo">
        <Tally size={40} />
        <div className="auth-title">Count It</div>
      </div>

      <div className="progress-dots">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`progress-dot ${n <= step ? 'on' : ''}`} />
        ))}
      </div>

      {step === 1 && (
        <>
          <p className="auth-tag">A few basics, so suggestions actually fit you.</p>

          <div className="field">
            <label className="label">Date of birth <span className="required-star">*</span></label>
            <input className="input" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Sex (used to calculate calorie needs) <span className="required-star">*</span></label>
            <div className="chip-row">
              {SEX_OPTIONS.map((o) => (
                <button key={o.v} className={`chip ${sex === o.v ? 'on' : ''}`} onClick={() => setSex(o.v)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Height (cm) <span className="required-star">*</span></label>
            <input className="input" type="text" inputMode="decimal" placeholder="e.g. 175" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Current weight <span className="required-star">*</span></label>
            <div className="set-row" style={{ gridTemplateColumns: '1fr 60px' }}>
              <input className="input" type="text" inputMode="decimal" placeholder="weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <button className="mini-btn" onClick={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}>{weightUnit === 'kg' ? 'kg' : 'lb'}</button>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} onClick={goToStep2}>
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="auth-tag">What are you working toward?</p>

          <div className="field">
            <label className="label">Primary goal <span className="required-star">*</span></label>
            <div className="chip-row">
              {PRIMARY_GOALS.map((o) => (
                <button key={o.v} className={`chip ${primaryGoal === o.v ? 'on' : ''}`} onClick={() => setPrimaryGoal(o.v)}>{o.label}</button>
              ))}
            </div>
            <input className="input" style={{ marginTop: 8 }} placeholder="Anything else about your goal? (optional)" value={goalNote} onChange={(e) => setGoalNote(e.target.value)} />
          </div>

          {WEIGHT_RELEVANT_GOALS.includes(primaryGoal) && (
            <div className="field">
              <label className="label">Target weight (optional)</label>
              <div className="set-row" style={{ gridTemplateColumns: '1fr 60px' }}>
                <input className="input" type="text" inputMode="decimal" placeholder="target" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
                <button className="mini-btn" onClick={() => setTargetWeightUnit(targetWeightUnit === 'kg' ? 'lbs' : 'kg')}>{targetWeightUnit === 'kg' ? 'kg' : 'lb'}</button>
              </div>
            </div>
          )}

          <div className="field">
            <label className="label">Activity level <span className="required-star">*</span></label>
            <div className="chip-row">
              {ACTIVITY_LEVELS.map((o) => (
                <button key={o.v} className={`chip ${activityLevel === o.v ? 'on' : ''}`} onClick={() => setActivityLevel(o.v)}>
                  {o.label}{o.hint ? ` · ${o.hint}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Experience level <span className="required-star">*</span></label>
            <div className="chip-row">
              {EXPERIENCE_LEVELS.map((o) => (
                <button key={o.v} className={`chip ${experienceLevel === o.v ? 'on' : ''}`} onClick={() => setExperienceLevel(o.v)}>
                  {o.label}{o.hint ? ` · ${o.hint}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Where do you train? (pick any) <span className="required-star">*</span></label>
            <div className="chip-row">
              {TRAIN_LOCATIONS.map((o) => (
                <button key={o.v} className={`chip ${trainLocations.includes(o.v) ? 'on' : ''}`} onClick={() => setTrainLocations((l) => toggleInList(l, o.v))}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={goToStep3}>Continue</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="auth-tag">A few optional details — skip anything you'd rather not answer.</p>

          <div className="field">
            <label className="label">Injuries or limitations (optional)</label>
            <textarea className="textarea" placeholder="e.g. avoid overhead pressing" value={injuryNotes} onChange={(e) => setInjuryNotes(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Workout days per week (optional)</label>
            <input className="input" type="text" inputMode="numeric" placeholder="e.g. 4" value={workoutDaysPerWeek} onChange={(e) => setWorkoutDaysPerWeek(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Notifications</label>
            <div className="chip-row">
              <button className={`chip ${remindersEnabled ? 'on' : ''}`} onClick={() => setRemindersEnabled((v) => !v)}>Log reminders</button>
              <button className={`chip ${restDayNudgesEnabled ? 'on' : ''}`} onClick={() => setRestDayNudgesEnabled((v) => !v)}>Rest-day nudges</button>
            </div>
          </div>

          <div className="field">
            <label className="label">Dietary preference (optional)</label>
            <div className="chip-row">
              {DIETARY_OPTIONS.map((d) => (
                <button key={d} className={`chip ${dietaryPrefs.includes(d) ? 'on' : ''}`} onClick={() => setDietaryPrefs((l) => toggleInList(l, d))}>{d}</button>
              ))}
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(2)} disabled={busy}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={finish}>
              {busy ? 'Saving…' : 'Finish'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
