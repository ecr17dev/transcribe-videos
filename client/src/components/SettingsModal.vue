<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProviderSettings from './ProviderSettings.vue'
import PromptSettings from './PromptSettings.vue'
import ModelSettings from './ModelSettings.vue'

const { t } = useI18n()

const emit = defineEmits(['close', 'providersChanged'])

const activeTab = ref('providers')
const apiKeyPreview = ref('')

onMounted(async () => {
  try {
    const res = await fetch('/api/settings')
    const data = await res.json()
    apiKeyPreview.value = data.apiKeyPreview || ''
  } catch {}
})

function onProvidersChanged() {
  emit('providersChanged')
}

const TABS = computed(() => [
  { key: 'providers', label: t('settings.tabs.providers') },
  { key: 'models', label: t('settings.tabs.models') },
  { key: 'prompts', label: t('settings.tabs.prompts') },
])
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ t('settings.heading') }}</h3>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <nav class="modal-tabs">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          :class="['tab', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="modal-body">
        <ProviderSettings
          v-if="activeTab === 'providers'"
          @providers-changed="onProvidersChanged"
        />
        <ModelSettings
          v-if="activeTab === 'models'"
          @providers-changed="onProvidersChanged"
        />
        <PromptSettings v-if="activeTab === 'prompts'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
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
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 680px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
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
  padding: 16px 24px;
  border-bottom: 1px solid #21262d;
  flex-shrink: 0;
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

.modal-tabs {
  display: flex;
  border-bottom: 1px solid #21262d;
  background: #161b22;
  flex-shrink: 0;
}

.tab {
  padding: 10px 20px;
  background: none;
  border: none;
  color: #8b949e;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.tab:hover {
  color: #c9d1d9;
}

.tab.active {
  color: #58a6ff;
  border-bottom-color: #58a6ff;
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}
</style>
