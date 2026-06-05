import db from './database.js'

const DEFAULTS = {
  default_stt_provider: 'openai',
  default_summary_model: 'gpt-4o-mini',
  two_pass_summary: 'true',
  default_maps_model: 'gpt-4o-mini',
  lang: 'es',
}

const PROVIDER_KEYS = {
  openai: { label: 'OpenAI', fields: ['apiKey'], keyPrefix: 'sk-' },
  google: { label: 'Google Cloud', fields: ['credentialsJson'], keyPrefix: null },
  qwen: { label: 'Qwen / DashScope', fields: ['apiKey'], keyPrefix: null },
  minimax: { label: 'MiniMax', fields: ['apiKey', 'groupId'], keyPrefix: null },
  deepgram: { label: 'Deepgram', fields: ['apiKey'], keyPrefix: null },
}

const STT_MODELS = {
  openai: ['whisper-1'],
  google: ['latest_long', 'latest_short', 'chirp', 'chirp_2'],
  qwen: ['qwen-asr', 'qwen-asr-v2'],
  minimax: ['speech-01'],
  deepgram: ['nova-2', 'nova-3', 'whisper-large-v3'],
}

export { DEFAULTS, PROVIDER_KEYS, STT_MODELS }

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  if (row) return row.value
  if (DEFAULTS[key] !== undefined) return DEFAULTS[key]
  return fallback
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, String(value), Date.now())
}

export function deleteSetting(key) {
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}

export function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key').all()
  const result = {}
  for (const row of rows) {
    result[row.key] = row.value
  }
  return result
}

export function getProviderConfig(providerId) {
  const raw = getSetting(`provider_${providerId}`, null)
  if (!raw) {
    if (providerId === 'openai') {
      const envKey = process.env.OPENAI_API_KEY
      if (envKey) return { apiKey: envKey, configured: true }
    }
    return { configured: false }
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return { ...parsed, configured: true }
  } catch {
    return { configured: false }
  }
}

export function setProviderConfig(providerId, config) {
  setSetting(`provider_${providerId}`, JSON.stringify(config))
  if (providerId === 'openai' && config.apiKey) {
    process.env.OPENAI_API_KEY = config.apiKey
  }
}

export function deleteProviderConfig(providerId) {
  deleteSetting(`provider_${providerId}`)
}

export function getAllProviders() {
  const providers = {}
  for (const id of Object.keys(PROVIDER_KEYS)) {
    providers[id] = {
      ...PROVIDER_KEYS[id],
      models: STT_MODELS[id] || [],
      config: getProviderConfig(id),
    }
  }
  return providers
}

export function getAllProvidersSanitized() {
  const providers = {}
  for (const id of Object.keys(PROVIDER_KEYS)) {
    const config = getProviderConfig(id)
    providers[id] = {
      ...PROVIDER_KEYS[id],
      models: STT_MODELS[id] || [],
      config: sanitizeConfig(config),
    }
  }
  return providers
}

function sanitizeConfig(config) {
  const sanitized = { configured: config.configured || false }
  if (config.apiKey) {
    sanitized.apiKeyPreview = config.apiKey.length > 12
      ? config.apiKey.slice(0, 8) + '...'
      : '****'
  }
  return sanitized
}

import fs from 'node:fs'
import path from 'node:path'

export function syncToFile(filePath) {
  const all = getAllSettings()
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(all, null, 2))
}

export function loadFromFile(filePath) {
  if (!fs.existsSync(filePath)) return
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    for (const [key, value] of Object.entries(data)) {
      setSetting(key, value)
    }
  } catch {}
}
