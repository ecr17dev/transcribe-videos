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

const TRANSLATIONS = {
  es: {
    prepping: (label) => `Preparando audio para ${label}...`,
    sending: (label) => `Enviando audio a ${label}...`,
    transcribing: 'Transcribiendo audio...',
    received: 'Transcripcion recibida correctamente',
    complete: (words) => `Transcripcion completada: ${words} palabras`,
    completeChunks: (words, chunks) => `Transcripcion completada: ${words} palabras en ${chunks} fragmentos`,
    bigAudio: (count) => `Audio grande detectado: dividiendo en ${count} fragmentos`,
    chunkProgress: (current, total) => `Fragmento ${current} de ${total}...`,
    chunkSubstep: (current, total) => `Transcribiendo fragmento ${current} de ${total}`,
  },
  en: {
    prepping: (label) => `Preparing audio for ${label}...`,
    sending: (label) => `Sending audio to ${label}...`,
    transcribing: 'Transcribing audio...',
    received: 'Transcription received successfully',
    complete: (words) => `Transcription complete: ${words} words`,
    completeChunks: (words, chunks) => `Transcription complete: ${words} words in ${chunks} chunks`,
    bigAudio: (count) => `Large audio detected: splitting into ${count} chunks`,
    chunkProgress: (current, total) => `Chunk ${current} of ${total}...`,
    chunkSubstep: (current, total) => `Transcribing chunk ${current} of ${total}`,
  },
}

function t(job, key, ...args) {
  const lang = job?.lang === 'en' ? 'en' : 'es'
  const locale = TRANSLATIONS[lang]
  const val = locale[key]
  if (typeof val === 'function') return val(...args)
  return val || TRANSLATIONS.es[key]
}

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
    job.subSteps.push({ text: t(job, 'prepping', provider.label), done: true })
    job.subSteps.push({ text: t(job, 'sending', provider.label), done: false })
    job.stepDetail = t(job, 'transcribing')

    const result = await provider.transcribe(audioPath, job, { model: sttModel })

    job.subSteps[job.subSteps.length - 1].done = true
    job.subSteps.push({ text: t(job, 'received'), done: true })
    job.progress = 90

    const wordCount = result.text.split(/\s+/).filter(Boolean).length
    job.stepDetail = t(job, 'complete', wordCount.toLocaleString())

    return {
      transcript: result.text,
      chunks: 1,
      durationMinutes: totalDuration / 60,
    }
  }

  const chunkDuration = ((MAX_CHUNK_BYTES / totalSize) * totalDuration) * 0.95
  const chunkCount = Math.ceil(totalDuration / chunkDuration)

  job.subSteps.push({ text: t(job, 'bigAudio', chunkCount), done: true })
  job.subSteps.push({ text: t(job, 'chunkSubstep', 1, chunkCount), done: false })
  job.progress = 0
  job.stepDetail = t(job, 'chunkProgress', 1, chunkCount)

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

    job.stepDetail = t(job, 'chunkProgress', i + 1, chunkCount)
    job.progress = Math.round(((i + 1) / chunkCount) * 90)

    const result = await provider.transcribe(chunkPath, job, { model: sttModel })
    transcripts.push(result.text)

    job.subSteps[job.subSteps.length - 1].done = true
    if (i < chunkCount - 1) {
      job.subSteps.push({ text: t(job, 'chunkSubstep', i + 2, chunkCount), done: false })
    }

    try { fs.unlinkSync(chunkPath) } catch {}
  }

  const wordCount = transcripts.join(' ').split(/\s+/).filter(Boolean).length
  job.stepDetail = t(job, 'completeChunks', wordCount.toLocaleString(), chunkCount)

  return {
    transcript: transcripts.join('\n\n'),
    chunks: chunkCount,
    durationMinutes: totalDuration / 60,
  }
}

export function getCostPerMin(providerId) {
  return PROVIDERS[providerId]?.costPerMin || COST_PER_MIN_OPENAI
}
