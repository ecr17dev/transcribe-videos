<script setup>
import { ref } from 'vue'

const props = defineProps({ text: String })

const copied = ref(false)

async function copyText() {
  if (!props.text) return
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = props.text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
</script>

<template>
  <div class="transcript-view">
    <div class="toolbar">
      <span class="label">Transcripcion completa</span>
      <button @click="copyText" class="btn-copy">
        {{ copied ? 'Copiado' : 'Copiar texto' }}
      </button>
    </div>
    <div class="transcript-content">
      <p v-if="!text" class="empty">No hay transcripcion disponible</p>
      <div v-else class="transcript-text" v-text="text"></div>
    </div>
  </div>
</template>

<style scoped>
.transcript-view {
  padding: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #21262d;
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
}

.btn-copy {
  padding: 6px 14px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8125rem;
  transition: all 0.15s;
}

.btn-copy:hover {
  background: #30363d;
  color: #58a6ff;
}

.transcript-content {
  padding: 20px;
  max-height: 550px;
  overflow-y: auto;
}

.transcript-text {
  font-size: 0.9rem;
  line-height: 1.75;
  color: #c9d1d9;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.empty {
  color: #484f58;
  font-style: italic;
}
</style>
