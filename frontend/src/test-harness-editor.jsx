// Permanent test harness for testing WorkoutEditor directly, bypassing
// the dashboard/navigation. Each test sets window.__TEST_PROPS__ via
// page.addInitScript() before navigating here. See tests/README.md.
import { createRoot } from 'react-dom/client'
import WorkoutEditor from './components/WorkoutEditor'

const props = (typeof window !== 'undefined' && window.__TEST_PROPS__) || {}

const root = createRoot(document.getElementById('root'))
root.render(
  <WorkoutEditor
    user={{ id: 'test-user' }}
    workout={props.workout ?? null}
    workouts={props.workouts ?? []}
    exerciseNames={props.exerciseNames ?? []}
    defaultUnit={props.defaultUnit ?? 'kg'}
    autoResumeDraft={props.autoResumeDraft ?? false}
    initialExercises={props.initialExercises}
    latestBodyweight={props.latestBodyweight ?? null}
    onClose={() => { window.__TEST_CLOSED__ = true }}
    onSaved={() => { window.__TEST_SAVED__ = true }}
  />
)
