<p align="center">
  <img src="logo.png" alt="TranscribeVideos" width="420" />
</p>

<p align="center">
  <strong>Upload a video, get a full transcript, an executive report, and a professional infographic — powered by AI.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node.js" />
  <img src="https://img.shields.io/badge/vue-3.x-4fc08d" alt="Vue.js" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
</p>

---

## Overview

**TranscribeVideos** is a fullstack application that extracts audio from video files, transcribes them using your choice of 5 STT providers, and generates structured AI summaries with dual-pass extraction plus professional infographics with charts and data tables. Export results to **PDF** or **Word** with one click.

Designed to be **cost-efficient** (~$0.02 for a 2-hour video with GPT-4o-mini summarization) and ADHD-friendly with visual infographics and color-coded sections.

---

## Demo

<p align="center">
  <a href="https://www.youtube.com/watch?v=t7agGJNNN_c" target="_blank" rel="noopener">
    <img src="https://img.youtube.com/vi/t7agGJNNN_c/maxresdefault.jpg" alt="TranscribeVideos Demo" width="720" style="max-width:100%; border-radius:12px;" />
  </a>
</p>

---

## Features

### Transcription
- **5 STT providers** — OpenAI Whisper, Google Cloud STT, Deepgram, Qwen/DashScope, MiniMax. Configure your own API keys per provider.
- **Automatic chunking** — Files over 24 MB are split into segments and transcribed in parallel.
- **Multi-format support** — MP4, MOV, AVI, MKV, WebM, FLV, WMV, M4V, 3GP (video) and MP3, WAV, M4A, OGG, FLAC, OPUS, AAC, WMA (audio).

### AI Summary (Two-Pass Extraction)
- **Pass 1 — Exhaustive extraction** — Every fact, number, decision, example, and topic is extracted from the raw transcript.
- **Pass 2 — Structured analysis** — The extracted data is organized into a detailed JSON with:
  - **Main idea** — one powerful sentence
  - **Topics** (15–35) — each with title and detailed description
  - **Key insights** (8–18) — with concrete data points
  - **Conclusions** (5–12) — assertion + justification
  - **Action items** — tasks, deadlines, owners
  - **Stats & facts** — numbers, percentages, metrics
  - **Key decisions** — decisions made and their rationale
  - **Executive summary** — 8–12 sentence paragraph plus key takeaways

### Professional Infographic
- AI-generated structured data rendered with **Chart.js** (bar/doughnut charts)
- Metric cards with trend indicators
- Data tables for stats and figures
- Topic deep-dive sections with icons and key points
- Visual timeline of content flow
- Conclusion panel with takeaways and next steps

### Export
- **PDF** — High-quality export of both the summary report and infographic (via html2pdf.js)
- **Word (.docx)** — Formatted document with cover page, stats, all sections, and tables
- **HTML** — Raw infographic HTML for embedding elsewhere

### UX
- **Dark theme** — Clean, distraction-free interface
- **Live progress** — Step-by-step sub-tasks with checkmarks and elapsed timer
- **Transcribe-only mode** — Skip summarization for faster, cheaper results
- **Cost transparency** — Detailed breakdown: STT cost + GPT tokens + total
- **Job history** — SQLite-backed persistence. Past jobs survive server restarts
- **Configurable prompts** — Customize the extraction, structuring, and infographic AI prompts via the Settings panel
- **Settings panel** — Configure API keys per provider, default models, language, and prompt overrides

### Desktop App
- **Electron wrapper** — Native macOS/Windows app that bundles ffmpeg/ffprobe binaries
- No external dependencies needed for end users

---

## Screenshots

> ASCII mockups representing the three main result views

```
 ─── Upload ───────────────────────────────────────────
│                                                        │
│   [Drag & drop your video here]                        │
│                                                        │
│   STT Provider: [OpenAI Whisper ▼]  Model: [gpt-4o-mini ▼] │
│   □ Transcribe only (skip summary)                     │
│                                                        │
│   ─── History ────────────────────────────────────    │
│   meeting-01.mp4       Done    $0.74    2h ago         │
│   conference.mp4       Done    $1.23    Yesterday      │
```

```
 ─── Processing ───────────────────────────────────────
│                                                        │
│   ← New Video    meeting-01.mp4        00:03:42        │
│   ████████████░░░░░░░░░░░░░░  46%  [transcribing]     │
│                                                        │
│   ✓ Analyzing video file...                            │
│   ✓ Extracting audio track...                          │
│   ✓ Encoding to optimal format (16kHz, mono)...        │
│   ✓ Audio ready: 1h 23m duration                       │
│   ● Transcribing chunk 3 of 5...                       │
│   ○ Generating executive summary...                    │
│   ○ Creating infographic...                            │
```

```
 ─── Results ──────────────────────────────────────────
│  [Transcript]  [Summary]  [Infographic]      [PDF] [Word] │
│                                                        │
│  ┌─ Stats ───────────────────────────────────────┐   │
│  │  24 Topics  │  12 Insights  │  6 Actions  │ ... │   │
│  └───────────────────────────────────────────────┘   │
│                                                        │
│  ┌─ Key Takeaways ───────────────────────────────┐   │
│  │  01  Revenue grew 27% YoY driven by APAC...   │   │
│  │  02  Customer churn dropped to 4.2% after...   │   │
│  └───────────────────────────────────────────────┘   │
│                                                        │
│  ┌─ Topics ───────────────────────────────────────┐  │
│  │  01 Market expansion strategy  │  02 Q3 roadmap │  │
│  │  03 Hiring plan for 2026      │  04 Budget...   │  │
│  └───────────────────────────────────────────────┘   │
│                                                        │
│  Cost: $0.74 (Whisper: $0.72 + GPT: $0.02)            │
```

---

## Architecture

```
transcribe-videos/
├── server/                              # Backend (Express + Node.js)
│   └── src/
│       ├── index.js                     # Server entry point (dynamic port)
│       ├── routes/
│       │   ├── jobs.js                  # REST API: upload, poll, export, delete
│       │   └── settings.js             # GET/PUT settings & provider config
│       └── services/
│           ├── extractAudio.js          # ffmpeg: video → MP3 extraction
│           ├── media-binaries.js        # ffmpeg/ffprobe binary resolution
│           ├── database.js             # SQLite persistence (better-sqlite3, WAL)
│           ├── settings-store.js       # Settings CRUD from SQLite
│           ├── exportDocx.js           # Word (.docx) document generation
│           ├── transcribe/
│           │   ├── index.js            # Multi-provider orchestration
│           │   ├── openai.js           # OpenAI Whisper provider
│           │   ├── google.js           # Google Cloud STT provider
│           │   ├── qwen.js             # Qwen / DashScope provider
│           │   ├── minimax.js          # MiniMax provider
│           │   └── deepgram.js         # Deepgram provider
│           └── summarize/
│               ├── index.js            # Two-pass summary orchestration
│               ├── defaults.js         # AI prompts (extraction, structuring, infographic)
│               └── infographic-data.js # Structured infographic data generation
├── client/                              # Frontend (Vue 3 + Vite)
│   ├── src/
│   │   ├── App.vue                     # Root component + screen router
│   │   ├── api.js                      # Fetch wrapper for all endpoints
│   │   ├── style.css                   # Global styles & dark theme
│   │   ├── composables/
│   │   │   └── useJobPolling.js        # Reactive polling composable
│   │   └── components/
│   │       ├── UploadPanel.vue         # Drag & drop file upload + settings
│   │       ├── ProgressTracker.vue     # Live progress with sub-steps
│   │       ├── TranscriptView.vue      # Full transcript display
│   │       ├── SummaryView.vue         # Professional executive report
│   │       ├── InfographicView.vue     # Chart.js infographic with export
│   │       ├── JobHistory.vue          # Past transcription list
│   │       ├── SettingsModal.vue       # Settings & provider config
│   │       ├── ProviderSettings.vue    # API key config per STT provider
│   │       ├── ModelSettings.vue       # Default model selection
│   │       ├── ProviderSelector.vue    # STT provider picker
│   │       └── PromptSettings.vue      # Custom AI prompt editor
│   └── dist/                           # Production build (served by Express)
├── desktop/                             # Electron desktop app wrapper
│   ├── main.js                         # Electron main process
│   ├── preload.js                      # Context bridge
│   └── electron-builder.yml           # Build config for macOS/Windows
├── scripts/
│   └── test.js                         # OpenAI API connectivity check
├── .env.example                        # Environment variables template
└── package.json                        # Root scripts (build, start, dev, desktop)
```

### Data Flow

```
[Video upload] → POST /api/jobs
       │
       ▼
┌─ Step 1: Audio Extraction ─────────────────────────────┐
│  ffmpeg: extract audio track → MP3 (32kbps, mono, 16kHz)│
│  Duration detected via ffprobe                          │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌─ Step 2: Transcription ────────────────────────────────┐
│  If MP3 > 24 MB: split into chunks                     │
│  Each chunk → selected STT provider:                   │
│    • OpenAI Whisper ($0.006/min)                       │
│    • Google Cloud STT ($0.016/min)                     │
│    • Deepgram ($0.0125/min)                            │
│    • Qwen/DashScope ($0.004/min)                       │
│    • MiniMax ($0.003/min)                              │
│  Results concatenated into full transcript             │
│  Retry logic: 3 attempts per chunk                     │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌─ Step 3: Summarization (skipped if transcribe-only) ───┐
│  Two-pass mode (default for transcripts > 1500 words): │
│    Pass 1: extractData() — exhaustive raw extraction   │
│    Pass 2: structureData() — structured JSON output    │
│                                                        │
│  Single-pass fallback for short transcripts            │
│  Model: GPT-4o-mini or GPT-4o                          │
└────────────────────────────────────────────────────────┘
       │
       ▼
┌─ Step 4: Infographic Generation ───────────────────────┐
│  AI generates structured JSON data:                    │
│    • Hero section, metric cards, chart configs         │
│    • Data tables, topic deep-dives, timeline           │
│    • Conclusion with takeaways and next steps          │
│                                                        │
│  Rendered client-side with Chart.js and SVG icons      │
│  Fallback: legacy GPT-generated HTML                   │
└────────────────────────────────────────────────────────┘
       │
       ▼
   [Frontend polls GET /api/jobs/:id every 2.5s]
   [Results displayed with 3 tabs: Transcript, Summary, Infographic]
   [Export: PDF (html2pdf.js) and Word (docx)]
```

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **OpenAI API key** — [Get one here](https://platform.openai.com/api-keys)
- **ffmpeg** (optional for standalone server) — the server bundles precompiled binaries for most platforms

### Optional: Additional STT Providers

| Provider | API Key Required | Get Key |
|----------|:---:|--------|
| OpenAI Whisper | Yes | [platform.openai.com](https://platform.openai.com/api-keys) |
| Google Cloud STT | Yes | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |
| Deepgram | Yes | [console.deepgram.com](https://console.deepgram.com) |
| Qwen / DashScope | Yes | [dashscope.aliyun.com](https://dashscope.aliyun.com) |
| MiniMax | Yes | [minimax.io](https://minimax.io) |

### Install ffmpeg (only if bundled binaries fail)

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ecr17dev/transcribe-videos.git
cd transcribe-videos

# 2. Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 3. Configure your OpenAI API key (required)
cp .env.example .env
# Edit .env and add your key:
#   OPENAI_API_KEY=sk-your-key-here

# 4. Verify connectivity
npm test

# 5. Start the app (builds client + starts server)
npm start
# Open http://localhost:3001
```

### Development Mode

```bash
npm run dev
# Backend:  http://localhost:3001 (with --watch, auto-reload)
# Frontend: http://localhost:5173 (Vite HMR, proxies /api to backend)
```

### Desktop App

```bash
# Install desktop dependencies (with native module rebuild)
npm run desktop:install

# Run in development mode
npm run desktop:dev

# Build for macOS
npm run desktop:build:mac

# Build for Windows
npm run desktop:build:win
```

---

## Configuration

Edit `.env` to configure the server:

```env
# Required: OpenAI API key
OPENAI_API_KEY=sk-your-key-here

# Optional: Server port (default: 3001, falls back to next available if busy)
PORT=3001

# Optional: Vite proxy target port for development
SERVER_PORT=3001
```

Additional STT provider API keys and settings are configured via the in-app Settings panel (gear icon). These are persisted in the SQLite database and survive server restarts.

### Configurable Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default STT provider | Speech-to-text engine to use | OpenAI |
| Default summary model | GPT model for summarization | gpt-4o-mini |
| Two-pass summary | Use dual-pass extraction + structuring | Enabled |
| Default language | Prompt language preference | Spanish |
| Extraction prompt | Custom prompt for Pass 1 (data extraction) | — |
| Structuring prompt | Custom prompt for Pass 2 (JSON structuring) | — |
| Infographic prompt | Custom prompt for legacy HTML infographic | — |

---

## API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs` | Upload a video and start processing |
| `GET` | `/api/jobs` | List all transcription jobs (history) |
| `GET` | `/api/jobs/:id` | Get job status and results |
| `DELETE` | `/api/jobs/:id` | Delete a transcription job |
| `GET` | `/api/jobs/:id/export/docx` | Download Word (.docx) report |
| `GET` | `/api/jobs/:id/export/html` | Download printable HTML report |
| `GET` | `/api/settings` | Get all settings |
| `PUT` | `/api/settings` | Update settings |

### POST /api/jobs

Upload a video file as `multipart/form-data`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `video` | File | Yes | — | Video/audio file (max 5 GB) |
| `model` | String | No | `gpt-4o-mini` | GPT model for summary (`gpt-4o-mini`, `gpt-4o`) |
| `transcribeOnly` | String | No | `false` | Set to `"true"` to skip summarization |
| `sttProvider` | String | No | `openai` | STT provider: `openai`, `google`, `deepgram`, `qwen`, `minimax` |
| `sttModel` | String | No | `whisper-1` | Provider-specific model identifier |

**Response:** `{ "jobId": "uuid-string" }`

### GET /api/jobs/:id

Poll for job progress and retrieve results.

**Response (processing):**

```json
{
  "id": "uuid",
  "status": "transcribing",
  "step": 2,
  "progress": 46,
  "stepDetail": "Chunk 3 of 5...",
  "subSteps": [
    { "text": "Audio ready: 1h 23m", "done": true },
    { "text": "Transcribing chunk 3 of 5", "done": false }
  ],
  "transcript": null,
  "summary": null,
  "infographic": null,
  "infographicData": null,
  "detailedSummary": null,
  "cost": null,
  "error": null,
  "videoName": "meeting.mp4",
  "model": "gpt-4o-mini",
  "sttProvider": "openai",
  "sttModel": "whisper-1",
  "startedAt": 1717536000000
}
```

**When `status === "done"`, additional fields:**

- `transcript` — Full transcription text
- `summary` — Normalized summary object (topics, insights, conclusions, etc.)
- `detailedSummary` — Raw JSON from AI (with `detailed_breakdown` and `executive_summary`)
- `infographic` — Legacy GPT-generated HTML (fallback)
- `infographicData` — Structured JSON for the Chart.js infographic
- `cost` — Breakdown: `{ stt, gpt, total, durationMinutes, inputTokens, outputTokens, twoPass }`

**Status values:** `extracting` → `transcribing` → `summarizing` → `done` | `error`

---

## Cost Estimation

### STT (Speech-to-Text)

| Provider | Cost per minute | 1-hour video | 2-hour video |
|----------|----------------|-------------|-------------|
| MiniMax | $0.003 | ~$0.18 | ~$0.36 |
| Qwen / DashScope | $0.004 | ~$0.24 | ~$0.48 |
| **OpenAI Whisper** | **$0.006** | **~$0.36** | **~$0.72** |
| Deepgram | $0.0125 | ~$0.75 | ~$1.50 |
| Google Cloud STT | $0.016 | ~$0.96 | ~$1.92 |

### Summarization (GPT)

| Model | Input tokens (1K) | Output tokens (1K) | Typical cost for 2h video |
|-------|-------------------|---------------------|---------------------------|
| **GPT-4o Mini** | **$0.00015** | **$0.0006** | **~$0.02** |
| GPT-4o | $0.0025 | $0.01 | ~$0.25 |

### Infographic

| Model | Typical cost |
|-------|-------------|
| GPT-4o Mini | ~$0.01 |

### Total (examples)

| Provider | Model | Mode | 1-hour | 2-hour |
|----------|-------|------|--------|--------|
| OpenAI Whisper | GPT-4o Mini | Full | ~$0.39 | ~$0.77 |
| OpenAI Whisper | GPT-4o Mini | Transcribe-only | ~$0.36 | ~$0.72 |
| MiniMax | GPT-4o Mini | Full | ~$0.21 | ~$0.39 |
| Qwen | GPT-4o Mini | Full | ~$0.27 | ~$0.51 |

> Costs are estimates based on API pricing. Actual costs depend on audio duration, transcript length, and token usage. The app displays a detailed breakdown after each job completes, including per-provider STT cost, GPT input/output token counts, and whether two-pass summarization was used.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Backend | Express 4 |
| Frontend | Vue 3 (Composition API, `<script setup>`) |
| Build | Vite 6 |
| STT Providers | OpenAI Whisper, Google Cloud STT, Deepgram, Qwen/DashScope, MiniMax |
| AI Summarization | OpenAI GPT-4o Mini / GPT-4o |
| Charts | Chart.js 4 |
| PDF Export | html2pdf.js |
| Word Export | docx |
| Icons | Tabler Icons |
| Audio Processing | ffmpeg (fluent-ffmpeg) |
| Database | SQLite (better-sqlite3, WAL mode) |
| File Upload | Multer |
| Desktop | Electron 35 |

---

## Contributing

Contributions are welcome and appreciated. Here's how to get started:

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'feat: add amazing feature'`
4. Push to your fork: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

Please ensure your code follows the existing style conventions and includes relevant tests when applicable.

---

## License

MIT © [Esteban Cortés](https://github.com/ecr17dev)

---

<p align="center">
  Built with
  <a href="https://openai.com">OpenAI</a>,
  <a href="https://vuejs.org">Vue.js</a>,
  <a href="https://expressjs.com">Express</a>,
  <a href="https://ffmpeg.org">ffmpeg</a>,
  and
  <a href="https://www.chartjs.org">Chart.js</a>
</p>
