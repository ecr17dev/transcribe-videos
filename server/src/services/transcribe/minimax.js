import fs from 'node:fs'
import { getProviderConfig } from '../settings-store.js'

export async function transcribeMiniMax(audioPath, job, options = {}) {
  const config = getProviderConfig('minimax')
  if (!config?.apiKey) {
    throw new Error('MiniMax: apiKey no configurado')
  }

  const audioBytes = fs.readFileSync(audioPath)
  const base64Audio = audioBytes.toString('base64')

  const body = {
    model: options.model || 'speech-01',
    audio: `data:audio/mp3;base64,${base64Audio}`,
    language: options.language || 'auto',
    format: 'text',
  }

  if (config.groupId) {
    body.group_id = config.groupId
  }

  const response = await fetch('https://api.minimax.io/v1/speech/transcription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`MiniMax API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data?.text || data?.result?.text || ''

  return { text, raw: data }
}

export function supportsChunkingMiniMax() {
  return false
}

export const COST_PER_MIN_MINIMAX = 0.003
