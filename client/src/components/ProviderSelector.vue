<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({ provider: String, model: String })
const emit = defineEmits(['update:provider', 'update:model'])

const providers = ref([])
const models = ref([])

const ALL_MODELS = {
  openai: [{ id: 'whisper-1', label: 'Whisper-1' }],
  google: [
    { id: 'latest_long', label: 'Latest Long' },
    { id: 'latest_short', label: 'Latest Short' },
    { id: 'chirp_2', label: 'Chirp 2' },
  ],
  qwen: [
    { id: 'qwen-asr', label: 'Qwen ASR' },
    { id: 'qwen-asr-v2', label: 'Qwen ASR v2' },
  ],
  minimax: [{ id: 'speech-01', label: 'Speech-01' }],
  deepgram: [
    { id: 'nova-3', label: 'Nova-3' },
    { id: 'nova-2', label: 'Nova-2' },
    { id: 'whisper-large-v3', label: 'Whisper Large v3' },
  ],
}

onMounted(async () => {
  try {
    const res = await fetch('/api/settings/providers')
    const data = await res.json()
    providers.value = Object.entries(data)
      .filter(([_, p]) => p.config?.configured)
      .map(([id, p]) => ({ id, label: p.label }))

    if (providers.value.length === 1) {
      emit('update:provider', providers.value[0].id)
    }

    updateModels(props.provider)
  } catch {}
})

function updateModels(providerId) {
  models.value = ALL_MODELS[providerId] || []
  const current = props.model
  if (models.value.length > 0 && !models.value.find(m => m.id === current)) {
    emit('update:model', models.value[0].id)
  }
}

function onProviderChange(id) {
  emit('update:provider', id)
  updateModels(id)
}
</script>

<template>
  <div class="provider-selector">
    <div class="row">
      <label class="sel-label">{{ t('providerSelector.label') }}</label>
      <select
        class="sel"
        :value="props.provider"
        @change="onProviderChange($event.target.value)"
      >
        <option v-for="p in providers" :key="p.id" :value="p.id">
          {{ p.label }}
        </option>
        <option v-if="providers.length === 0" value="" disabled>
          {{ t('providerSelector.empty') }}
        </option>
      </select>

      <select
        v-if="models.length > 0"
        class="sel"
        :value="props.model"
        @change="emit('update:model', $event.target.value)"
      >
        <option v-for="m in models" :key="m.id" :value="m.id">
          {{ m.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.provider-selector {
  margin-top: 24px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sel-label {
  font-size: 0.8125rem;
  color: #8b949e;
  font-weight: 500;
  white-space: nowrap;
}

.sel {
  flex: 1;
  padding: 8px 12px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 0.8125rem;
  outline: none;
  cursor: pointer;
}

.sel:focus {
  border-color: #58a6ff;
}
</style>
