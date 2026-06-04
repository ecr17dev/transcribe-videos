<script setup>
import { ref } from 'vue'

const props = defineProps({ summary: Object })

const copied = ref(false)

async function copySummary() {
  if (!props.summary) return
  let text = ''

  if (props.summary.one_liner) text += `${props.summary.one_liner}\n\n`
  if (props.summary.main_idea && !props.summary.one_liner) text += `Idea central:\n${props.summary.main_idea}\n\n`

  if (props.summary.executive_paragraph) {
    text += `${props.summary.executive_paragraph}\n\n`
  }

  if (props.summary.topics?.length) {
    text += 'Temas tratados:\n'
    props.summary.topics.forEach(t => { text += `  • ${t.title}: ${t.description}\n` })
    text += '\n'
  }

  if (props.summary.stats_and_facts?.length) {
    text += 'Datos y cifras:\n'
    props.summary.stats_and_facts.forEach(s => { text += `  • ${s}\n` })
    text += '\n'
  }

  if (props.summary.key_decisions?.length) {
    text += 'Decisiones clave:\n'
    props.summary.key_decisions.forEach(d => { text += `  • ${d}\n` })
    text += '\n'
  }

  if (props.summary.key_insights?.length) {
    text += 'Puntos clave:\n'
    props.summary.key_insights.forEach(k => { text += `  • ${k}\n` })
    text += '\n'
  }

  if (props.summary.conclusions?.length) {
    text += 'Conclusiones:\n'
    props.summary.conclusions.forEach(c => { text += `  • ${c}\n` })
    text += '\n'
  }

  if (props.summary.action_items?.length) {
    text += 'Acciones / Proximos pasos:\n'
    props.summary.action_items.forEach(a => { text += `  • ${a}\n` })
  }

  try {
    await navigator.clipboard.writeText(text.trim())
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}
</script>

<template>
  <div class="summary-view">
    <div class="toolbar">
      <span class="label">Resumen ejecutivo</span>
      <button @click="copySummary" class="btn-copy">
        {{ copied ? 'Copiado' : 'Copiar resumen' }}
      </button>
    </div>

    <div v-if="!summary" class="empty-state">No hay resumen disponible</div>

    <div v-else class="summary-content">
      <section v-if="summary.one_liner || summary.main_idea" class="section main-idea">
        <h3>{{ summary.one_liner ? 'En una frase' : 'Idea central' }}</h3>
        <p>{{ summary.one_liner || summary.main_idea }}</p>
      </section>

      <section v-if="summary.executive_paragraph" class="section exec-paragraph">
        <h3>Resumen ejecutivo</h3>
        <p>{{ summary.executive_paragraph }}</p>
      </section>

      <section v-if="summary.topics?.length" class="section">
        <h3>Temas tratados</h3>
        <ul class="topic-list">
          <li v-for="(t, i) in summary.topics" :key="i">
            <strong>{{ t.title }}</strong>
            <p>{{ t.description }}</p>
          </li>
        </ul>
      </section>

      <section v-if="summary.stats_and_facts?.length" class="section stats-section">
        <h3>Datos y cifras</h3>
        <ul class="stats-list">
          <li v-for="(s, i) in summary.stats_and_facts" :key="i">{{ s }}</li>
        </ul>
      </section>

      <section v-if="summary.key_decisions?.length" class="section">
        <h3>Decisiones clave</h3>
        <ul>
          <li v-for="(d, i) in summary.key_decisions" :key="i">{{ d }}</li>
        </ul>
      </section>

      <section v-if="summary.key_insights?.length" class="section">
        <h3>Puntos clave</h3>
        <ul>
          <li v-for="(k, i) in summary.key_insights" :key="i">{{ k }}</li>
        </ul>
      </section>

      <section v-if="summary.conclusions?.length" class="section">
        <h3>Conclusiones</h3>
        <ul>
          <li v-for="(c, i) in summary.conclusions" :key="i">{{ c }}</li>
        </ul>
      </section>

      <section v-if="summary.action_items?.length" class="section">
        <h3>Acciones / Proximos pasos</h3>
        <ul>
          <li v-for="(a, i) in summary.action_items" :key="i" class="action-item">{{ a }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.summary-view {
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

.empty-state {
  padding: 40px;
  text-align: center;
  color: #484f58;
  font-style: italic;
}

.summary-content {
  padding: 20px 24px;
  max-height: 550px;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
}

.section h3 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #58a6ff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 10px;
}

.main-idea {
  background: #1a2332;
  border-left: 3px solid #58a6ff;
  padding: 14px 18px;
  border-radius: 0 6px 6px 0;
}

.main-idea h3 {
  margin-top: 0;
}

.main-idea p {
  font-size: 1rem;
  line-height: 1.6;
  color: #c9d1d9;
  margin: 0;
}

.section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.section li {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #c9d1d9;
  padding: 6px 0;
  padding-left: 16px;
  position: relative;
}

.section li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #30363d;
}

.action-item::before {
  background: #d29922 !important;
}

.exec-paragraph {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 8px;
  padding: 16px 18px;
}

.exec-paragraph p {
  font-size: 0.9rem;
  line-height: 1.7;
  color: #c9d1d9;
  margin: 0;
}

.stats-section ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 6px;
}

.stats-section li {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #7ee787;
}

.stats-section li::before {
  display: none;
}

.topic-list li {
  padding: 10px 0 10px 16px;
}

.topic-list li strong {
  display: block;
  margin-bottom: 2px;
  color: #e6edf3;
}

.topic-list li p {
  margin: 0;
  font-size: 0.8125rem;
  color: #8b949e;
}
</style>
