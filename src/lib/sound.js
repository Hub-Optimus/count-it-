// Tiny synthesized sound effects via Web Audio - no audio files, no new
// dependency, no licensing question. Everything here fails silently:
// sound is a nice-to-have, it must never be able to break logging if a
// browser blocks/lacks audio.

let ctx = null
function getCtx() {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq, startTime, duration, { type = 'sine', peak = 0.18 } = {}) {
  const audio = getCtx()
  if (!audio) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

// Short, satisfying blip for a single exercise check-off.
export function playCheckSound() {
  const audio = getCtx()
  if (!audio) return
  try {
    tone(880, audio.currentTime, 0.12)
  } catch {
    // sound is best-effort only
  }
}

// Ascending major arpeggio for finishing a full 5/5 session - a small,
// clean "success chime," not a long clip.
export function playCelebrationSound() {
  const audio = getCtx()
  if (!audio) return
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((freq, i) => tone(freq, audio.currentTime + i * 0.09, 0.22, { type: 'triangle', peak: 0.15 }))
  } catch {
    // sound is best-effort only
  }
}
