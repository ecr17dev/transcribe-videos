<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const emit = defineEmits(['select', 'delete'])
const history = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/jobs')
    history.value = await res.json()
  } catch {
    history.value = []
  } finally {
    loading.value = false
  }
})

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d

  if (diff < 60000) return t('history.now')
  if (diff < 3600000) return t('history.minAgo', { n: Math.floor(diff / 60000) })
  if (diff < 86400000) return t('history.hourAgo', { n: Math.floor(diff / 3600000) })
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(s) {
  const map = {
    done: t('history.status.done'),
    error: t('history.status.error'),
    extracting: t('history.status.extracting'),
    transcribing: t('history.status.transcribing'),
    summarizing: t('history.status.summarizing'),
    pending: t('history.status.pending'),
  }
  return map[s] || s
}
</script>

<template>
  <div v-if="history.length > 0" class="history">
    <h3 class="history-title">{{ t('history.heading') }}</h3>

    <div v-if="loading" class="loading">{{ t('history.loading') }}</div>

    <div v-else class="history-list">
      <div
        v-for="item in history"
        :key="item.id"
        :class="['history-item', item.status]"
        @click="emit('select', item.id)"
      >
        <div class="item-main">
          <span class="item-name">{{ item.videoName }}</span>
          <span class="item-date">{{ formatDate(item.createdAt) }}</span>
        </div>
        <div class="item-meta">
          <span :class="['item-status', item.status]">{{ statusLabel(item.status) }}</span>
          <span v-if="item.cost" class="item-cost">${{ item.cost.total }}</span>
          <button
            class="item-delete"
            @click.stop="emit('delete', item.id)"
            :title="t('history.delete')"
          >&#10005;</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history {
  margin-top: 40px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.history-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px;
}

.loading {
  font-size: 0.8125rem;
  color: #484f58;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.history-item:hover {
  border-color: #30363d;
  background: #1c2128;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #c9d1d9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.item-date {
  font-size: 0.75rem;
  color: #484f58;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.item-status {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  background: #21262d;
  color: #8b949e;
}

.item-status.done {
  background: #1a3a2a;
  color: #3fb950;
}

.item-status.error {
  background: #3a1513;
  color: #f85149;
}

.item-cost {
  font-size: 0.75rem;
  color: #7ee787;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.item-delete {
  background: none;
  border: none;
  color: #30363d;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.item-delete:hover {
  color: #f85149;
}
</style>
