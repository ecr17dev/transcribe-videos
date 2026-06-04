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

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)
`)

const insertStmt = db.prepare(`
  INSERT INTO jobs (id, video_name, model, status, transcript, summary, mindmap, cost, error, created_at, updated_at)
  VALUES (@id, @video_name, @model, @status, @transcript, @summary, @mindmap, @cost, @error, @created_at, @updated_at)
`)

const updateStmt = db.prepare(`
  UPDATE jobs SET
    status = @status,
    transcript = @transcript,
    summary = @summary,
    mindmap = @mindmap,
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
    transcript: job.transcript || null,
    summary: job.summary ? JSON.stringify(job.summary) : null,
    mindmap: job.mindmap ? JSON.stringify(job.mindmap) : null,
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
    transcript: job.transcript || null,
    summary: job.summary ? JSON.stringify(job.summary) : null,
    mindmap: job.mindmap ? JSON.stringify(job.mindmap) : null,
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

function rowToJob(row) {
  return {
    id: row.id,
    videoName: row.video_name,
    model: row.model,
    status: row.status,
    transcript: row.transcript || null,
    summary: tryParse(row.summary),
    mindmap: tryParse(row.mindmap),
    cost: tryParse(row.cost),
    error: row.error || null,
    createdAt: row.created_at,
  }
}

function tryParse(str) {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}
