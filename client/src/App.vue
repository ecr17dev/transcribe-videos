<script setup>
import { ref, computed, watch } from 'vue'
import {
  IconFileText,
  IconSparkles,
  IconLayoutDashboard,
  IconPlayerTrackNext,
  IconSettings,
} from '@tabler/icons-vue'
import { uploadVideo } from './api.js'
import { useJobPolling } from './composables/useJobPolling.js'
import UploadPanel from './components/UploadPanel.vue'
import ProgressTracker from './components/ProgressTracker.vue'
import TranscriptView from './components/TranscriptView.vue'
import SummaryView from './components/SummaryView.vue'
import InfographicView from './components/InfographicView.vue'
import JobHistory from './components/JobHistory.vue'
import SettingsModal from './components/SettingsModal.vue'
import LangSwitcher from './components/LangSwitcher.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const {
  job,
  jobId,
  isProcessing,
  isDone,
  start: startPolling,
  loadComplete,
  reset: resetPolling,
} = useJobPolling()

const screen = ref('upload')
const errorMsg = ref('')
const selectedModel = ref('gpt-4o-mini')
const showSettings = ref(false)
const transcribeOnly = ref(false)
const historyKey = ref(0)
const sttProvider = ref('openai')
const sttModel = ref('whisper-1')
const activeTab = ref('transcript')

const tabs = computed(() => {
  if (!job.value) return []

  const list = [
    { key: 'transcript', label: t('tabs.transcript'), icon: IconFileText },
  ]

  if (job.value.summary) {
    list.push({ key: 'summary', label: t('tabs.summary'), icon: IconSparkles })
  }

  if (job.value.infographicData || job.value.infographic || job.value.summary) {
    list.push({ key: 'infographic', label: t('tabs.infographic'), icon: IconLayoutDashboard })
  }

  return list
})

watch(
  () => job.value,
  (currentJob) => {
    if (!currentJob) return

    const preferredTab = currentJob.infographicData || currentJob.infographic
      ? 'infographic'
      : currentJob.summary
        ? 'summary'
        : 'transcript'

    if (!tabs.value.some((tab) => tab.key === activeTab.value)) {
      activeTab.value = preferredTab
      return
    }

    if (currentJob.status === 'done' && activeTab.value === 'transcript' && preferredTab !== 'transcript') {
      activeTab.value = preferredTab
    }
  },
  { immediate: true }
)

async function onFileSelected(file) {
  errorMsg.value = ''
  try {
    const { jobId: id } = await uploadVideo(
      file,
      selectedModel.value,
      transcribeOnly.value,
      sttProvider.value,
      sttModel.value,
    )
    screen.value = 'results'
    startPolling(id)
  } catch (err) {
    errorMsg.value = err.message
  }
}

async function loadHistoryJob(id) {
  errorMsg.value = ''
  screen.value = 'results'
  activeTab.value = 'transcript'
  await loadComplete(id)
  historyKey.value++
}

async function deleteJob(id) {
  try {
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    historyKey.value++
    if (jobId.value === id) reset()
  } catch {}
}

function reset() {
  resetPolling()
  screen.value = 'upload'
  activeTab.value = 'transcript'
  errorMsg.value = ''
  transcribeOnly.value = false
}

function onProvidersChanged() {
  historyKey.value++
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <img src="/logo.png" alt="TranscribeVideos" class="logo-img" @click="reset" />
      <div class="header-actions">
        <LangSwitcher />
        <button class="settings-btn" @click="showSettings = true" :title="t('app.settings')">
          <IconSettings :size="20" :stroke="1.8" />
        </button>
      </div>
    </header>

    <main class="app-main">
      <div v-if="screen === 'upload'" class="screen upload-screen">
        <UploadPanel
          :model="selectedModel"
          :transcribeOnly="transcribeOnly"
          :sttProvider="sttProvider"
          :sttModel="sttModel"
          @file="onFileSelected"
          @update:model="selectedModel = $event"
          @update:transcribeOnly="transcribeOnly = $event"
          @update:sttProvider="sttProvider = $event"
          @update:sttModel="sttModel = $event"
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
          <button @click="reset" class="btn-back">
            <IconPlayerTrackNext :size="16" />
            <span>{{ t('app.newVideo') }}</span>
          </button>
          <h2 class="video-name">{{ job?.videoName || t('app.processing') }}</h2>
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
              <component :is="tab.icon" :size="16" :stroke="1.8" />
              <span>{{ tab.label }}</span>
            </button>
          </nav>

          <TranscriptView v-if="activeTab === 'transcript'" :text="job.transcript" />
          <SummaryView v-else-if="activeTab === 'summary'" :summary="job.summary" :job-id="job.id" />
          <InfographicView v-else-if="activeTab === 'infographic'" :html="job.infographic" :summary="job.summary" :infographic-data="job.infographicData" />

          <div v-if="job.cost" class="cost-bar">
            <span>{{ t('app.costEstimated') }} <strong>${{ job.cost.total }}</strong></span>
            <span class="cost-detail">
              STT ({{ job.cost.sttProvider || 'openai' }}): ${{ job.cost.stt }}
              | {{ job.model }}: ${{ (job.cost.total - job.cost.stt).toFixed(4) }}
              <template v-if="job.cost.twoPass"> | {{ t('app.twoPass') }}</template>
            </span>
          </div>
        </div>
      </div>
    </main>

    <SettingsModal
      v-if="showSettings"
      @close="showSettings = false"
      @providers-changed="onProvidersChanged"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at top left, rgba(17, 88, 194, 0.18), transparent 24%),
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.14), transparent 18%),
    linear-gradient(180deg, #0a0d12 0%, #0f1117 30%, #11151c 100%);
  color: #e1e4e8;
}

.app-header {
  padding: 16px 32px;
  border-bottom: 1px solid #21262d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-btn {
  background: rgba(17, 22, 32, 0.82);
  border: 1px solid #243043;
  border-radius: 12px;
  color: #7c8798;
  cursor: pointer;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.settings-btn:hover {
  color: #f5f7fb;
  border-color: #3677d6;
  background: rgba(22, 31, 45, 0.92);
  transform: translateY(-1px);
}

.logo-img {
  height: 32px;
  cursor: pointer;
  user-select: none;
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
  padding: 10px 16px;
  background: linear-gradient(180deg, rgba(26, 35, 50, 0.94), rgba(15, 20, 28, 0.96));
  border: 1px solid #28415f;
  color: #dce7fb;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.btn-back:hover {
  background: linear-gradient(180deg, rgba(33, 48, 71, 0.98), rgba(16, 23, 34, 0.98));
}

.video-name {
  font-size: 1rem;
  font-weight: 500;
  color: #8b949e;
  margin: 0;
}

.results-content {
  background: linear-gradient(180deg, rgba(18, 24, 33, 0.98), rgba(15, 20, 28, 0.98));
  border: 1px solid #212a38;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
}

.tabs {
  display: flex;
  border-bottom: 1px solid #212a38;
  background: rgba(9, 13, 20, 0.88);
  padding: 6px;
  gap: 6px;
}

.tab-btn {
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.18s ease;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tab-btn:hover {
  color: #d8e4fb;
  background: rgba(34, 44, 60, 0.72);
}

.tab-btn.active {
  color: #f8fbff;
  background: linear-gradient(180deg, rgba(36, 71, 122, 0.72), rgba(25, 39, 62, 0.9));
  box-shadow: inset 0 0 0 1px rgba(99, 169, 255, 0.3);
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
  background: rgba(7, 10, 16, 0.8);
  border-top: 1px solid #212a38;
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
  color: #667385;
}

@media (max-width: 720px) {
  .app-header {
    padding: 16px 18px;
  }

  .app-main {
    padding: 20px 14px;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tabs {
    overflow-x: auto;
  }

  .cost-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
