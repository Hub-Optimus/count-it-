import { useState } from 'react'
import { saveOnboarding } from '../lib/db'
import { Tally } from './TabBar'
import { GOAL_OPTIONS } from './Goals'

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
  const [goals, setGoals] = useState(initial?.goals ?? [])
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

  const step1Valid = dateOfBirth && sex && heightCm && weight
  const step2Valid = primaryGoal && activityLevel && experienceLevel && trainLocations.length > 0

  async function finish() {
    setBusy(true)
    setError('')
    try {
      await saveOnboarding(user.id, {
        dateOfBirth, sex, heightCm: parseFloat(heightCm), weight: parseFloat(weight), weightUnit,
        goals, goalNote: goalNote.trim(),
        primaryGoal,
        targetWeight: WEIGHT_RELEVANT_GOALS.includes(primaryGoal) && targetWeight ? parseFloat(targetWeight) : null,
        targetWeightUnit: WEIGHT_RELEVANT_GOALS.includes(primaryGoal) && targetWeight ? targetWeightUnit : null,
        activityLevel, experienceLevel, trainLocations,
        injuryNotes: injuryNotes.trim(),
        workoutDaysPerWeek: workoutDaysPerWeek ? parseInt(workoutDaysPerWeek, 10) : null,
        remindersEnabled, restDayNudgesEnabled, dietaryPrefs,
      })
      onDone?.({
        goals, goal_note: goalNote.trim() || null, height_cm: parseFloat(heightCm),
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
            <label className="label">Date of birth</label>
            <input className="input" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Sex (used to calculate calorie needs)</label>
            <div className="chip-row">
              {SEX_OPTIONS.map((o) => (
                <button key={o.v} className={`chip ${sex === o.v ? 'on' : ''}`} onClick={() => setSex(o.v)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Height (cm)</label>
            <input className="input" type="text" inputMode="decimal" placeholder="e.g. 175" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          </div>

          <div className="field">
            <label className="label">Current weight</label>
            <div className="set-row" style={{ gridTemplateColumns: '1fr 60px' }}>
              <input className="input" type="text" inputMode="decimal" placeholder="weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <button className="mini-btn" onClick={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}>{weightUnit === 'kg' ? 'kg' : 'lb'}</button>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={!step1Valid} onClick={() => setStep(2)}>
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="auth-tag">What are you working toward?</p>

          <div className="field">
            <label className="label">Primary goal</label>
            <div className="chip-row">
              {PRIMARY_GOALS.map((o) => (
                <button key={o.v} className={`chip ${primaryGoal === o.v ? 'on' : ''}`} onClick={() => setPrimaryGoal(o.v)}>{o.label}</button>
              ))}
            </div>
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
            <label className="label">Activity level</label>
            <div className="chip-row">
              {ACTIVITY_LEVELS.map((o) => (
                <button key={o.v} className={`chip ${activityLevel === o.v ? 'on' : ''}`} onClick={() => setActivityLevel(o.v)}>
                  {o.label}{o.hint ? ` · ${o.hint}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Experience level</label>
            <div className="chip-row">
              {EXPERIENCE_LEVELS.map((o) => (
                <button key={o.v} className={`chip ${experienceLevel === o.v ? 'on' : ''}`} onClick={() => setExperienceLevel(o.v)}>
                  {o.label}{o.hint ? ` · ${o.hint}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">Where do you train? (pick any)</label>
            <div className="chip-row">
              {TRAIN_LOCATIONS.map((o) => (
                <button key={o.v} className={`chip ${trainLocations.includes(o.v) ? 'on' : ''}`} onClick={() => setTrainLocations((l) => toggleInList(l, o.v))}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="hr" />

          <div className="field">
            <label className="label">What are you training for? (shapes your progress charts)</label>
            <div className="chip-row">
              {GOAL_OPTIONS.map((g) => (
                <button key={g} className={`chip ${goals.includes(g) ? 'on' : ''}`} onClick={() => setGoals((l) => toggleInList(l, g))}>{g}</button>
              ))}
            </div>
            <input className="input" placeholder="Something else? Type it here" value={goalNote} onChange={(e) => setGoalNote(e.target.value)} />
          </div>

          {error && <p className="error">{error}</p>}
          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={!step2Valid} onClick={() => setStep(3)}>Continue</button>
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
