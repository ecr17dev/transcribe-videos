const API_BASE = '/api'

export async function uploadVideo(file, model = 'gpt-4o-mini', transcribeOnly = false) {
  const form = new FormData()
  form.append('video', file)
  form.append('model', model)
  if (transcribeOnly) form.append('transcribeOnly', 'true')

  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al subir el video')
  }

  return res.json()
}

export async function getJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`)
  if (!res.ok) throw new Error('Error al obtener estado del job')
  return res.json()
}
