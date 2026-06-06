const API_BASE = '/api'

function getLang() {
  try { return localStorage.getItem('locale') || 'es' } catch { return 'es' }
}

export async function uploadVideo(file, model = 'gpt-4o-mini', transcribeOnly = false, sttProvider = 'openai', sttModel = 'whisper-1') {
  const form = new FormData()
  form.append('video', file)
  form.append('model', model)
  form.append('sttProvider', sttProvider)
  form.append('sttModel', sttModel)
  form.append('lang', getLang())
  if (transcribeOnly) form.append('transcribeOnly', 'true')

  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error uploading video')
  }

  return res.json()
}

export async function getJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}?lang=${getLang()}`)
  if (!res.ok) throw new Error('Error fetching job status')
  return res.json()
}

export async function downloadDocx(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/export/docx?lang=${getLang()}`)
  if (!res.ok) throw new Error('Error generating DOCX')
  return res.blob()
}

export async function getExportHTML(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/export/html?lang=${getLang()}`)
  if (!res.ok) throw new Error('Error generating HTML')
  return res.text()
}
