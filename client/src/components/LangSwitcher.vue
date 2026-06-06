<script setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

function toggle() {
  locale.value = locale.value === 'es' ? 'en' : 'es'
  try { localStorage.setItem('locale', locale.value) } catch {}
}
</script>

<template>
  <button @click="toggle" class="lang-switcher" :title="locale === 'es' ? 'Switch to English' : 'Cambiar a Espanol'">
    <span :class="{ active: locale === 'es' }">ES</span>
    <span class="divider">/</span>
    <span :class="{ active: locale === 'en' }">EN</span>
  </button>
</template>

<style scoped>
.lang-switcher {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 6px 10px;
  background: rgba(17, 22, 32, 0.82);
  border: 1px solid #243043;
  border-radius: 10px;
  color: #5c6670;
  cursor: pointer;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.lang-switcher:hover {
  border-color: #3677d6;
  background: rgba(22, 31, 45, 0.92);
}

.lang-switcher .active {
  color: #f5f7fb;
}

.lang-switcher .divider {
  color: #30363d;
  margin: 0 1px;
}
</style>
