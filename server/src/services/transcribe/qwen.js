import fs from 'node:fs'
import path from 'node:path'
import { getProviderConfig } from '../settings-store.js'

export async function transcribeQwen(audioPath, job, options = {}) {
  const config = getProviderConfig('qwen')
  if (!config?.apiKey) {
    throw new Error('Qwen / DashScope: apiKey no configurado')
  }

  const fileName = path.basename(audioPath)
  const audioBuffer = fs.readFileSync(audioPath)
  const blob = new Blob([audioBuffer], { type: 'audio/mp3' })

  const form = new FormData()
  form.append('model', options.model || 'qwen-asr')
  form.append('file', blob, fileName)

  if (options.language) {
    form.append('language_hints', options.language)
  }

  const response = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json',
      },
      body: form,
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Qwen API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data?.output?.text || ''

  return { text, raw: data }
}

export function supportsChunkingQwen() {
  return false
}

export const COST_PER_MIN_QWEN = 0.004
