<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['close'])
const apiKey = ref('')
const hasKey = ref(false)
const keyPreview = ref('')
const saving = ref(false)
const testing = ref(false)
const testResult = ref(null)
const error = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/api/settings')
    const data = await res.json()
    hasKey.value = data.hasApiKey
    keyPreview.value = data.apiKeyPreview || ''
  } catch {}
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openaiApiKey: apiKey.value.trim() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    hasKey.value = true
    keyPreview.value = data.apiKeyPreview
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  error.value = ''
  testing.value = true
  testResult.value = null
  try {
    const res = await fetch('/api/settings/test', { method: 'POST' })
    const data = await res.json()
    testResult.value = data
  } catch (err) {
    testResult.value = { success: false, error: err.message }
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>Configuracion</h3>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div class="setting-group">
          <label class="setting-label">OpenAI API Key</label>
          <p class="setting-desc">
            Necesaria para transcribir y generar resumenes.
            <a href="https://platform.openai.com/api-keys" target="_blank">Obtener API key</a>
          </p>

          <input
            v-model="apiKey"
            type="password"
            class="setting-input"
            :placeholder="hasKey ? keyPreview : 'sk-...'"
            autocomplete="off"
          />

          <div class="setting-actions">
            <button class="btn btn-primary" :disabled="!apiKey.trim() || saving" @click="save">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
            <button
              class="btn btn-secondary"
              :disabled="!hasKey && !apiKey.trim() || testing"
              @click="testConnection"
            >
              {{ testing ? 'Probando...' : 'Probar conexion' }}
            </button>
          </div>

          <p v-if="error" class="setting-error">{{ error }}</p>

          <div v-if="testResult" :class="['test-result', { success: testResult.success }]">
            <template v-if="testResult.success">
              Conectado a OpenAI. {{ testResult.totalModels }} modelos disponibles.
            </template>
            <template v-else>
              Error: {{ testResult.error }}
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 480px;
  max-width: 90vw;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #21262d;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: #c9d1d9;
}

.modal-body {
  padding: 24px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.setting-desc {
  font-size: 0.8125rem;
  color: #8b949e;
  margin: 0;
}

.setting-desc a {
  color: #58a6ff;
}

.setting-input {
  width: 100%;
  padding: 10px 14px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 0.875rem;
  font-family: monospace;
  outline: none;
  transition: border-color 0.15s;
}

.setting-input:focus {
  border-color: #58a6ff;
}

.setting-input::placeholder {
  color: #484f58;
  font-family: monospace;
}

.setting-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.btn {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: #238636;
  border-color: #238636;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #2ea043;
}

.btn-secondary {
  background: #21262d;
  border-color: #30363d;
  color: #c9d1d9;
}

.btn-secondary:hover:not(:disabled) {
  background: #30363d;
}

.setting-error {
  color: #f85149;
  font-size: 0.8125rem;
  margin: 0;
}

.test-result {
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 0.8125rem;
  background: #1f0c0b;
  color: #f85149;
  border: 1px solid #3a1513;
}

.test-result.success {
  background: #0d1a12;
  color: #7ee787;
  border-color: #23863633;
}
</style>
