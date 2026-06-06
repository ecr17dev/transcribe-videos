<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const promptKeys = computed(() => [
  { key: 'prompt_extraction', label: t('promptSettings.extraction'), desc: t('promptSettings.extractionDesc') },
  { key: 'prompt_structuring', label: t('promptSettings.structuring'), desc: t('promptSettings.structuringDesc') },
  { key: 'prompt_legacy_summary', label: t('promptSettings.singlePass'), desc: t('promptSettings.singlePassDesc') },
  { key: 'prompt_infographic', label: t('promptSettings.infographic'), desc: t('promptSettings.infographicDesc') },
])

const prompts = ref({})
const editing = ref({})
const saving = ref({})
const savedMsg = ref({})

onMounted(async () => {
  try {
    const res = await fetch('/api/settings/prompts')
    const data = await res.json()
    prompts.value = data
    for (const key of Object.keys(data)) {
      editing.value[key] = data[key].current
    }
  } catch {}
})

async function savePrompt(key) {
  saving.value[key] = true
  try {
    const res = await fetch('/api/settings/prompts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: editing.value[key] }),
    })
    if (!res.ok) throw new Error(t('promptSettings.error'))
    prompts.value[key].current = editing.value[key]
    prompts.value[key].custom = true
    savedMsg.value[key] = true
    setTimeout(() => { savedMsg.value[key] = false }, 2000)
  } catch {}
  saving.value[key] = false
}

async function resetPrompt(key) {
  await fetch('/api/settings/prompts/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: [key] }),
  })
  prompts.value[key].current = prompts.value[key].default
  prompts.value[key].custom = false
  editing.value[key] = prompts.value[key].default
  savedMsg.value[key] = true
  setTimeout(() => { savedMsg.value[key] = false }, 2000)
}

function charCount(key) {
  return (editing.value[key] || '').length
}
</script>

<template>
  <div class="prompt-settings">
    <div
      v-for="p in promptKeys"
      :key="p.key"
      class="prompt-card"
    >
      <div class="prompt-header">
        <div class="prompt-title">
          <strong>{{ p.label }}</strong>
          <span v-if="prompts[p.key]?.custom" class="custom-badge">{{ t('promptSettings.custom') }}</span>
          <span v-else class="default-badge">{{ t('promptSettings.default') }}</span>
        </div>
        <span class="char-counter">{{ charCount(p.key).toLocaleString() }}{{ t('promptSettings.chars') }}</span>
      </div>

      <p class="prompt-desc">{{ p.desc }}</p>

      <textarea
        class="prompt-textarea"
        :value="editing[p.key]"
        @input="e => editing[p.key] = e.target.value"
        rows="14"
        spellcheck="false"
      />

      <div class="prompt-actions">
        <button class="btn btn-save" :disabled="saving[p.key]" @click="savePrompt(p.key)">
          {{ saving[p.key] ? t('promptSettings.saving') : t('promptSettings.save') }}
        </button>
        <button
          v-if="prompts[p.key]?.custom"
          class="btn btn-reset"
          @click="resetPrompt(p.key)"
        >
          {{ t('promptSettings.restore') }}
        </button>
        <span v-if="savedMsg[p.key]" class="saved-msg">{{ t('promptSettings.saved') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.prompt-card {
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 18px;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.prompt-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.custom-badge {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 8px;
  background: #1a2e1a;
  color: #7ee787;
  border: 1px solid #23863633;
}

.default-badge {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 8px;
  background: #21262d;
  color: #8b949e;
}

.char-counter {
  font-size: 0.7rem;
  color: #484f58;
  font-family: monospace;
}

.prompt-desc {
  font-size: 0.75rem;
  color: #8b949e;
  margin: 0 0 10px;
}

.prompt-textarea {
  width: 100%;
  padding: 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 0.75rem;
  font-family: monospace;
  line-height: 1.5;
  outline: none;
  resize: vertical;
}

.prompt-textarea:focus {
  border-color: #58a6ff;
}

.prompt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
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

.btn-reset {
  background: #21262d;
  border-color: #30363d;
  color: #c9d1d9;
}

.btn-reset:hover {
  background: #30363d;
}

.saved-msg {
  font-size: 0.75rem;
  color: #7ee787;
  margin-left: 8px;
}
</style>
