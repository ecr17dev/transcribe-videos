import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { getAudioDurationSeconds } from '../extractAudio.js'
import { resolveMediaBinaries } from '../media-binaries.js'
import { getSetting, getProviderConfig } from '../settings-store.js'
import { transcribeOpenAI, supportsChunkingOpenAI, COST_PER_MIN_OPENAI } from './openai.js'
import { transcribeGoogle, supportsChunkingGoogle, COST_PER_MIN_GOOGLE } from './google.js'
import { transcribeQwen, supportsChunkingQwen, COST_PER_MIN_QWEN } from './qwen.js'
import { transcribeMiniMax, supportsChunkingMiniMax, COST_PER_MIN_MINIMAX } from './minimax.js'
import { transcribeDeepgram, supportsChunkingDeepgram, COST_PER_MIN_DEEPGRAM } from './deepgram.js'

const { ffmpegPath: FFMPEG_BIN } = resolveMediaBinaries()
const MAX_CHUNK_BYTES = 24 * 1024 * 1024

const PROVIDERS = {
  openai: {
    transcribe: transcribeOpenAI,
    supportsChunking: supportsChunkingOpenAI,
    costPerMin: COST_PER_MIN_OPENAI,
    label: 'OpenAI Whisper',
  },
  google: {
    transcribe: transcribeGoogle,
    supportsChunking: supportsChunkingGoogle,
    costPerMin: COST_PER_MIN_GOOGLE,
    label: 'Google Cloud STT',
  },
  qwen: {
    transcribe: transcribeQwen,
    supportsChunking: supportsChunkingQwen,
    costPerMin: COST_PER_MIN_QWEN,
    label: 'Qwen / DashScope',
  },
  minimax: {
    transcribe: transcribeMiniMax,
    supportsChunking: supportsChunkingMiniMax,
    costPerMin: COST_PER_MIN_MINIMAX,
    label: 'MiniMax',
  },
  deepgram: {
    transcribe: transcribeDeepgram,
    supportsChunking: supportsChunkingDeepgram,
    costPerMin: COST_PER_MIN_DEEPGRAM,
    label: 'Deepgram',
  },
}

export function getAvailableProviders() {
  const result = []
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const config = getProviderConfig(id)
    result.push({
      id,
      label: p.label,
      costPerMin: p.costPerMin,
      configured: config?.configured || false,
    })
  }
  return result
}

export async function transcribeAudio(audioPath, job) {
  const providerId = job.sttProvider || getSetting('default_stt_provider', 'openai')
  const sttModel = job.sttModel || 'whisper-1'
  const provider = PROVIDERS[providerId]

  if (!provider) {
    throw new Error(`Proveedor STT no soportado: ${providerId}`)
  }

  const stat = fs.statSync(audioPath)
  const totalSize = stat.size
  const totalDuration = getAudioDurationSeconds(audioPath)

  if (totalSize <= MAX_CHUNK_BYTES || !provider.supportsChunking?.()) {
    job.subSteps.push({ text: `Preparando audio para ${provider.label}...`, done: true })
    job.subSteps.push({ text: `Enviando audio a ${provider.label}...`, done: false })
    job.stepDetail = 'Transcribiendo audio...'

    const result = await provider.transcribe(audioPath, job, { model: sttModel })

    job.subSteps[job.subSteps.length - 1].done = true
    job.subSteps.push({ text: 'Transcripcion recibida correctamente', done: true })
    job.progress = 90

    const wordCount = result.text.split(/\s+/).filter(Boolean).length
    job.stepDetail = `Transcripcion completada: ${wordCount.toLocaleString()} palabras`

    return {
      transcript: result.text,
      chunks: 1,
      durationMinutes: totalDuration / 60,
    }
  }

  const chunkDuration = ((MAX_CHUNK_BYTES / totalSize) * totalDuration) * 0.95
  const chunkCount = Math.ceil(totalDuration / chunkDuration)

  job.subSteps.push({ text: `Audio grande detectado: dividiendo en ${chunkCount} fragmentos`, done: true })
  job.subSteps.push({ text: `Transcribiendo fragmento 1 de ${chunkCount}`, done: false })
  job.progress = 0
  job.stepDetail = `Fragmento 1 de ${chunkCount}...`

  const dir = path.dirname(audioPath)
  const base = path.basename(audioPath, path.extname(audioPath))
  const transcripts = []

  for (let i = 0; i < chunkCount; i++) {
    const start = i * chunkDuration
    const chunkPath = path.join(dir, `${base}_chunk_${i}.mp3`)

    execFileSync(
      FFMPEG_BIN,
      ['-y', '-i', audioPath, '-ss', String(start), '-t', String(chunkDuration), '-c', 'copy', chunkPath],
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 30000 }
    )

    job.stepDetail = `Fragmento ${i + 1} de ${chunkCount}...`
    job.progress = Math.round(((i + 1) / chunkCount) * 90)

    const result = await provider.transcribe(chunkPath, job, { model: sttModel })
    transcripts.push(result.text)

    job.subSteps[job.subSteps.length - 1].done = true
    if (i < chunkCount - 1) {
      job.subSteps.push({ text: `Transcribiendo fragmento ${i + 2} de ${chunkCount}`, done: false })
    }

    try { fs.unlinkSync(chunkPath) } catch {}
  }

  const wordCount = transcripts.join(' ').split(/\s+/).filter(Boolean).length
  job.stepDetail = `Transcripcion completada: ${wordCount.toLocaleString()} palabras en ${chunkCount} fragmentos`

  return {
    transcript: transcripts.join('\n\n'),
    chunks: chunkCount,
    durationMinutes: totalDuration / 60,
  }
}

export function getCostPerMin(providerId) {
  return PROVIDERS[providerId]?.costPerMin || COST_PER_MIN_OPENAI
}
