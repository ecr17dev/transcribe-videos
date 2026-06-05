<script setup>
import { ref } from 'vue'
import {
  IconCloudUpload,
  IconBolt,
  IconSparkles,
  IconPlayerSkipForward,
} from '@tabler/icons-vue'
import ProviderSelector from './ProviderSelector.vue'

const props = defineProps({
  model: String,
  transcribeOnly: Boolean,
  sttProvider: String,
  sttModel: String,
})

const emit = defineEmits([
  'file', 'error',
  'update:model', 'update:transcribeOnly',
  'update:sttProvider', 'update:sttModel',
])

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
  const validTypes = /\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp|mp3|wav|m4a|ogg|flac|opus|aac|wma)$/i
  if (!validTypes.test(file.name)) {
    emit('error', 'Formato no soportado. Usa video (MP4, MOV) o audio (MP3, WAV, M4A, etc.)')
    return
  }
  if (file.size > 5 * 1024 * 1024 * 1024) {
    emit('error', 'Archivo demasiado grande (maximo 5GB)')
    return
  }
  emit('error', '')
  emit('file', file)
}
</script>

<template>
  <div class="upload-container">
    <div class="upload-header">
      <h2>Sube un video o audio para transcribir</h2>
      <p class="subtitle">Genera una transcripcion clara, un resumen util y una infografia visual lista para presentar.</p>
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
        accept="video/*,audio/*"
        class="file-input"
        @change="onFileChange"
      />
      <div class="dropzone-content">
        <IconCloudUpload class="drop-icon" :size="50" :stroke="1.5" />
        <p class="drop-text">Arrastra un archivo aqui o haz clic para seleccionar</p>
        <p class="drop-hint">Soporta video y audio hasta 5 GB. El procesamiento queda en tu instancia.</p>
      </div>
    </div>

    <ProviderSelector
      :provider="props.sttProvider"
      :model="props.sttModel"
      @update:provider="emit('update:sttProvider', $event)"
      @update:model="emit('update:sttModel', $event)"
    />

    <div class="model-selector">
      <label class="model-label">Modelo para analisis e infografia:</label>
      <div class="model-options">
        <label class="model-option" :class="{ selected: props.model === 'gpt-4o-mini' }">
          <input
            type="radio"
            value="gpt-4o-mini"
            :checked="props.model === 'gpt-4o-mini'"
            @change="$emit('update:model', 'gpt-4o-mini')"
          />
          <div class="model-info">
            <span class="model-name"><IconBolt :size="15" /> GPT-4o Mini</span>
            <span class="model-desc">Mas rapido y economico para iterar.</span>
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
            <span class="model-name"><IconSparkles :size="15" /> GPT-4o</span>
            <span class="model-desc">Mayor calidad para piezas visuales mas finas.</span>
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
      <span class="toggle-label"><IconPlayerSkipForward :size="15" /> Solo transcribir</span>
      <span class="toggle-desc">Sin resumen ni infografia</span>
    </label>
  </div>
</template>

<style scoped>
.upload-container {
  max-width: 640px;
  margin: 0 auto;
}

.upload-header {
  text-align: center;
  margin-bottom: 32px;
}

.upload-header h2 {
  font-size: 1.7rem;
  font-weight: 600;
  margin: 0 0 10px;
}

.subtitle {
  color: #8b949e;
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.6;
}

.dropzone {
  border: 2px dashed #2e3f58;
  border-radius: 20px;
  padding: 56px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background:
    radial-gradient(circle at top, rgba(48, 124, 231, 0.16), transparent 30%),
    linear-gradient(180deg, rgba(19, 27, 39, 0.96), rgba(14, 20, 29, 0.98));
}

.dropzone:hover,
.dropzone.dragging {
  border-color: #58a6ff;
  background:
    radial-gradient(circle at top, rgba(67, 142, 248, 0.22), transparent 30%),
    linear-gradient(180deg, rgba(24, 34, 49, 0.98), rgba(16, 24, 35, 0.98));
  transform: translateY(-1px);
}

.file-input {
  display: none;
}

.drop-icon {
  color: #7ca9df;
  margin-bottom: 16px;
}

.drop-text {
  font-size: 1rem;
  color: #e6edf8;
  margin: 0 0 8px;
}

.drop-hint {
  font-size: 0.84rem;
  color: #92a2b6;
  margin: 0;
}

.model-selector {
  margin-top: 24px;
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
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.model-option:hover {
  border-color: #35537d;
}

.model-option.selected {
  border-color: #58a6ff;
  background: #18273a;
}

.model-option input {
  display: none;
}

.model-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #c9d1d9;
  margin-bottom: 4px;
}

.model-desc {
  display: block;
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
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s;
  margin-top: 16px;
}

.transcribe-only-toggle:hover {
  border-color: #35537d;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toggle-desc {
  font-size: 0.75rem;
  color: #7b8798;
  margin-left: auto;
}

@media (max-width: 720px) {
  .model-options {
    flex-direction: column;
  }

  .transcribe-only-toggle {
    flex-wrap: wrap;
  }

  .toggle-desc {
    margin-left: 0;
    width: 100%;
  }
}
</style>
