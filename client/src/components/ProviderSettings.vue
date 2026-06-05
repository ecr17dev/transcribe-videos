<script setup>
import { ref, onMounted } from 'vue'

const providers = ref({})
const editedKeys = ref({})
const testing = ref({})
const testResults = ref({})
const errors = ref({})

const FIELDS = {
  openai: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }],
  google: [{ key: 'credentialsJson', label: 'Credentials JSON', type: 'textarea', placeholder: '{"type": "service_account", ...}' }],
  qwen: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' }],
  minimax: [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'ey...' },
    { key: 'groupId', label: 'Group ID', type: 'text', placeholder: 'Grupo...' },
  ],
  deepgram: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Token...' }],
}

onMounted(async () => {
  try {
    const res = await fetch('/api/settings/providers')
    const data = await res.json()
    providers.value = data
    for (const [id, p] of Object.entries(data)) {
      if (p.config?.apiKey) {
        editedKeys.value[id] = { ...p.config }
      } else {
        editedKeys.value[id] = {}
      }
    }
  } catch {}
})

async function saveProvider(id) {
  errors.value[id] = ''
  const body = editedKeys.value[id] || {}
  try {
    const res = await fetch(`/api/settings/providers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    providers.value[id].config.configured = true
    providers.value[id].config = { ...providers.value[id].config, ...body }
  } catch (err) {
    errors.value[id] = err.message
  }
}

async function testProvider(id) {
  testing.value[id] = true
  testResults.value[id] = null
  try {
    const res = await fetch(`/api/settings/providers/${id}/test`, { method: 'POST' })
    testResults.value[id] = await res.json()
  } catch (err) {
    testResults.value[id] = { success: false, error: err.message }
  } finally {
    testing.value[id] = false
  }
}

async function deleteProvider(id) {
  editedKeys.value[id] = {}
  providers.value[id].config.configured = false
  await fetch(`/api/settings/providers/${id}`, { method: 'DELETE' })
}

function hasConfig(id) {
  return providers.value[id]?.config?.configured
}

function getMaskedPlaceholder(id, field) {
  const config = providers.value[id]?.config || {}

  if (field.key === 'apiKey' && config.apiKeyPreview) {
    return `${config.apiKeyPreview} hidden`
  }

  if (field.key === 'credentialsJson' && config.configured) {
    return 'credentials hidden'
  }

  if (field.key === 'groupId' && config.configured) {
    return 'group id hidden'
  }

  return field.placeholder
}

function getFieldValue(id, fieldKey) {
  return editedKeys.value[id]?.[fieldKey] || ''
}

function updateField(id, fieldKey, value) {
  if (!editedKeys.value[id]) editedKeys.value[id] = {}
  editedKeys.value[id][fieldKey] = value
}
</script>

<template>
  <div class="provider-settings">
    <div
      v-for="(provider, id) in providers"
      :key="id"
      class="provider-card"
      :class="{ configured: provider.config?.configured }"
    >
      <div class="provider-header">
        <div class="provider-name">
          <span class="status-dot" :class="{ active: provider.config?.configured }" />
          <strong>{{ provider.label }}</strong>
        </div>
        <span v-if="provider.config?.configured" class="badge configured-badge">Configurado</span>
        <span v-else class="badge not-configured">Sin configurar</span>
      </div>

      <div class="provider-fields">
        <template v-for="field in FIELDS[id]" :key="field.key">
          <label class="field-label">{{ field.label }}</label>

          <input
            v-if="field.type === 'password' || field.type === 'text'"
            :type="field.type"
            class="field-input"
            :placeholder="getMaskedPlaceholder(id, field)"
            :value="getFieldValue(id, field.key)"
            @input="e => updateField(id, field.key, e.target.value)"
            autocomplete="off"
          />

          <textarea
            v-else-if="field.type === 'textarea'"
            class="field-textarea"
            :placeholder="getMaskedPlaceholder(id, field)"
            rows="4"
            :value="getFieldValue(id, field.key)"
            @input="e => updateField(id, field.key, e.target.value)"
          />
        </template>
      </div>

      <div class="provider-actions">
        <button class="btn btn-save" @click="saveProvider(id)">Guardar</button>
        <button
          class="btn btn-test"
          :disabled="!hasConfig(id) || testing[id]"
          @click="testProvider(id)"
        >
          {{ testing[id] ? 'Probando...' : 'Probar' }}
        </button>
        <button
          v-if="hasConfig(id)"
          class="btn btn-delete"
          @click="deleteProvider(id)"
        >
          Eliminar
        </button>
      </div>

      <p v-if="errors[id]" class="provider-error">{{ errors[id] }}</p>

      <div v-if="testResults[id]" :class="['test-result', { success: testResults[id].success }]">
        <template v-if="testResults[id].success">
          Conexion exitosa
          <span v-if="testResults[id].models">
            - Whisper: {{ testResults[id].models.whisper ? 'Si' : 'No' }},
            GPT: {{ testResults[id].models.gpt4oMini ? 'Si' : 'No' }}
          </span>
          <span v-if="testResults[id].projects !== undefined">
            - {{ testResults[id].projects }} proyectos
          </span>
        </template>
        <template v-else>
          Error: {{ testResults[id].error }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.provider-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 18px;
  transition: border-color 0.15s;
}

.provider-card.configured {
  border-color: #23863633;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.provider-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #30363d;
}

.status-dot.active {
  background: #3fb950;
}

.badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.configured-badge {
  background: #0d1a12;
  color: #7ee787;
  border: 1px solid #23863633;
}

.not-configured {
  background: #1a2332;
  color: #8b949e;
  border: 1px solid #21262d;
}

.provider-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.field-label {
  font-size: 0.75rem;
  color: #8b949e;
  font-weight: 500;
  margin-top: 4px;
}

.field-input {
  width: 100%;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 0.8125rem;
  font-family: monospace;
  outline: none;
}

.field-input:focus {
  border-color: #58a6ff;
}

.field-textarea {
  width: 100%;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 0.75rem;
  font-family: monospace;
  outline: none;
  resize: vertical;
}

.field-textarea:focus {
  border-color: #58a6ff;
}

.provider-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-save {
  background: #238636;
  border-color: #238636;
  color: #fff;
}

.btn-save:hover:not(:disabled) {
  background: #2ea043;
}

.btn-test {
  background: #21262d;
  border-color: #30363d;
  color: #c9d1d9;
}

.btn-test:hover:not(:disabled) {
  background: #30363d;
}

.btn-delete {
  background: transparent;
  border-color: #3a1513;
  color: #f85149;
}

.btn-delete:hover {
  background: #1f0c0b;
}

.provider-error {
  color: #f85149;
  font-size: 0.75rem;
  margin: 8px 0 0;
}

.test-result {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
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
