import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../data')
const DB_PATH = path.join(DATA_DIR, 'transcriptions.db')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    video_name TEXT NOT NULL,
    model TEXT DEFAULT 'gpt-4o-mini',
    status TEXT DEFAULT 'pending',
    transcript TEXT,
    summary TEXT,
    mindmap TEXT,
    cost TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)

try { db.exec(`ALTER TABLE jobs ADD COLUMN stt_provider TEXT DEFAULT 'openai'`) } catch {}
try { db.exec(`ALTER TABLE jobs ADD COLUMN stt_model TEXT DEFAULT 'whisper-1'`) } catch {}
try { db.exec(`ALTER TABLE jobs ADD COLUMN detailed_summary TEXT`) } catch {}
try { db.exec(`ALTER TABLE jobs ADD COLUMN infographic TEXT`) } catch {}
try { db.exec(`ALTER TABLE jobs ADD COLUMN infographic_data TEXT`) } catch {}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)

export default db

const insertStmt = db.prepare(`
  INSERT INTO jobs (id, video_name, model, status, stt_provider, stt_model, transcript, summary, mindmap, detailed_summary, infographic, infographic_data, cost, error, created_at, updated_at)
  VALUES (@id, @video_name, @model, @status, @stt_provider, @stt_model, @transcript, @summary, @mindmap, @detailed_summary, @infographic, @infographic_data, @cost, @error, @created_at, @updated_at)
`)

const updateStmt = db.prepare(`
  UPDATE jobs SET
    status = @status,
    stt_provider = @stt_provider,
    stt_model = @stt_model,
    transcript = @transcript,
    summary = @summary,
    mindmap = @mindmap,
    detailed_summary = @detailed_summary,
    infographic = @infographic,
    infographic_data = @infographic_data,
    cost = @cost,
    error = @error,
    updated_at = @updated_at
  WHERE id = @id
`)

export function insertJob(job) {
  insertStmt.run({
    id: job.id,
    video_name: job.videoName,
    model: job.model || 'gpt-4o-mini',
    status: job.status,
    stt_provider: job.sttProvider || 'openai',
    stt_model: job.sttModel || 'whisper-1',
    transcript: job.transcript || null,
    summary: job.summary ? JSON.stringify(job.summary) : null,
    mindmap: job.mindmap ? JSON.stringify(job.mindmap) : null,
    detailed_summary: job.detailedSummary ? JSON.stringify(job.detailedSummary) : null,
    infographic: job.infographic || null,
    infographic_data: job.infographicData ? JSON.stringify(job.infographicData) : null,
    cost: job.cost ? JSON.stringify(job.cost) : null,
    error: job.error || null,
    created_at: job.createdAt,
    updated_at: Date.now(),
  })
}

export function updateJob(job) {
  updateStmt.run({
    id: job.id,
    status: job.status,
    stt_provider: job.sttProvider || 'openai',
    stt_model: job.sttModel || 'whisper-1',
    transcript: job.transcript || null,
    summary: job.summary ? JSON.stringify(job.summary) : null,
    mindmap: job.mindmap ? JSON.stringify(job.mindmap) : null,
    detailed_summary: job.detailedSummary ? JSON.stringify(job.detailedSummary) : null,
    infographic: job.infographic || null,
    infographic_data: job.infographicData ? JSON.stringify(job.infographicData) : null,
    cost: job.cost ? JSON.stringify(job.cost) : null,
    error: job.error || null,
    updated_at: Date.now(),
  })
}

export function getAllJobs() {
  const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all()
  return rows.map(rowToJob)
}

export function getJobById(id) {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)
  return row ? rowToJob(row) : null
}

export function deleteJobById(id) {
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id)
}

export function getJobsByMonth(year, month) {
  const start = new Date(year, month - 1, 1).getTime()
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime()
  const rows = db.prepare(
    'SELECT * FROM jobs WHERE status = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC'
  ).all('done', start, end)
  return rows.map(rowToJob)
}

function rowToJob(row) {
  return {
    id: row.id,
    videoName: row.video_name,
    model: row.model,
    status: row.status,
    sttProvider: row.stt_provider || 'openai',
    sttModel: row.stt_model || 'whisper-1',
    transcript: row.transcript || null,
    summary: tryParse(row.summary),
    mindmap: tryParse(row.mindmap),
    detailedSummary: tryParse(row.detailed_summary),
    infographic: row.infographic || null,
    infographicData: tryParse(row.infographic_data),
    cost: tryParse(row.cost),
    error: row.error || null,
    createdAt: row.created_at,
  }
}

function tryParse(str) {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}
