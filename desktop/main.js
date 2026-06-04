import { app, BrowserWindow, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

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
  try {
    execSync('npx -y electron-rebuild -f -w better-sqlite3', {
      cwd: serverDir,
      stdio: 'pipe',
      timeout: 60000,
    })
  } catch {
    console.warn('electron-rebuild skipped (binary may already be compatible)')
  }
}

async function startServer() {
  rebuildSqliteForElectron()

  const settings = loadSettings()

  const ffmpegPath = (await import('@ffmpeg-installer/ffmpeg')).default.path
  const ffprobePath = (await import('@ffprobe-installer/ffprobe')).default.path

  process.env.FFMPEG_PATH = ffmpegPath
  process.env.FFPROBE_PATH = ffprobePath
  process.env.OPENAI_API_KEY = settings.openaiApiKey || ''
  process.env.SETTINGS_PATH = SETTINGS_PATH
  process.env.PORT = process.env.PORT || '3001'
  process.env.ELECTRON_RUN = '1'

  const serverEntry = resolvePath('server/src/index.js')
  const serverRoot = resolvePath('server')
  process.chdir(serverRoot)

  try {
    await import(serverEntry)
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
