<script setup>
import { ref } from 'vue'

const WHISPER_COST = 0.006
const props = defineProps({ model: String, transcribeOnly: Boolean })
const emit = defineEmits(['file', 'update:model', 'update:transcribeOnly', 'error'])

const dragging = ref(false)
const fileInput = ref(null)

function onDragOver(e) {
  e.preventDefault()
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

function onDrop(e) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}

function onFileChange(e) {
  const file = e.target.files[0]
  if (file) handleFile(file)
}

function handleFile(file) {
  const validTypes = /\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp)$/i
  if (!validTypes.test(file.name)) {
    emit('error', 'Formato no soportado. Usa MP4, MOV, AVI, MKV, etc.')
    return
  }
  if (file.size > 5 * 1024 * 1024 * 1024) {
    emit('error', 'Archivo demasiado grande (maximo 5GB)')
    return
  }
  emit('error', '')
  emit('file', file)
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function estimatedCost(fileSizeBytes) {
  const estDurationMin = (fileSizeBytes / (1024 * 1024 * 10)) * 2
  return Math.max((estDurationMin * WHISPER_COST), 0.01).toFixed(2)
}
</script>

<template>
  <div class="upload-container">
    <div class="upload-header">
      <h2>Sube un video para transcribir</h2>
      <p class="subtitle">Soporta MP4, MOV, AVI, MKV, WebM y mas. Maximo 5GB.</p>
    </div>

    <div
      :class="['dropzone', { dragging }]"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept="video/*"
        class="file-input"
        @change="onFileChange"
      />
      <div class="dropzone-content">
        <svg class="drop-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p class="drop-text">Arrastra un video aqui o haz clic para seleccionar</p>
        <p class="drop-hint">El archivo se procesa localmente en tu servidor</p>
      </div>
    </div>

    <div class="model-selector">
      <label class="model-label">Modelo para el resumen:</label>
      <div class="model-options">
        <label class="model-option" :class="{ selected: props.model === 'gpt-4o-mini' }">
          <input
            type="radio"
            value="gpt-4o-mini"
            :checked="props.model === 'gpt-4o-mini'"
            @change="$emit('update:model', 'gpt-4o-mini')"
          />
          <div class="model-info">
            <span class="model-name">GPT-4o Mini</span>
            <span class="model-desc">Economico y rapido (recomendado)</span>
          </div>
        </label>
        <label class="model-option" :class="{ selected: props.model === 'gpt-4o' }">
          <input
            type="radio"
            value="gpt-4o"
            :checked="props.model === 'gpt-4o'"
            @change="$emit('update:model', 'gpt-4o')"
          />
          <div class="model-info">
            <span class="model-name">GPT-4o</span>
            <span class="model-desc">Mayor calidad, mas costoso</span>
          </div>
        </label>
      </div>
    </div>

    <label class="transcribe-only-toggle">
      <input
        type="checkbox"
        :checked="props.transcribeOnly"
        @change="$emit('update:transcribeOnly', $event.target.checked)"
      />
      <span class="toggle-label">Solo transcribir</span>
      <span class="toggle-desc">Sin resumen ni mapa mental (mas rapido, solo ~$0.36/h)</span>
    </label>
  </div>
</template>

<style scoped>
.upload-container {
  max-width: 600px;
  margin: 0 auto;
}

.upload-header {
  text-align: center;
  margin-bottom: 32px;
}

.upload-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px;
}

.subtitle {
  color: #8b949e;
  font-size: 0.9rem;
  margin: 0;
}

.dropzone {
  border: 2px dashed #30363d;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #161b22;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: #58a6ff;
  background: #1a2332;
}

.file-input {
  display: none;
}

.drop-icon {
  color: #484f58;
  margin-bottom: 16px;
}

.dropzone:hover .drop-icon,
.dropzone.dragging .drop-icon {
  color: #58a6ff;
}

.drop-text {
  font-size: 1rem;
  color: #c9d1d9;
  margin: 0 0 6px;
}

.drop-hint {
  font-size: 0.8125rem;
  color: #484f58;
  margin: 0;
}

.model-selector {
  margin-top: 32px;
}

.model-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #8b949e;
  margin-bottom: 10px;
}

.model-options {
  display: flex;
  gap: 10px;
}

.model-option {
  flex: 1;
  padding: 14px 16px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.model-option:hover {
  border-color: #30363d;
}

.model-option.selected {
  border-color: #58a6ff;
  background: #1a2332;
}

.model-option input {
  display: none;
}

.model-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  color: #c9d1d9;
  margin-bottom: 2px;
}

.model-desc {
  font-size: 0.75rem;
  color: #8b949e;
}

.transcribe-only-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
  margin-top: 16px;
}

.transcribe-only-toggle:hover {
  border-color: #30363d;
}

.transcribe-only-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #58a6ff;
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #c9d1d9;
}

.toggle-desc {
  font-size: 0.75rem;
  color: #484f58;
  margin-left: auto;
}
</style>
