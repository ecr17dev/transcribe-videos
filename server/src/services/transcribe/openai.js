import fs from 'node:fs'
import { getProviderConfig } from '../settings-store.js'
import OpenAI from 'openai'

function getOpenAIClient() {
  const config = getProviderConfig('openai')
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY
  return new OpenAI({ apiKey })
}

export async function transcribeOpenAI(audioPath, job, options = {}) {
  const lang = options.language || 'es'
  const model = options.model || 'whisper-1'

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const transcription = await getOpenAIClient().audio.transcriptions.create({
        model,
        file: fs.createReadStream(audioPath),
        language: lang,
        response_format: 'text',
      })
      return { text: transcription }
    } catch (err) {
      if (attempt === 2) throw err
      await sleep(2000 * (attempt + 1))
    }
  }
}

export function supportsChunkingOpenAI() {
  return true
}

export const COST_PER_MIN_OPENAI = 0.006

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
