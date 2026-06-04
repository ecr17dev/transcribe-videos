import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { v4 as uuidv4 } from 'uuid'
import { extractAudio, getAudioDurationSeconds } from '../services/extractAudio.js'
import { transcribeAudio } from '../services/transcribe.js'
import { summarizeTranscript } from '../services/summarize.js'
import { insertJob, updateJob, getAllJobs, getJobById, deleteJobById } from '../services/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../..')
const UPLOADS_DIR = path.join(ROOT_DIR, 'server/uploads')

const router = Router()
const jobs = new Map()

const WHISPER_COST_PER_MIN = 0.006
const GPT4O_MINI_COST_PER_1K_IN = 0.00015
const GPT4O_MINI_COST_PER_1K_OUT = 0.0006
const GPT4O_COST_PER_1K_IN = 0.0025
const GPT4O_COST_PER_1K_OUT = 0.01

const EXTRACTING_MSGS = [
  'Analizando archivo de video...',
  'Extrayendo pista de audio...',
  'Codificando audio a formato optimo para Whisper...',
  'Ajustando parametros de calidad (16kHz, mono)...',
  'Audio extraido correctamente',
]

const SUMMARIZING_MSGS = [
  'Analizando estructura del contenido...',
  'Identificando temas principales...',
  'Extrayendo puntos clave y conclusiones...',
  'Generando resumen ejecutivo...',
  'Construyendo mapa mental jerarquico...',
  'Formateando resultados...',
]

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
    const allowed = /\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('Formato de video no soportado'))
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
    const model = req.body.model || 'gpt-4o-mini'
    const transcribeOnly = req.body.transcribeOnly === 'true' || req.body.transcribeOnly === true

    const job = {
      id: jobId,
      status: 'extracting',
      step: 1,
      progress: 0,
      stepDetail: EXTRACTING_MSGS[0],
      subSteps: [],
      transcript: null,
      summary: null,
      mindmap: null,
      cost: null,
      error: null,
      videoName,
      model,
      transcribeOnly,
      startedAt: Date.now(),
      createdAt: Date.now(),
    }

    jobs.set(jobId, job)
    insertJob(job)
    processJob(jobId, videoPath, model, transcribeOnly)

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
    mindmap: job.mindmap,
    cost: job.cost,
    error: job.error,
    videoName: job.videoName,
    model: job.model,
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

async function processJob(jobId, videoPath, model, transcribeOnly = false) {
  const job = jobs.get(jobId)
  if (!job) return

  const audioPath = path.join(UPLOADS_DIR, `${jobId}.mp3`)
  let totalCost = 0

  try {
    job.status = 'extracting'
    job.subSteps = EXTRACTING_MSGS.slice(0, 4).map(t => ({ text: t, done: false }))

    for (let i = 0; i < 4; i++) {
      job.subSteps[i].done = true
      job.stepDetail = EXTRACTING_MSGS[i]
      job.progress = Math.round((i + 1) / 4 * 5)
      updateJob(job)
      await sleep(600)
    }

    await extractAudio(videoPath, audioPath)

    const durationSeconds = getAudioDurationSeconds(audioPath)
    const durationFormatted = durationSeconds >= 3600
      ? `${Math.floor(durationSeconds / 3600)}h ${Math.floor((durationSeconds % 3600) / 60)}m`
      : `${Math.floor(durationSeconds / 60)}m`

    job.subSteps[job.subSteps.length - 1].done = true
    job.subSteps.push({ text: `Audio extraido: ${durationFormatted} de duracion`, done: true })
    updateJob(job)

    job.status = 'transcribing'
    job.step = 2
    job.progress = 6

    const { transcript, chunks, durationMinutes } = await transcribeAudio(audioPath, job)
    const whisperCost = durationMinutes * WHISPER_COST_PER_MIN
    totalCost += whisperCost

    job.transcript = transcript
    job.progress = transcribeOnly ? 99 : 92
    updateJob(job)

    if (transcribeOnly) {
      job.cost = {
        whisper: Math.round(whisperCost * 100) / 100,
        gpt: 0,
        total: Math.round(whisperCost * 100) / 100,
        durationMinutes: Math.round(durationMinutes * 10) / 10,
        inputTokens: 0,
        outputTokens: 0,
      }

      job.status = 'done'
      job.step = 3
      job.subSteps.push({ text: 'Transcripcion completada (sin resumen)', done: true })
      job.progress = 100
      job.stepDetail = 'Completado (solo transcripcion)'
      updateJob(job)
      return
    }

    job.status = 'summarizing'
    job.step = 3
    job.subSteps = SUMMARIZING_MSGS.map(t => ({ text: t, done: false }))
    job.progress = 93

    for (let i = 0; i < SUMMARIZING_MSGS.length; i++) {
      job.subSteps[i].done = true
      job.stepDetail = SUMMARIZING_MSGS[i]
      job.progress = Math.round(93 + (i + 1) / SUMMARIZING_MSGS.length * 6)
      updateJob(job)
      await sleep(500)
    }

    const { summary, mindmap, usage } = await summarizeTranscript(transcript, model)
    const inputTokens = usage?.prompt_tokens || 0
    const outputTokens = usage?.completion_tokens || 0

    if (model === 'gpt-4o') {
      totalCost +=
        (inputTokens / 1000) * GPT4O_COST_PER_1K_IN +
        (outputTokens / 1000) * GPT4O_COST_PER_1K_OUT
    } else {
      totalCost +=
        (inputTokens / 1000) * GPT4O_MINI_COST_PER_1K_IN +
        (outputTokens / 1000) * GPT4O_MINI_COST_PER_1K_OUT
    }

    job.summary = summary
    job.mindmap = mindmap
    job.cost = {
      whisper: Math.round(whisperCost * 100) / 100,
      gpt: Math.round(totalCost * 100) / 100 - Math.round(whisperCost * 100) / 100,
      total: Math.round(totalCost * 100) / 100,
      durationMinutes: Math.round(durationMinutes * 10) / 10,
      inputTokens,
      outputTokens,
    }

    job.status = 'done'
    job.step = 4
    job.subSteps.push({ text: 'Completado con exito', done: true })
    job.progress = 100
    job.stepDetail = 'Completado'

    updateJob(job)
  } catch (err) {
    job.status = 'error'
    job.error = err.message
    job.subSteps.push({ text: `Error: ${err.message}`, done: false })
    job.stepDetail = 'Error'
    updateJob(job)
  } finally {
    try { fs.unlinkSync(videoPath) } catch {}
    try { fs.unlinkSync(audioPath) } catch {}
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export default router
