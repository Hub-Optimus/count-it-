import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchVideos, createVideo, deleteVideo } from '../lib/db'

// Same account already gated for the roadmap debug panel - reusing it
// here so upload access lives in exactly one place to keep in sync.
const ADMIN_EMAIL = 'prakashkoulagi.official@gmail.com'

const STAGE_LABEL = { 1: 'Stage 1 — Learn the Lifts', 2: 'Stage 2 — Build the Base', 3: 'Stage 3 — Ready to Graduate' }

export default function LearningVideos({ user }) {
  const [videos, setVideos] = useState(null) // null = loading

  const load = () => fetchVideos().then(setVideos).catch(() => setVideos([]))
  useEffect(() => { load() }, [])

  const isAdmin = user.email === ADMIN_EMAIL

  return (
    <div className="card">
      <label className="label">📺 Learn the moves</label>

      {videos === null && <p className="small">Loading…</p>}
      {videos && videos.length === 0 && <p className="small">No videos yet.</p>}

      {videos && videos.map((v) => (
        <div key={v.id} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, margin: '0 0 2px' }}>{v.title}</p>
          {v.stage && <p className="small" style={{ margin: '0 0 4px', color: 'var(--ink-faint)' }}>{STAGE_LABEL[v.stage]}</p>}
          {v.description && <p className="small" style={{ margin: '0 0 6px' }}>{v.description}</p>}
          <video controls preload="metadata" style={{ width: '100%', borderRadius: 8, background: '#000' }} src={v.url} />
          {isAdmin && (
            <button
              type="button"
              className="text-link-btn"
              onClick={async () => {
                if (!window.confirm(`Delete "${v.title}"?`)) return
                await deleteVideo(v.id)
                load()
              }}
            >
              Delete
            </button>
          )}
        </div>
      ))}

      {isAdmin && <UploadForm onUploaded={load} />}
    </div>
  )
}

function UploadForm({ onUploaded }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!title.trim() || !file) {
      setError('Title and a video file are required.')
      return
    }
    setBusy(true)
    try {
      // File bytes go straight to Supabase Storage from the browser -
      // faster than proxying through the backend, and already protected
      // by the bucket's own RLS policy (owner-only upload).
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('learning-videos').upload(path, file)
      if (uploadError) throw uploadError

      await createVideo({
        title: title.trim(),
        description: description.trim() || null,
        storagePath: path,
        stage: stage ? Number(stage) : null,
      })
      setTitle('')
      setDescription('')
      setStage('')
      setFile(null)
      onUploaded()
    } catch (e) {
      setError(e.message || 'Upload failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
      <p className="small" style={{ fontWeight: 600, margin: '0 0 8px' }}>Upload a video (owner only)</p>
      <div className="field">
        <label className="label" htmlFor="video-title">Title</label>
        <input id="video-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="video-desc">Description (optional)</label>
        <input id="video-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="video-stage">Relevant stage (optional)</label>
        <select id="video-stage" className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">General</option>
          <option value="1">Stage 1 — Learn the Lifts</option>
          <option value="2">Stage 2 — Build the Base</option>
          <option value="3">Stage 3 — Ready to Graduate</option>
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="video-file">Video file</label>
        <input id="video-file" type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
        {busy ? 'Uploading…' : 'Upload video'}
      </button>
    </div>
  )
}