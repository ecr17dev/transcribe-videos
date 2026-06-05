<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['providers-changed'])

const defaultSttProvider = ref('openai')
const defaultSummaryModel = ref('gpt-4o-mini')
const defaultMapsModel = ref('gpt-4o-mini')
const twoPassSummary = ref(true)
const providers = ref({})
const saving = ref(false)
const saved = ref(false)

const SUMMARY_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Economico y rapido (recomendado)' },
  { id: 'gpt-4o', label: 'GPT-4o', desc: 'Mayor calidad, mas costoso' },
  { id: 'gpt-4.1', label: 'GPT-4.1', desc: 'Ultimo modelo, maxima calidad' },
]

const MAPS_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Economico para mapas mensuales' },
  { id: 'gpt-4o', label: 'GPT-4o', desc: 'Mayor calidad en grafos' },
]

onMounted(async () => {
  try {
    const [settingsRes, providersRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/settings/providers'),
    ])
    const settings = await settingsRes.json()
    const provs = await providersRes.json()
    providers.value = provs

    defaultSttProvider.value = settings.defaultSttProvider || 'openai'
    defaultSummaryModel.value = settings.defaultSummaryModel || 'gpt-4o-mini'
    defaultMapsModel.value = settings.defaultMapsModel || 'gpt-4o-mini'
    twoPassSummary.value = settings.twoPassSummary !== false
  } catch {}
})

async function save() {
  saving.value = true
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultSttProvider: defaultSttProvider.value,
        defaultSummaryModel: defaultSummaryModel.value,
        defaultMapsModel: defaultMapsModel.value,
        twoPassSummary: twoPassSummary.value,
      }),
    })
    saved.value = true
    emit('providers-changed')
    setTimeout(() => { saved.value = false }, 2000)
  } catch {}
  saving.value = false
}

const configuredProviders = () => {
  return Object.entries(providers.value)
    .filter(([_, p]) => p.config?.configured)
    .map(([id, p]) => ({ id, label: p.label }))
}
</script>

<template>
  <div class="model-settings">
    <div class="setting-group">
      <label class="setting-label">Proveedor STT por defecto</label>
      <p class="setting-desc">Proveedor de Speech-to-Text usado para nuevas transcripciones.</p>
      <select v-model="defaultSttProvider" class="setting-select">
        <option
          v-for="p in configuredProviders()"
          :key="p.id"
          :value="p.id"
        >
          {{ p.label }}
        </option>
        <option v-if="configuredProviders().length === 0" value="openai" disabled>
          OpenAI (no configurado)
        </option>
      </select>
    </div>

    <div class="setting-group">
      <label class="setting-label">Modelo para Resumenes</label>
      <p class="setting-desc">Modelo GPT usado para generar resumenes y analisis.</p>
      <div class="model-options">
        <label
          v-for="m in SUMMARY_MODELS"
          :key="m.id"
          class="model-option"
          :class="{ selected: defaultSummaryModel === m.id }"
        >
          <input
            type="radio"
            :value="m.id"
            v-model="defaultSummaryModel"
          />
          <div>
            <span class="model-name">{{ m.label }}</span>
            <span class="model-desc">{{ m.desc }}</span>
          </div>
        </label>
      </div>
    </div>

    <div class="setting-group">
      <label class="setting-label">Resumen en 2 pasos</label>
      <p class="setting-desc">
        Paso 1 extrae datos brutos. Paso 2 los estructura.
        Mejor calidad pero ~2x tokens. Solo aplica a transcripciones >1500 palabras.
      </p>
      <label class="toggle-row">
        <input type="checkbox" v-model="twoPassSummary" />
        <span>Activado</span>
      </label>
    </div>

    <div class="setting-group">
      <label class="setting-label">Modelo para Mapas Mensuales</label>
      <p class="setting-desc">Modelo GPT usado para generar el analisis mensual y grafos.</p>
      <div class="model-options">
        <label
          v-for="m in MAPS_MODELS"
          :key="m.id"
          class="model-option"
          :class="{ selected: defaultMapsModel === m.id }"
        >
          <input
            type="radio"
            :value="m.id"
            v-model="defaultMapsModel"
          />
          <div>
            <span class="model-name">{{ m.label }}</span>
            <span class="model-desc">{{ m.desc }}</span>
          </div>
        </label>
      </div>
    </div>

    <button class="btn-save-all" :disabled="saving" @click="save">
      {{ saving ? 'Guardando...' : 'Guardar preferencias' }}
    </button>
    <span v-if="saved" class="saved-msg">Guardado</span>
  </div>
</template>

<style scoped>
.model-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.setting-desc {
  font-size: 0.75rem;
  color: #8b949e;
  margin: 0;
}

.setting-select {
  width: 100%;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 0.875rem;
  outline: none;
}

.setting-select:focus {
  border-color: #58a6ff;
}

.model-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.model-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #0d1117;
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
  accent-color: #58a6ff;
}

.model-name {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
}

.model-desc {
  font-size: 0.7rem;
  color: #8b949e;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 10px 14px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
}

.toggle-row input {
  accent-color: #58a6ff;
  width: 16px;
  height: 16px;
}

.btn-save-all {
  padding: 10px 20px;
  background: #238636;
  border: 1px solid #238636;
  border-radius: 6px;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  align-self: flex-start;
}

.btn-save-all:hover:not(:disabled) {
  background: #2ea043;
}

.btn-save-all:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.saved-msg {
  font-size: 0.8rem;
  color: #7ee787;
}
</style>
