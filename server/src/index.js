import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../..')

try {
  process.loadEnvFile(path.join(ROOT_DIR, '.env'))
} catch {}

import express from 'express'
import cors from 'cors'
import jobsRouter from './routes/jobs.js'
import settingsRouter from './routes/settings.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api', jobsRouter)
app.use('/api', settingsRouter)

const distPath = path.join(ROOT_DIR, 'client/dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const uploadsDir = path.join(ROOT_DIR, 'server/uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)

  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.warn('WARNING: OPENAI_API_KEY not configured. Open settings to add your API key.')
  }
})
