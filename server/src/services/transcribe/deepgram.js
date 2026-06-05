import fs from 'node:fs'
import { getProviderConfig } from '../settings-store.js'

let _deepgramClient = null

async function getClient() {
  if (_deepgramClient) return _deepgramClient
  const config = getProviderConfig('deepgram')
  if (!config?.apiKey) {
    throw new Error('Deepgram: apiKey no configurado')
  }
  const { createClient } = await import('@deepgram/sdk')
  _deepgramClient = createClient(config.apiKey)
  return _deepgramClient
}

function resetClient() {
  _deepgramClient = null
}

export { resetClient as resetDeepgramClient }

export async function transcribeDeepgram(audioPath, job, options = {}) {
  const lang = options.language || 'es'
  const model = options.model || 'nova-2'
  const client = await getClient()

  const audioBuffer = fs.readFileSync(audioPath)

  const { result, error } = await client.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model,
      language: lang,
      smart_format: true,
      punctuate: true,
      diarize: true,
      multichannel: false,
      numerals: true,
    }
  )

  if (error) {
    throw new Error(`Deepgram error: ${error.message || JSON.stringify(error)}`)
  }

  const text = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
  return { text, raw: result }
}

export function supportsChunkingDeepgram() {
  return false
}

export const COST_PER_MIN_DEEPGRAM = 0.0125
