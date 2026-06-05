const API_BASE = '/api'

export async function uploadVideo(file, model = 'gpt-4o-mini', transcribeOnly = false, sttProvider = 'openai', sttModel = 'whisper-1') {
  const form = new FormData()
  form.append('video', file)
  form.append('model', model)
  form.append('sttProvider', sttProvider)
  form.append('sttModel', sttModel)
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

export async function downloadDocx(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/export/docx`)
  if (!res.ok) throw new Error('Error al generar DOCX')
  return res.blob()
}

export async function getExportHTML(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/export/html`)
  if (!res.ok) throw new Error('Error al generar HTML')
  return res.text()
}
