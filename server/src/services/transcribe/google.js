import fs from 'node:fs'
import { getProviderConfig } from '../settings-store.js'

let _speechClient = null

async function getClient() {
  if (_speechClient) return _speechClient
  const config = getProviderConfig('google')
  if (!config?.credentialsJson) {
    throw new Error('Google Cloud: credentialsJson no configurado')
  }
  const { SpeechClient } = await import('@google-cloud/speech')
  const credentials = JSON.parse(config.credentialsJson)
  _speechClient = new SpeechClient({ credentials })
  return _speechClient
}

function resetClient() {
  _speechClient = null
}

export { resetClient as resetGoogleClient }

export async function transcribeGoogle(audioPath, job, options = {}) {
  const lang = options.language || 'es-ES'
  const model = options.model || 'latest_long'
  const client = await getClient()

  const audioBytes = fs.readFileSync(audioPath).toString('base64')

  const request = {
    config: {
      languageCode: lang,
      model,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      encoding: 'MP3',
      sampleRateHertz: 16000,
    },
    audio: { content: audioBytes },
  }

  const [response] = await client.recognize(request)
  const text = response.results
    ?.map(r => r.alternatives?.[0]?.transcript || '')
    .filter(Boolean)
    .join('\n') || ''

  return { text }
}

export function supportsChunkingGoogle() {
  return false
}

export const COST_PER_MIN_GOOGLE = 0.016
