import { Router } from 'express'
import {
  getAllProviders, getAllProvidersSanitized, getProviderConfig, setProviderConfig, deleteProviderConfig,
  getSetting, setSetting, getAllSettings,
  PROVIDER_KEYS, STT_MODELS, syncToFile, loadFromFile,
} from '../services/settings-store.js'
import { EXTRACTION_PROMPT, STRUCTURING_PROMPT, LEGACY_SUMMARY_PROMPT, INFOGRAPHIC_PROMPT } from '../services/summarize/defaults.js'

const router = Router()

const SETTINGS_PATH = process.env.SETTINGS_PATH || null

const PROMPT_DEFAULTS = {
  prompt_extraction: EXTRACTION_PROMPT,
  prompt_structuring: STRUCTURING_PROMPT,
  prompt_legacy_summary: LEGACY_SUMMARY_PROMPT,
  prompt_infographic: INFOGRAPHIC_PROMPT,
}

if (SETTINGS_PATH) {
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    if (fs.existsSync(SETTINGS_PATH)) {
      loadFromFile(SETTINGS_PATH)
    }
  } catch {}
}

router.get('/settings', (_req, res) => {
  const all = getAllSettings()
  const providers = getAllProvidersSanitized()

  res.json({
    hasApiKey: !!(providers.openai?.config?.configured),
    apiKeyPreview: providers.openai?.config?.configured
      ? (providers.openai.config.apiKey || '').slice(0, 12) + '...'
      : '',
    isElectron: !!process.env.ELECTRON_RUN,
    settingsPath: SETTINGS_PATH,
    providers: Object.fromEntries(
      Object.entries(providers).map(([id, p]) => [id, {
        label: p.label,
        configured: p.config?.configured || false,
        models: p.models,
        apiKeyPreview: p.config?.apiKey
          ? p.config.apiKey.slice(0, 8) + '...'
          : '',
      }])
    ),
    prompts: Object.fromEntries(
      Object.keys(PROMPT_DEFAULTS).map(key => [
        key,
        { custom: all[key] ? true : false, value: all[key] || PROMPT_DEFAULTS[key] }
      ])
    ),
    defaultSttProvider: all.default_stt_provider || 'openai',
    defaultSummaryModel: all.default_summary_model || 'gpt-4o-mini',
    twoPassSummary: all.two_pass_summary !== 'false',
    defaultMapsModel: all.default_maps_model || 'gpt-4o-mini',
  })
})

router.put('/settings', async (req, res) => {
  const {
    defaultSttProvider,
    defaultSummaryModel,
    defaultMapsModel,
    twoPassSummary,
  } = req.body

  if (defaultSttProvider) setSetting('default_stt_provider', defaultSttProvider)
  if (defaultSummaryModel) setSetting('default_summary_model', defaultSummaryModel)
  if (defaultMapsModel) setSetting('default_maps_model', defaultMapsModel)
  if (twoPassSummary !== undefined) setSetting('two_pass_summary', twoPassSummary ? 'true' : 'false')

  if (SETTINGS_PATH) syncToFile(SETTINGS_PATH)

  res.json({ saved: true })
})

router.get('/settings/providers', (_req, res) => {
  res.json(getAllProvidersSanitized())
})

router.get('/settings/providers/:id', (req, res) => {
  const config = getProviderConfig(req.params.id)
  res.json({ id: req.params.id, ...PROVIDER_KEYS[req.params.id], config })
})

router.put('/settings/providers/:id', (req, res) => {
  const { id } = req.params
  if (!PROVIDER_KEYS[id]) {
    return res.status(400).json({ error: 'Proveedor no soportado' })
  }

  setProviderConfig(id, req.body)

  if (SETTINGS_PATH) syncToFile(SETTINGS_PATH)

  res.json({ saved: true, provider: id })
})

router.delete('/settings/providers/:id', (req, res) => {
  deleteProviderConfig(req.params.id)
  if (SETTINGS_PATH) syncToFile(SETTINGS_PATH)
  res.json({ deleted: true })
})

router.post('/settings/providers/:id/test', async (req, res) => {
  const { id } = req.params
  const config = getProviderConfig(id)

  if (!config?.configured) {
    return res.status(400).json({
      success: false,
      error: `Proveedor ${id} no configurado`,
    })
  }

  try {
    if (id === 'openai') {
      const { default: OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey: config.apiKey })
      const result = await client.models.list()
      const models = result.data || []
      const hasWhisper = models.some(m => m.id === 'whisper-1')
      const hasGPT = models.some(m => m.id === 'gpt-4o-mini')
      res.json({
        success: true,
        models: { whisper: hasWhisper, gpt4oMini: hasGPT },
        totalModels: models.length,
      })
    } else if (id === 'google') {
      try {
        const { SpeechClient } = await import('@google-cloud/speech')
        const credentials = JSON.parse(config.credentialsJson)
        const client = new SpeechClient({ credentials })
        await client.initialize()
        res.json({ success: true })
      } catch (e) {
        res.status(401).json({ success: false, error: e.message })
      }
    } else if (id === 'qwen') {
      const resp = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
        { method: 'OPTIONS', headers: { Authorization: `Bearer ${config.apiKey}` } }
      )
      res.json({ success: resp.status !== 401, status: resp.status })
    } else if (id === 'minimax') {
      const resp = await fetch(
        'https://api.minimax.io/v1/text/chat',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: 'abab6.5s-chat', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }),
        }
      )
      res.json({ success: resp.ok, status: resp.status })
    } else if (id === 'deepgram') {
      try {
        const { createClient } = await import('@deepgram/sdk')
        const client = createClient(config.apiKey)
        const { result } = await client.manage.getProjects()
        res.json({ success: true, projects: result?.projects?.length || 0 })
      } catch (e) {
        res.status(401).json({ success: false, error: e.message })
      }
    } else {
      res.status(400).json({ success: false, error: 'Proveedor no soportado' })
    }
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message || 'Error de conexion',
    })
  }
})

router.get('/settings/prompts', (_req, res) => {
  const all = getAllSettings()
  const prompts = {}
  for (const key of Object.keys(PROMPT_DEFAULTS)) {
    prompts[key] = {
      default: PROMPT_DEFAULTS[key],
      current: all[key] || PROMPT_DEFAULTS[key],
      custom: !!all[key],
    }
  }
  res.json(prompts)
})

router.put('/settings/prompts', (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (PROMPT_DEFAULTS[key] !== undefined) {
      setSetting(key, value)
    }
  }
  if (SETTINGS_PATH) syncToFile(SETTINGS_PATH)
  res.json({ saved: true })
})

router.post('/settings/prompts/reset', (req, res) => {
  const keys = req.body.keys || Object.keys(PROMPT_DEFAULTS)
  for (const key of keys) {
    if (PROMPT_DEFAULTS[key] !== undefined) {
      setSetting(key, PROMPT_DEFAULTS[key])
    }
  }
  if (SETTINGS_PATH) syncToFile(SETTINGS_PATH)
  res.json({ reset: true })
})

router.get('/settings/models', (_req, res) => {
  const all = getAllSettings()
  res.json({
    defaultSttProvider: all.default_stt_provider || 'openai',
    defaultSummaryModel: all.default_summary_model || 'gpt-4o-mini',
    defaultMapsModel: all.default_maps_model || 'gpt-4o-mini',
    twoPassSummary: all.two_pass_summary !== 'false',
  })
})

router.put('/settings/models', (req, res) => {
  const { defaultSttProvider, defaultSummaryModel, defaultMapsModel, twoPassSummary } = req.body
  if (defaultSttProvider) setSetting('default_stt_provider', defaultSttProvider)
  if (defaultSummaryModel) setSetting('default_summary_model', defaultSummaryModel)
  if (defaultMapsModel) setSetting('default_maps_model', defaultMapsModel)
  if (twoPassSummary !== undefined) setSetting('two_pass_summary', twoPassSummary ? 'true' : 'false')
  if (SETTINGS_PATH) syncToFile(SETTINGS_PATH)
  res.json({ saved: true })
})

export default router
