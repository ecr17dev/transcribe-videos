# TranscribeVideos

**Upload a video, get a full transcript, an executive summary, and an interactive mind map — powered by OpenAI Whisper and GPT.**

A fullstack app (Node.js + Vue 3) that extracts audio from videos, transcribes them via Whisper-1, and generates structured AI summaries with GPT-4o-mini. Designed to be **cost-efficient** (~$0.74 for a 2-hour video) and **ADHD-friendly** with collapsible visual mind maps.

---

## Features

- **Video Upload** — Drag & drop MP4, MOV, AVI, MKV, WebM and more (up to 5GB).
- **Full Transcription** — OpenAI Whisper-1 with automatic chunking for videos over 25MB.
- **AI Executive Summary** — Structured sections: main idea, topics, key insights, conclusions, action items, stats and hard data, design decisions.
- **Interactive Mind Map** — Hierarchical tree with collapsible nodes, color-coded branches, and focus mode (double-click a branch to dim the rest).
- **Transcribe-Only Mode** — Skip summarization for faster, cheaper results (~$0.36/h).
- **Cost Transparency** — Live cost breakdown: Whisper vs GPT usage and tokens.
- **Job History** — SQLite-backed persistence. Past transcriptions survive server restarts.
- **Live Progress** — Elapsed timer, step-by-step sub-tasks with checkmarks, shimmer animation during processing.
- **Dark Theme** — Clean, distraction-free UI.

## Screenshots

<img width="100%" alt="image" src="https://github.com/user-attachments/assets/487fc2b6-0050-4e18-b279-27f60020a9fc" />


## Architecture

```
transcribe-videos/
├── server/                         # Backend (Express + Node.js)
│   ├── src/
│   │   ├── index.js                # Server entry point
│   │   ├── routes/
│   │   │   └── jobs.js             # REST API endpoints
│   │   └── services/
│   │       ├── extractAudio.js     # ffmpeg: video → mp3
│   │       ├── transcribe.js       # OpenAI Whisper-1 + chunking
│   │       ├── summarize.js        # GPT-4o-mini: summary + mind map
│   │       └── database.js         # SQLite persistence (better-sqlite3)
│   └── uploads/                    # Temporary video/audio files (auto-cleaned)
├── client/                         # Frontend (Vue 3 + Vite)
│   ├── src/
│   │   ├── App.vue                 # Root component + screen router
│   │   ├── api.js                  # Fetch wrapper for backend
│   │   └── components/
│   │       ├── UploadPanel.vue     # Drag & drop + settings
│   │       ├── ProgressTracker.vue # Live progress + sub-steps
│   │       ├── TranscriptView.vue  # Full transcript text
│   │       ├── SummaryView.vue     # Structured summary sections
│   │       ├── MindMap.vue         # Interactive mind map container
│   │       ├── MindMapNode.vue     # Recursive tree node
│   │       └── JobHistory.vue      # Past transcription list
│   └── dist/                       # Production build (served by Express)
├── scripts/
│   └── test.js                     # OpenAI API connectivity check
├── package.json                    # Root scripts (build, start, dev, test)
└── .env.example                    # Environment variables template
```

### Data Flow

```
[Video upload] → POST /api/jobs
       │
       ▼
┌─ Step 1 ──────────────────────────────────────────┐
│  ffmpeg: extract audio track → MP3 32kbps mono    │
│  Duration detected via ffprobe                     │
└───────────────────────────────────────────────────┘
       │
       ▼
┌─ Step 2 ──────────────────────────────────────────┐
│  If MP3 > 25MB: split into ≤24MB chunks           │
│  Each chunk → OpenAI Whisper-1 ($0.006/min)       │
│  Results concatenated into full transcript         │
└───────────────────────────────────────────────────┘
       │
       ▼
┌─ Step 3 (optional, skipped in transcribe-only) ───┐
│  GPT-4o-mini: single call produces:                │
│  → Structured executive summary                    │
│  → Hierarchical mind map (8-20 branches, 3-5 lvls)│
│  Cost: ~$0.02 for a 2-hour transcript              │
└───────────────────────────────────────────────────┘
       │
       ▼
  [Frontend polls GET /api/jobs/:id every 2.5s]
  [Results rendered when status = "done"]
```

## Prerequisites

- **Node.js** 24+ (LTS)
- **ffmpeg** installed and available in PATH
- **OpenAI API key** ([get one here](https://platform.openai.com/api-keys))

### Install ffmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg
```

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ecr17dev/transcribe-videos.git
cd transcribe-videos

# 2. Install dependencies (root + server + client)
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 3. Configure your OpenAI API key
cp .env.example .env
# Edit .env and add your key:
#   OPENAI_API_KEY=sk-your-key-here

# 4. Verify OpenAI connectivity
npm test

# 5. Install ffmpeg (see above)

# 6. Start the app
npm start
# Open http://localhost:3001
```

### Development Mode

```bash
npm run dev
# Backend:  http://localhost:3001 (with --watch, auto-reload)
# Frontend: http://localhost:5173 (Vite HMR, proxies API to :3001)
```

## API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs` | Upload a video and start processing |
| `GET` | `/api/jobs` | List all transcription jobs (history) |
| `GET` | `/api/jobs/:id` | Get job status and results |
| `DELETE` | `/api/jobs/:id` | Delete a transcription job |

### POST /api/jobs

Upload a video file as `multipart/form-data`.

**Fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `video` | File | Yes | — | Video file (max 5GB) |
| `model` | String | No | `gpt-4o-mini` | GPT model for summary (`gpt-4o-mini` or `gpt-4o`) |
| `transcribeOnly` | String | No | `false` | Set to `"true"` to skip summarization |

**Response:** `{ "jobId": "uuid-string" }`

### GET /api/jobs/:id

Poll for job progress.

**Response:**

```json
{
  "id": "uuid",
  "status": "transcribing",
  "step": 2,
  "progress": 46,
  "stepDetail": "Fragmento 3 de 5...",
  "subSteps": [
    { "text": "Audio extraido: 1h 23m", "done": true },
    { "text": "Transcribiendo fragmento 3 de 5", "done": false }
  ],
  "transcript": null,
  "summary": null,
  "mindmap": null,
  "cost": null,
  "error": null,
  "videoName": "meeting.mp4",
  "model": "gpt-4o-mini",
  "startedAt": 1717536000000
}
```

**Status values:** `extracting` → `transcribing` → `summarizing` → `done` | `error`

When `done`, the response includes `transcript` (string), `summary` (object), `mindmap` (object), and `cost` (object with whisper, gpt, total, and token counts).

## Cost Estimation

| Component | Rate | 1-hour video | 2-hour video |
|-----------|------|-------------|-------------|
| **Whisper-1** (transcription) | $0.006/min | ~$0.36 | ~$0.72 |
| **GPT-4o Mini** (summary) | $0.15/1M input tokens | ~$0.01 | ~$0.02 |
| **Total** | | **~$0.37** | **~$0.74** |

With **Transcribe-Only** mode enabled, only Whisper costs apply: ~$0.36/h.

> Costs are estimates. Actual costs depend on audio duration and transcript length. The app displays a detailed breakdown after each job.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24 |
| Backend | Express 4 |
| Frontend | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 6 |
| Audio | ffmpeg (fluent-ffmpeg) |
| Transcription | OpenAI Whisper-1 |
| Summarization | OpenAI GPT-4o Mini / GPT-4o |
| Database | SQLite (better-sqlite3, WAL mode) |
| File Upload | Multer |

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Esteban Cortés](https://github.com/ecr17dev)

---

**Built with** [OpenAI](https://openai.com), [Vue.js](https://vuejs.org), [Express](https://expressjs.com), and [ffmpeg](https://ffmpeg.org).
