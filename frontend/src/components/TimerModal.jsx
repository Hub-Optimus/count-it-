import { useEffect, useRef, useState } from 'react'

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Synthesized beep via the Web Audio API - no audio file to host or
// bundle. Wrapped defensively: if Web Audio is unavailable for any
// reason, the timer still works perfectly well visually, it just
// won't make a sound.
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch { /* Web Audio unavailable - silent fallback */ }
}

const PRESETS = [15, 30, 45, 60, 90]

// onUseAsReps(seconds) fills the calling set's reps field and closes
// this modal - the value stays a normal, editable reps input after
// that, exactly like any other auto-filled number in this app.
export default function TimerModal({ onUseAsReps, onClose }) {
  const [mode, setMode] = useState('stopwatch')
  const [running, setRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [targetSeconds, setTargetSeconds] = useState(30)
  const [remaining, setRemaining] = useState(30)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (mode === 'stopwatch') {
        setElapsed((e) => e + 1)
      } else {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false)
            setFinished(true)
            playBeep()
            if (navigator.vibrate) navigator.vibrate([200, 100, 200])
            return 0
          }
          return r - 1
        })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [running, mode])

  function switchMode(next) {
    setMode(next)
    setRunning(false)
    setHasStarted(false)
    setFinished(false)
    setElapsed(0)
    setRemaining(targetSeconds)
  }

  function start() {
    setHasStarted(true)
    setFinished(false)
    setRunning(true)
  }

  function reset() {
    setRunning(false)
    setHasStarted(false)
    setFinished(false)
    setElapsed(0)
    setRemaining(targetSeconds)
  }

  const displaySeconds = mode === 'stopwatch' ? elapsed : (targetSeconds - remaining)
  const canUse = displaySeconds > 0

  return (
    <div className="timer-modal-overlay" onClick={onClose}>
      <div className="timer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="timer-modal-header">
          <div className="timer-mode-tabs">
            <button className={`chip ${mode === 'stopwatch' ? 'on' : ''}`} onClick={() => switchMode('stopwatch')}>Stopwatch</button>
            <button className={`chip ${mode === 'timer' ? 'on' : ''}`} onClick={() => switchMode('timer')}>Timer</button>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {mode === 'timer' && !hasStarted && (
          <div className="timer-preset-row">
            {PRESETS.map((secs) => (
              <button
                key={secs}
                className={`chip ${targetSeconds === secs ? 'on' : ''}`}
                onClick={() => { setTargetSeconds(secs); setRemaining(secs) }}
              >
                {secs}s
              </button>
            ))}
          </div>
        )}

        <div className={`timer-display ${finished ? 'timer-finished' : ''}`}>
          {formatTime(mode === 'stopwatch' ? elapsed : remaining)}
        </div>
        {finished && <div className="timer-finished-label">Time's up!</div>}

        <div className="timer-controls">
          <button className="btn btn-ghost" onClick={reset}>Reset</button>
          <button className="btn btn-primary btn-block" onClick={() => (running ? setRunning(false) : start())}>
            {running ? 'Pause' : hasStarted ? 'Resume' : 'Start'}
          </button>
        </div>

        <button
          className="btn btn-block timer-use-btn"
          disabled={!canUse}
          onClick={() => onUseAsReps(displaySeconds)}
        >
          Use {displaySeconds}s as reps
        </button>
      </div>
    </div>
  )
}
