<script setup>
import { ref, computed, nextTick } from 'vue'
import { uploadVideo, getJob } from './api.js'
import UploadPanel from './components/UploadPanel.vue'
import ProgressTracker from './components/ProgressTracker.vue'
import TranscriptView from './components/TranscriptView.vue'
import SummaryView from './components/SummaryView.vue'
import MindMap from './components/MindMap.vue'
import JobHistory from './components/JobHistory.vue'

const screen = ref('upload')
const jobId = ref(null)
const job = ref(null)
const errorMsg = ref('')
const selectedModel = ref('gpt-4o-mini')
const transcribeOnly = ref(false)
const historyKey = ref(0)

const tabs = computed(() => {
  if (!job.value) return []
  const list = [{ key: 'transcript', label: 'Transcripcion' }]
  if (job.value.summary || job.value.mindmap) {
    list.push({ key: 'summary', label: 'Resumen' })
    list.push({ key: 'mindmap', label: 'Mapa Mental' })
  }
  return list
})
const activeTab = ref('transcript')

let pollTimer = null

const isProcessing = ref(false)
const isDone = ref(false)
const isError = ref(false)

async function onFileSelected(file) {
  errorMsg.value = ''
  try {
    const { jobId: id } = await uploadVideo(file, selectedModel.value, transcribeOnly.value)
    jobId.value = id
    screen.value = 'results'
    isProcessing.value = true
    isDone.value = false
    isError.value = false
    startPolling()
  } catch (err) {
    errorMsg.value = err.message
  }
}

function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const data = await getJob(jobId.value)
      job.value = data
      isProcessing.value = data.status !== 'done' && data.status !== 'error'
      isDone.value = data.status === 'done'
      isError.value = data.status === 'error'

      if (data.status === 'done' || data.status === 'error') {
        clearInterval(pollTimer)
        pollTimer = null
        historyKey.value++
      }
    } catch {
      errorMsg.value = 'Error al obtener el estado'
      clearInterval(pollTimer)
    }
  }, 2500)
}

async function loadHistoryJob(id) {
  clearInterval(pollTimer)
  pollTimer = null
  errorMsg.value = ''

  try {
    const data = await getJob(id)
    jobId.value = id
    job.value = data
    screen.value = 'results'
    isProcessing.value = false
    isDone.value = data.status === 'done'
    isError.value = data.status === 'error'
    activeTab.value = 'transcript'
  } catch (err) {
    errorMsg.value = 'No se pudo cargar la transcripcion'
  }
}

async function deleteJob(id) {
  try {
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    historyKey.value++
    if (jobId.value === id) reset()
  } catch {}
}

function reset() {
  clearInterval(pollTimer)
  pollTimer = null
  jobId.value = null
  job.value = null
  screen.value = 'upload'
  activeTab.value = 'transcript'
  errorMsg.value = ''
  isProcessing.value = false
  isDone.value = false
  isError.value = false
  transcribeOnly.value = false
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 @click="reset" class="logo">Transcribe<span class="accent">Videos</span></h1>
    </header>

    <main class="app-main">
      <div v-if="screen === 'upload'" class="screen upload-screen">
        <UploadPanel
          :model="selectedModel"
          :transcribeOnly="transcribeOnly"
          @file="onFileSelected"
          @update:model="selectedModel = $event"
          @update:transcribeOnly="transcribeOnly = $event"
          @error="errorMsg = $event"
        />
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <JobHistory
          :key="historyKey"
          @select="loadHistoryJob"
          @delete="deleteJob"
        />
      </div>

      <div v-else class="screen results-screen">
        <div class="results-header">
          <button @click="reset" class="btn-back">Nuevo video</button>
          <h2 class="video-name">{{ job?.videoName || 'Procesando...' }}</h2>
        </div>

        <ProgressTracker v-if="job && isProcessing" :job="job" />

        <p v-if="job?.error" class="error-msg">{{ job.error }}</p>

        <div v-if="job && isDone" class="results-content">
          <nav class="tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="['tab-btn', { active: activeTab === tab.key }]"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>

          <TranscriptView v-if="activeTab === 'transcript'" :text="job.transcript" />
          <SummaryView v-else-if="activeTab === 'summary'" :summary="job.summary" />
          <MindMap v-else :data="job.mindmap" />

          <div v-if="job.cost" class="cost-bar">
            <span>Coste estimado: <strong>${{ job.cost.total }}</strong></span>
            <span class="cost-detail">
              Whisper: ${{ job.cost.whisper }} | {{ job.model }}: ${{ (job.cost.total - job.cost.whisper).toFixed(4) }}
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f1117;
  color: #e1e4e8;
}

.app-header {
  padding: 16px 32px;
  border-bottom: 1px solid #21262d;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  cursor: pointer;
  letter-spacing: -0.02em;
}

.logo .accent {
  color: #58a6ff;
}

.app-main {
  flex: 1;
  padding: 32px;
  max-width: 1100px;
  width: 100%;
  margin: 0 auto;
}

.screen {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.results-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-back {
  padding: 8px 16px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
}

.btn-back:hover {
  background: #30363d;
}

.video-name {
  font-size: 1rem;
  font-weight: 500;
  color: #8b949e;
  margin: 0;
}

.results-content {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #21262d;
  background: #0d1117;
}

.tab-btn {
  padding: 12px 20px;
  background: none;
  border: none;
  color: #8b949e;
  font-size: 0.875rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  font-weight: 500;
}

.tab-btn:hover {
  color: #c9d1d9;
}

.tab-btn.active {
  color: #58a6ff;
  border-bottom-color: #58a6ff;
}

.error-msg {
  color: #f85149;
  font-size: 0.875rem;
  padding: 12px 16px;
  background: #1f0c0b;
  border: 1px solid #3a1513;
  border-radius: 6px;
  margin-top: 12px;
}

.cost-bar {
  padding: 12px 20px;
  background: #0d1117;
  border-top: 1px solid #21262d;
  font-size: 0.8125rem;
  color: #8b949e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cost-bar strong {
  color: #7ee787;
}

.cost-detail {
  color: #484f58;
}
</style>
