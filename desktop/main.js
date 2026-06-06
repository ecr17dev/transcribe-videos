import { app, BrowserWindow, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

const USER_DATA = app.getPath('userData')
const SETTINGS_PATH = path.join(USER_DATA, 'settings.json')

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf8')
      return JSON.parse(raw)
    }
  } catch {}
  return {}
}

function resolvePath(relativePath) {
  if (isDev) return path.resolve(__dirname, '..', relativePath)
  return path.join(process.resourcesPath, relativePath)
}

function rebuildSqliteForElectron() {
  const serverDir = resolvePath('server')
  const electronDir = path.resolve(__dirname, 'node_modules', 'electron')
  try {
    execSync(`npx -y electron-rebuild -f -w better-sqlite3 -e "${electronDir}"`, {
      cwd: serverDir,
      stdio: 'pipe',
      timeout: 60000,
    })
  } catch (e) {
    console.warn('electron-rebuild failed, trying fallback...', e.message?.slice(0, 80))
  }
}

async function startServer() {
  if (isDev) rebuildSqliteForElectron()

  const settings = loadSettings()

  // Load all provider API keys from settings
  if (settings.provider_openai) {
    try {
      const c = JSON.parse(settings.provider_openai)
      process.env.OPENAI_API_KEY = c.apiKey || ''
    } catch {}
  } else if (settings.openaiApiKey) {
    process.env.OPENAI_API_KEY = settings.openaiApiKey
  }

  process.env.SETTINGS_PATH = SETTINGS_PATH
  process.env.PORT = process.env.PORT || '6969'
  process.env.ELECTRON_RUN = '1'

  const serverRoot = resolvePath('server')
  const serverEntry = path.join(serverRoot, 'src/index.js')
  const mediaBinariesEntry = path.join(serverRoot, 'src/services/media-binaries.js')
  process.chdir(serverRoot)

  try {
    const { resolveMediaBinaries } = await import(pathToFileURL(mediaBinariesEntry).href)
    const media = resolveMediaBinaries({ forceRefresh: true })

    process.env.FFMPEG_PATH = media.ffmpegPath
    process.env.FFPROBE_PATH = media.ffprobePath

    console.log(`Media binaries ready (${media.source}): ffmpeg=${media.ffmpegPath} ffprobe=${media.ffprobePath}`)
    await import(pathToFileURL(serverEntry).href)
    console.log('Server started on port', process.env.PORT)
  } catch (err) {
    console.error('Failed to start server:', err)
    dialog.showErrorBox('Startup Error', `Failed to start the server:\n${err.message}`)
    app.quit()
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'TranscribeVideos',
    backgroundColor: '#0f1117',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.once('ready-to-show', () => win.show())

  const url = `http://localhost:${process.env.PORT || 3001}`
  win.loadURL(url)

  win.on('closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

app.whenReady().then(async () => {
  try {
    await startServer()
  } catch (err) {
    dialog.showErrorBox('Fatal Error', err.message)
    app.quit()
    return
  }

  setTimeout(createWindow, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
