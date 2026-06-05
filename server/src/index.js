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
import { assertMediaBinariesAvailable } from './services/media-binaries.js'

const app = express()
const desiredPort = parseInt(process.env.PORT || '3001', 10)

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

try {
  const media = assertMediaBinariesAvailable()
  console.log(`Media binaries ready (${media.source}): ffmpeg=${media.ffmpegPath} ffprobe=${media.ffprobePath}`)
} catch (error) {
  console.error('Media dependency check failed.')
  console.error(error.message)
  process.exit(1)
}

async function startServer(port, retries = 20) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const actualPort = server.address().port
      console.log(`Server running on http://localhost:${actualPort}`)

      if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.warn('WARNING: OPENAI_API_KEY not configured. Open settings to add your API key.')
      }
      resolve(actualPort)
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && retries > 0) {
        server.close()
        startServer(port + 1, retries - 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
  })
}

startServer(desiredPort).catch((err) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
