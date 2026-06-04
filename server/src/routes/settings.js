import { Router } from 'express'
import fs from 'node:fs'

const router = Router()

const SETTINGS_PATH = process.env.SETTINGS_PATH || null

function loadSettings() {
  if (!SETTINGS_PATH) return {}
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
    }
  } catch {}
  return {}
}

function saveSettings(data) {
  if (!SETTINGS_PATH) return
  const dir = SETTINGS_PATH.substring(0, SETTINGS_PATH.lastIndexOf('/'))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2))
}

let _openai = null
function getOpenAI() {
  if (!_openai) {
    import('openai').then(m => {
      _openai = new m.default({ apiKey: process.env.OPENAI_API_KEY })
    }).catch(() => {})
  }
  return _openai
}

router.get('/settings', (_req, res) => {
  const hasKey = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-'))
  res.json({
    hasApiKey: hasKey,
    apiKeyPreview: hasKey
      ? process.env.OPENAI_API_KEY.slice(0, 12) + '...' + process.env.OPENAI_API_KEY.slice(-4)
      : '',
    isElectron: !!process.env.ELECTRON_RUN,
    settingsPath: SETTINGS_PATH,
  })
})

router.put('/settings', (req, res) => {
  const { openaiApiKey } = req.body

  if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
    return res.status(400).json({ error: 'API key invalida. Debe comenzar con sk-' })
  }

  process.env.OPENAI_API_KEY = openaiApiKey

  if (SETTINGS_PATH) {
    const current = loadSettings()
    current.openaiApiKey = openaiApiKey
    saveSettings(current)
  }

  res.json({
    hasApiKey: true,
    apiKeyPreview: openaiApiKey.slice(0, 12) + '...' + openaiApiKey.slice(-4),
    saved: !!SETTINGS_PATH,
  })
})

router.post('/settings/test', async (_req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'No hay API key configurada' })
  }

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const result = await client.models.list()

    const models = result.data || []
    const hasWhisper = models.some(m => m.id === 'whisper-1')
    const hasGPT = models.some(m => m.id === 'gpt-4o-mini')

    res.json({
      success: true,
      models: {
        whisper: hasWhisper,
        gpt4oMini: hasGPT,
      },
      totalModels: models.length,
    })
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message || 'API key invalida o sin acceso',
    })
  }
})

export default router
