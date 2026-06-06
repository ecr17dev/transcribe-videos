import { createI18n } from 'vue-i18n'
import es from './locales/es.js'
import en from './locales/en.js'

function getSavedLocale() {
  try {
    const stored = localStorage.getItem('locale')
    if (stored === 'en' || stored === 'es') return stored
  } catch {}
  return 'es'
}

const i18n = createI18n({
  legacy: false,
  locale: getSavedLocale(),
  fallbackLocale: 'es',
  messages: { es, en },
})

export default i18n
