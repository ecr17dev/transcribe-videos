<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({ job: Object })
const elapsed = ref('00:00')
let timer = null

const steps = [
  { num: 1, label: 'Extrayendo audio', icon: 'audio' },
  { num: 2, label: 'Transcribiendo', icon: 'transcribe' },
  { num: 3, label: 'Resumen y mapa', icon: 'summary' },
]

function startTimer() {
  timer = setInterval(() => {
    if (!props.job?.startedAt) return
    const diff = Math.floor((Date.now() - props.job.startedAt) / 1000)
    const m = String(Math.floor(diff / 60)).padStart(2, '0')
    const s = String(diff % 60).padStart(2, '0')
    elapsed.value = `${m}:${s}`
  }, 500)
}

onMounted(startTimer)
onUnmounted(() => clearInterval(timer))

watch(() => props.job?.startedAt, (val) => {
  if (val && !timer) startTimer()
})

watch(() => props.job?.status, (val) => {
  if (val === 'done' || val === 'error') clearInterval(timer)
})

const barWidth = computed(() => {
  if (!props.job) return 0
  return `${Math.min(props.job.progress || 0, 99)}%`
})

const showShimmer = computed(() => {
  if (!props.job) return false
  return props.job.status === 'extracting' || props.job.status === 'summarizing'
})
</script>

<template>
  <div class="progress-panel">
    <div class="progress-header">
      <span class="timer">{{ elapsed }}</span>
      <span class="status-badge" :class="job.status">{{ job.status }}</span>
    </div>

    <div class="progress-bar-track">
      <div
        class="progress-bar-fill"
        :class="{ shimmer: showShimmer }"
        :style="{ width: barWidth }"
      ></div>
    </div>

    <div class="steps-row">
      <div
        v-for="step in steps"
        :key="step.num"
        :class="['step-card', {
          active: job.step >= step.num,
          current: job.step === step.num,
          done: job.step > step.num
        }]"
      >
        <span class="step-num">
          <span v-if="job.step > step.num">&#10003;</span>
          <span v-else-if="job.step === step.num" class="spinner"></span>
          <span v-else>{{ step.num }}</span>
        </span>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <p class="step-detail">{{ job.stepDetail }}</p>

    <ul v-if="job.subSteps?.length" class="substeps">
      <li
        v-for="(sub, i) in job.subSteps"
        :key="i"
        :class="['substep', { done: sub.done }]"
      >
        <span class="substep-marker">
          <span v-if="sub.done">&#10003;</span>
          <span v-else class="substep-dot"></span>
        </span>
        <span class="substep-text">{{ sub.text }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.progress-panel {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 24px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.timer {
  font-size: 1.1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #c9d1d9;
}

.status-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 10px;
  background: #21262d;
  color: #8b949e;
}

.status-badge.done {
  background: #1a3a2a;
  color: #3fb950;
}

.status-badge.error {
  background: #3a1513;
  color: #f85149;
}

.status-badge.transcribing,
.status-badge.extracting,
.status-badge.summarizing {
  background: #1a2332;
  color: #58a6ff;
}

.progress-bar-track {
  height: 6px;
  background: #21262d;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 20px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #58a6ff, #3fb950);
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-bar-fill.shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.steps-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.step-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #0d1117;
  border: 1px solid #21262d;
  opacity: 0.35;
  transition: all 0.4s;
}

.step-card.active {
  opacity: 1;
}

.step-card.current {
  background: #1a2332;
  border-color: #1f6feb44;
}

.step-card.done {
  background: #0d1a12;
  border-color: #23863633;
}

.step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: #21262d;
  color: #8b949e;
  flex-shrink: 0;
  line-height: 1;
}

.step-card.current .step-num {
  background: #58a6ff;
  color: #fff;
}

.step-card.done .step-num {
  background: #238636;
  color: #fff;
}

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.step-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #c9d1d9;
  white-space: nowrap;
  line-height: 1;
}

.step-detail {
  font-size: 0.8125rem;
  color: #8b949e;
  margin: 0 0 16px;
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.substeps {
  list-style: none;
  padding: 0;
  margin: 0;
}

.substep {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  font-size: 0.8125rem;
  color: #484f58;
  transition: color 0.3s;
}

.substep.done {
  color: #8b949e;
}

.substep-marker {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  border-radius: 50%;
  margin-top: 1px;
}

.substep.done .substep-marker {
  background: #1a3a2a;
  color: #3fb950;
}

.substep-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #30363d;
  animation: blip 1s infinite;
}

@keyframes blip {
  0%, 100% { background: #30363d; }
  50% { background: #58a6ff; }
}

.substep-text {
  line-height: 1.4;
}
</style>
