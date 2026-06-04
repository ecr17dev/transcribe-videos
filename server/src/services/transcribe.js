import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import OpenAI from 'openai'
import { getAudioDurationSeconds } from './extractAudio.js'

const MAX_CHUNK_BYTES = 24 * 1024 * 1024

let _openai = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export async function transcribeAudio(audioPath, job) {
  const stat = fs.statSync(audioPath)
  const totalSize = stat.size
  const totalDuration = getAudioDurationSeconds(audioPath)

  if (totalSize <= MAX_CHUNK_BYTES) {
    job.subSteps.push({ text: 'Preparando audio para Whisper...', done: true })
    job.subSteps.push({ text: 'Enviando audio a OpenAI Whisper-1...', done: false })
    job.stepDetail = 'Transcribiendo audio...'

    const result = await transcribeChunk(audioPath)

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

    execSync(
      `ffmpeg -y -i "${audioPath}" -ss ${start} -t ${chunkDuration} -c copy "${chunkPath}" 2>/dev/null`,
      { timeout: 30000 }
    )

    job.stepDetail = `Fragmento ${i + 1} de ${chunkCount}...`
    job.progress = Math.round(((i + 1) / chunkCount) * 90)

    const result = await transcribeChunk(chunkPath)
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

async function transcribeChunk(chunkPath) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const transcription = await getOpenAI().audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(chunkPath),
        language: 'es',
        response_format: 'text',
      })
      return { text: transcription }
    } catch (err) {
      if (attempt === 2) throw err
      await sleep(2000 * (attempt + 1))
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
