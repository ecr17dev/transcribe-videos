import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { v4 as uuidv4 } from 'uuid'
import { extractAudio, getAudioDurationSeconds } from '../services/extractAudio.js'
import { transcribeAudio, getCostPerMin } from '../services/transcribe/index.js'
import { summarizeTranscript, generateInfographic } from '../services/summarize/index.js'
import { generateInfographicData } from '../services/summarize/infographic-data.js'
import { generateDocx } from '../services/exportDocx.js'
import { insertJob, updateJob, getAllJobs, getJobById, deleteJobById } from '../services/database.js'
import { getSetting } from '../services/settings-store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../..')
const UPLOADS_DIR = path.join(ROOT_DIR, 'server/uploads')

const router = Router()
const jobs = new Map()

const GPT4O_MINI_COST_PER_1K_IN = 0.00015
const GPT4O_MINI_COST_PER_1K_OUT = 0.0006
const GPT4O_COST_PER_1K_IN = 0.0025
const GPT4O_COST_PER_1K_OUT = 0.01

const MSGS = {
  es: {
    extracting: [
      'Analizando archivo de video...',
      'Extrayendo pista de audio...',
      'Codificando audio a formato optimo...',
      'Ajustando parametros de calidad (16kHz, mono)...',
      'Audio extraido correctamente',
    ],
    summarizing: [
      'Analizando estructura del contenido...',
      'Identificando temas principales...',
      'Extrayendo puntos clave y conclusiones...',
      'Generando resumen ejecutivo...',
      'Componiendo narrativa visual...',
      'Formateando resultados...',
    ],
    twoPass: [
      'Paso 1/2: Extrayendo datos brutos del contenido...',
      'Paso 2/2: Estructurando analisis exhaustivo...',
      'Preparando salida visual...',
      'Formateando resultados...',
    ],
    audioDetected: 'Archivo de audio detectado',
    audioReady: (dur) => `Audio listo: ${dur} de duracion`,
    transComplete: (words) => `Transcripcion completada: ${words} palabras`,
    transCompleteChunks: (words, chunks) => `Transcripcion completada: ${words} palabras en ${chunks} fragmentos`,
    chunkProgress: (current, total) => `Fragmento ${current} de ${total}...`,
    chunkSubstep: (current, total) => `Transcribiendo fragmento ${current} de ${total}`,
    infographicStep: 'Generando infografia visual...',
    infographicDetail: 'Creando infografia...',
    completed: 'Completado con exito',
    completedLabel: 'Completado',
    transOnlyComplete: 'Transcripcion completada (sin resumen)',
    transOnlyLabel: 'Completado (solo transcripcion)',
    preppingAudio: (label) => `Preparando audio para ${label}...`,
    sendingAudio: (label) => `Enviando audio a ${label}...`,
    transcribing: 'Transcribiendo audio...',
    transReceived: 'Transcripcion recibida correctamente',
    bigAudio: (count) => `Audio grande detectado: dividiendo en ${count} fragmentos`,
  },
  en: {
    extracting: [
      'Analyzing video file...',
      'Extracting audio track...',
      'Encoding audio to optimal format...',
      'Adjusting quality parameters (16kHz, mono)...',
      'Audio extracted successfully',
    ],
    summarizing: [
      'Analyzing content structure...',
      'Identifying main topics...',
      'Extracting key points and conclusions...',
      'Generating executive summary...',
      'Composing visual narrative...',
      'Formatting results...',
    ],
    twoPass: [
      'Step 1/2: Extracting raw data from content...',
      'Step 2/2: Structuring exhaustive analysis...',
      'Preparing visual output...',
      'Formatting results...',
    ],
    audioDetected: 'Audio file detected',
    audioReady: (dur) => `Audio ready: ${dur} duration`,
    transComplete: (words) => `Transcription complete: ${words} words`,
    transCompleteChunks: (words, chunks) => `Transcription complete: ${words} words in ${chunks} chunks`,
    chunkProgress: (current, total) => `Chunk ${current} of ${total}...`,
    chunkSubstep: (current, total) => `Transcribing chunk ${current} of ${total}`,
    infographicStep: 'Generating visual infographic...',
    infographicDetail: 'Creating infographic...',
    completed: 'Completed successfully',
    completedLabel: 'Completed',
    transOnlyComplete: 'Transcription complete (no summary)',
    transOnlyLabel: 'Completed (transcribe only)',
    preppingAudio: (label) => `Preparing audio for ${label}...`,
    sendingAudio: (label) => `Sending audio to ${label}...`,
    transcribing: 'Transcribing audio...',
    transReceived: 'Transcription received successfully',
    bigAudio: (count) => `Large audio detected: splitting into ${count} chunks`,
  },
}

function t(lang, key, ...args) {
  const locale = MSGS[lang] || MSGS.es
  const val = locale[key]
  if (typeof val === 'function') return val(...args)
  return val || MSGS.es[key]
}

function getLang(req) {
  const q = req.query?.lang
  if (q === 'en' || q === 'es') return q
  try {
    const formLang = req.body?.lang
    if (formLang === 'en' || formLang === 'es') return formLang
  } catch {}
  return 'es'
}

setTimeout(() => {
  try {
    const saved = getAllJobs()
    for (const j of saved) {
      if (j.status === 'done' || j.status === 'error') {
        jobs.set(j.id, j)
      }
    }
  } catch {}
}, 100)

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4'
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const videoExts = /\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp)$/i
    const audioExts = /\.(mp3|wav|m4a|ogg|flac|opus|aac|wma)$/i
    if (videoExts.test(path.extname(file.originalname)) || audioExts.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('Formato no soportado. Usa video (MP4, MOV, etc.) o audio (MP3, WAV, etc.)'))
    }
  },
})

router.post('/jobs', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subio ningun video' })
    }

    const jobId = uuidv4()
    const videoPath = req.file.path
    const videoName = req.file.originalname
    const model = req.body.model || getSetting('default_summary_model', 'gpt-4o-mini')
    const transcribeOnly = req.body.transcribeOnly === 'true' || req.body.transcribeOnly === true
    const sttProvider = req.body.sttProvider || getSetting('default_stt_provider', 'openai')
    const sttModel = req.body.sttModel || 'whisper-1'
    const lang = req.body.lang === 'en' ? 'en' : 'es'

    const job = {
      id: jobId,
      status: 'extracting',
      step: 1,
      progress: 0,
      stepDetail: t(lang, 'extracting')[0],
      subSteps: [],
      transcript: null,
      summary: null,
      detailedSummary: null,
      infographic: null,
      infographicData: null,
      cost: null,
      error: null,
      videoName,
      model,
      transcribeOnly,
      sttProvider,
      sttModel,
      lang,
      startedAt: Date.now(),
      createdAt: Date.now(),
    }

    jobs.set(jobId, job)
    insertJob(job)
    processJob(jobId, videoPath, model, transcribeOnly, lang)

    res.json({ jobId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/jobs', (_req, res) => {
  try {
    const all = getAllJobs()
    res.json(all.map(j => ({
      id: j.id,
      videoName: j.videoName,
      model: j.model,
      sttProvider: j.sttProvider,
      sttModel: j.sttModel,
      status: j.status,
      cost: j.cost,
      error: j.error,
      createdAt: j.createdAt,
    })))
  } catch {
    res.json([])
  }
})

router.get('/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id) || getJobById(req.params.id)
  if (!job) {
    return res.status(404).json({ error: 'Job no encontrado' })
  }

  res.json({
    id: job.id,
    status: job.status,
    step: job.step,
    progress: job.progress,
    stepDetail: job.stepDetail,
    subSteps: job.subSteps || [],
    transcript: job.transcript,
    summary: job.summary,
    detailedSummary: job.detailedSummary,
    infographic: job.infographic,
    infographicData: job.infographicData,
    cost: job.cost,
    error: job.error,
    videoName: job.videoName,
    model: job.model,
    sttProvider: job.sttProvider,
    sttModel: job.sttModel,
    startedAt: job.startedAt || job.createdAt,
  })
})

router.delete('/jobs/:id', (req, res) => {
  try {
    jobs.delete(req.params.id)
    deleteJobById(req.params.id)
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

async function processJob(jobId, videoPath, model, transcribeOnly = false, lang = 'es') {
  const job = jobs.get(jobId)
  if (!job) return

  const audioExts = /\.(mp3|wav|m4a|ogg|flac|opus|aac|wma)$/i
  const isAudio = audioExts.test(path.extname(videoPath))
  const audioPath = isAudio ? videoPath : path.join(UPLOADS_DIR, `${jobId}.mp3`)
  let totalCost = 0

  try {
    if (isAudio) {
      job.status = 'extracting'
      job.subSteps = [{ text: t(lang, 'audioDetected'), done: true }]
      job.progress = 5
      job.stepDetail = 'Preparing audio...'
      updateJob(job)
      await sleep(300)
    } else {
      job.status = 'extracting'
      job.subSteps = t(lang, 'extracting').slice(0, 4).map(text => ({ text, done: false }))

      for (let i = 0; i < 4; i++) {
        job.subSteps[i].done = true
        job.stepDetail = t(lang, 'extracting')[i]
        job.progress = Math.round((i + 1) / 4 * 5)
        updateJob(job)
        await sleep(600)
      }

      await extractAudio(videoPath, audioPath)
    }

    const durationSeconds = getAudioDurationSeconds(audioPath)
    const durationFormatted = durationSeconds >= 3600
      ? `${Math.floor(durationSeconds / 3600)}h ${Math.floor((durationSeconds % 3600) / 60)}m`
      : `${Math.floor(durationSeconds / 60)}m`

    job.subSteps.push({ text: t(lang, 'audioReady', durationFormatted), done: true })
    updateJob(job)

    job.status = 'transcribing'
    job.step = 2
    job.progress = 6

    const { transcript, chunks, durationMinutes } = await transcribeAudio(audioPath, job)
    const whisperCost = durationMinutes * getCostPerMin(job.sttProvider || 'openai')
    totalCost += whisperCost

    job.transcript = transcript
    job.progress = transcribeOnly ? 99 : 92
    updateJob(job)

    if (transcribeOnly) {
      job.cost = {
        stt: Math.round(whisperCost * 100) / 100,
        gpt: 0,
        total: Math.round(whisperCost * 100) / 100,
        durationMinutes: Math.round(durationMinutes * 10) / 10,
        inputTokens: 0,
        outputTokens: 0,
      }

      job.status = 'done'
      job.step = 3
      job.subSteps.push({ text: t(lang, 'transOnlyComplete'), done: true })
      job.progress = 100
      job.stepDetail = t(lang, 'transOnlyLabel')
      updateJob(job)
      return
    }

    job.status = 'summarizing'
    job.step = 3

    const useTwoPass = getSetting('two_pass_summary', 'true') === 'true'
    const msgs = useTwoPass ? t(lang, 'twoPass') : t(lang, 'summarizing')
    job.subSteps = msgs.map(text => ({ text, done: false }))
    job.progress = 93

    for (let i = 0; i < msgs.length; i++) {
      job.subSteps[i].done = true
      job.stepDetail = msgs[i]
      job.progress = Math.round(93 + (i + 1) / msgs.length * 6)
      updateJob(job)
      await sleep(500)
    }

    const { summary, raw, usage, twoPass } = await summarizeTranscript(transcript, model)
    const inputTokens = usage?.prompt_tokens || 0
    const outputTokens = usage?.completion_tokens || 0

    if (model === 'gpt-4o' || model === 'gpt-4.1') {
      totalCost +=
        (inputTokens / 1000) * GPT4O_COST_PER_1K_IN +
        (outputTokens / 1000) * GPT4O_COST_PER_1K_OUT
    } else {
      totalCost +=
        (inputTokens / 1000) * GPT4O_MINI_COST_PER_1K_IN +
        (outputTokens / 1000) * GPT4O_MINI_COST_PER_1K_OUT
    }

    job.summary = summary
    job.detailedSummary = raw

    // Generate infographic (structured data + legacy HTML)
    job.subSteps.push({ text: t(lang, 'infographicStep'), done: false })
    job.stepDetail = t(lang, 'infographicDetail')
    updateJob(job)

    let infographic = null
    let infographicData = null

    try {
      const infDataResult = await generateInfographicData(raw, model)
      infographicData = infDataResult.data
      if (infDataResult.usage) {
        totalCost += (infDataResult.usage.prompt_tokens || 0) / 1000 * GPT4O_MINI_COST_PER_1K_IN
          + (infDataResult.usage.completion_tokens || 0) / 1000 * GPT4O_MINI_COST_PER_1K_OUT
      }
    } catch (e) {
      console.warn('Infographic data generation failed:', e.message)
    }

    if (!infographicData) {
      try {
        const infResult = await generateInfographic(summary, model)
        infographic = infResult.html
        if (infResult.usage) {
          totalCost += (infResult.usage.prompt_tokens || 0) / 1000 * GPT4O_MINI_COST_PER_1K_IN
            + (infResult.usage.completion_tokens || 0) / 1000 * GPT4O_MINI_COST_PER_1K_OUT
        }
      } catch (e) {
        console.warn('Infographic HTML generation failed:', e.message)
      }
    }

    job.infographic = infographic
    job.infographicData = infographicData

    job.cost = {
      stt: Math.round(whisperCost * 100) / 100,
      gpt: Math.round(totalCost * 100) / 100 - Math.round(whisperCost * 100) / 100,
      total: Math.round(totalCost * 100) / 100,
      durationMinutes: Math.round(durationMinutes * 10) / 10,
      sttProvider: job.sttProvider,
      inputTokens,
      outputTokens,
      twoPass: twoPass || false,
    }

    job.status = 'done'
    job.step = 4
    job.subSteps.push({ text: t(lang, 'completed'), done: true })
    job.progress = 100
    job.stepDetail = t(lang, 'completedLabel')

    updateJob(job)
  } catch (err) {
    job.status = 'error'
    job.error = err.message
    job.subSteps.push({ text: `Error: ${err.message}`, done: false })
    job.stepDetail = 'Error'
    updateJob(job)
  } finally {
    try { fs.unlinkSync(videoPath) } catch {}
    if (!isAudio) try { fs.unlinkSync(audioPath) } catch {}
  }
}

router.get('/jobs/:id/export/docx', async (req, res) => {
  try {
    const job = jobs.get(req.params.id) || getJobById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job no encontrado' })

    const detailedSummary = job.detailedSummary || job.summary
    if (!detailedSummary) return res.status(400).json({ error: 'No hay resumen disponible para exportar' })

    const buffer = await generateDocx(detailedSummary)
    const filename = `${(job.videoName || 'informe').replace(/\.[^.]+$/, '')}_informe.docx`

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/jobs/:id/export/html', async (req, res) => {
  try {
    const job = jobs.get(req.params.id) || getJobById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job no encontrado' })

    const summary = job.detailedSummary || job.summary
    if (!summary) return res.status(400).json({ error: 'No hay resumen disponible' })

    const db = summary.detailed_breakdown || summary || {}
    const es = summary.executive_summary || {}

    const html = generateExportHTML({ detailed_breakdown: db, executive_summary: es }, job.videoName)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function generateExportHTML(summary, videoName) {
  const db = summary.detailed_breakdown || {}
  const es = summary.executive_summary || {}

  const escape = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escape(videoName || 'Informe')} - Resumen de Transcripcion</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #fff;
  color: #1a202c;
  line-height: 1.7;
  font-size: 11pt;
}
.page { max-width: 800px; margin: 0 auto; padding: 60px 40px; }
h1 { font-size: 24pt; font-weight: 800; color: #1F3A5F; margin-bottom: 4px; border-bottom: 4px solid #2D6BC5; padding-bottom: 12px; }
h2 { font-size: 15pt; font-weight: 700; color: #1F3A5F; margin-top: 32px; margin-bottom: 12px; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px; }
h3 { font-size: 12pt; font-weight: 600; color: #2D3748; margin-top: 16px; margin-bottom: 4px; }
.meta { color: #718096; font-size: 10pt; margin-bottom: 24px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 20px 0; }
.stat-card { background: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center; }
.stat-value { font-size: 28pt; font-weight: 800; color: #2D6BC5; line-height: 1; }
.stat-label { font-size: 9pt; color: #718096; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.main-idea { background: #EBF4FF; border-left: 4px solid #2D6BC5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 12pt; font-weight: 500; }
.exec-block { background: #F7FAFC; padding: 20px; border-radius: 8px; margin: 16px 0; }
.section-list { list-style: none; padding: 0; }
.section-list li { padding: 8px 0 8px 20px; position: relative; border-bottom: 1px solid #F0F4F8; }
.section-list li::before { content: ''; position: absolute; left: 0; top: 15px; width: 8px; height: 8px; border-radius: 50%; background: #2D6BC5; }
.topic-card { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0; }
.topic-card h3 { margin-bottom: 2px; }
.topic-card p { color: #4A5568; font-size: 10pt; }
.data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
.data-table th { background: #1F3A5F; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; }
.data-table td { padding: 8px 14px; border-bottom: 1px solid #E2E8F0; }
.data-table tr:nth-child(even) td { background: #F7FAFC; }
.checklist-item { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; }
.checklist-item span:first-child { color: #2D6BC5; font-size: 14pt; line-height: 1; }
.page-break { page-break-before: always; }
.footer { margin-top: 48px; border-top: 1px solid #E2E8F0; padding-top: 16px; text-align: center; color: #A0AEC0; font-size: 9pt; font-style: italic; }
@media print { body { font-size: 10pt; } .page { padding: 20px; } }
</style>
</head>
<body>
<div class="page">
  <h1>${escape(videoName || 'Informe de Transcripcion')}</h1>
  <p class="meta">Generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value">${(db.topics || []).length}</div><div class="stat-label">Temas</div></div>
    <div class="stat-card"><div class="stat-value">${(db.key_insights || []).length}</div><div class="stat-label">Insights</div></div>
    <div class="stat-card"><div class="stat-value">${(db.conclusions || []).length}</div><div class="stat-label">Conclusiones</div></div>
    <div class="stat-card"><div class="stat-value">${(db.action_items || []).length}</div><div class="stat-label">Acciones</div></div>
    <div class="stat-card"><div class="stat-value">${(db.stats_and_facts || []).length}</div><div class="stat-label">Datos</div></div>
    <div class="stat-card"><div class="stat-value">${(db.key_decisions || []).length}</div><div class="stat-label">Decisiones</div></div>
  </div>

  ${db.main_idea ? `<div class="main-idea"><strong>Idea central:</strong> ${escape(db.main_idea)}</div>` : ''}
  ${es.one_liner && !db.main_idea ? `<div class="main-idea"><strong>En una frase:</strong> ${escape(es.one_liner)}</div>` : ''}

  ${es.paragraph ? `<h2>Resumen Ejecutivo</h2><div class="exec-block"><p>${escape(es.paragraph)}</p></div>` : ''}

  ${es.key_takeaways?.length ? `<h2>Puntos Clave (Key Takeaways)</h2><ul class="section-list">${es.key_takeaways.map(t => `<li>${escape(t)}</li>`).join('')}</ul>` : ''}

  ${db.topics?.length ? `<h2>Temas Tratados (${db.topics.length})</h2>${db.topics.map(t => `<div class="topic-card"><h3>${escape(t.title || '')}</h3><p>${escape(t.description || '')}</p></div>`).join('')}` : ''}

  ${db.stats_and_facts?.length ? `<div class="page-break"></div><h2>Datos y Cifras</h2><table class="data-table"><thead><tr><th>#</th><th>Dato / Metrica</th></tr></thead><tbody>${db.stats_and_facts.map((f, i) => `<tr><td>${i + 1}</td><td>${escape(f)}</td></tr>`).join('')}</tbody></table>` : ''}

  ${db.key_insights?.length ? `<h2>Insights Clave</h2><ul class="section-list">${db.key_insights.map(i => `<li>${escape(i)}</li>`).join('')}</ul>` : ''}

  ${db.conclusions?.length ? `<h2>Conclusiones</h2><ul class="section-list">${db.conclusions.map(c => `<li>${escape(c)}</li>`).join('')}</ul>` : ''}

  ${db.key_decisions?.length ? `<h2>Decisiones Clave</h2><ul class="section-list">${db.key_decisions.map(d => `<li>${escape(d)}</li>`).join('')}</ul>` : ''}

  ${db.action_items?.length ? `<h2>Acciones y Proximos Pasos</h2>${db.action_items.map(a => `<div class="checklist-item"><span>&#9744;</span><span>${escape(a)}</span></div>`).join('')}` : ''}

  <div class="footer">Documento generado con TranscribeVideos</div>
</div>
</body>
</html>`
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export default router
