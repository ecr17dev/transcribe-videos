<script setup>
import { ref } from 'vue'
import html2pdf from 'html2pdf.js'
import {
  IconSparkles,
  IconListDetails,
  IconBulb,
  IconChecklist,
  IconChartBar,
  IconScale,
  IconDatabase,
  IconClipboardText,
  IconFileDownload,
  IconFileTypeDocx,
  IconFileTypePdf,
  IconTargetArrow,
  IconCheck,
  IconArrowRight,
  IconGavel,
} from '@tabler/icons-vue'

const props = defineProps({ summary: Object, jobId: String })

const exporting = ref(false)
const exportLabel = ref('')

const statsCards = [
  { key: 'topics', label: 'Temas', icon: IconListDetails, color: '#5ab2ff' },
  { key: 'key_insights', label: 'Insights', icon: IconBulb, color: '#5ce1a8' },
  { key: 'key_takeaways', label: 'Takeaways', icon: IconBulb, color: '#ffc857' },
  { key: 'conclusions', label: 'Conclusiones', icon: IconScale, color: '#ff7a59' },
  { key: 'action_items', label: 'Acciones', icon: IconChecklist, color: '#a78bfa' },
  { key: 'stats_and_facts', label: 'Datos', icon: IconDatabase, color: '#f472b6' },
]

function getCount(key) {
  const val = props.summary?.[key]
  return Array.isArray(val) ? val.length : 0
}

const visibleStats = statsCards.filter(s => getCount(s.key) > 0)

const showTopics = props.summary?.topics?.length > 0
const showStatsFacts = props.summary?.stats_and_facts?.length > 0
const showKeyInsights = props.summary?.key_insights?.length > 0
const showKeyTakeaways = props.summary?.key_takeaways?.length > 0
const showConclusions = props.summary?.conclusions?.length > 0
const showDecisions = props.summary?.key_decisions?.length > 0
const showActions = props.summary?.action_items?.length > 0

async function downloadPDF() {
  const el = document.getElementById('summary-export-content')
  if (!el) return

  exporting.value = true
  exportLabel.value = 'Generando PDF...'

  const opt = {
    margin: [10, 10, 10, 10],
    filename: 'informe_resumen.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      backgroundColor: '#0f1419',
      logging: false,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }

  try {
    await html2pdf().set(opt).from(el).save()
  } catch {}
  exporting.value = false
  exportLabel.value = ''
}

async function downloadDocx() {
  if (!props.jobId) return
  exporting.value = true
  exportLabel.value = 'Generando DOCX...'

  try {
    const res = await fetch(`/api/jobs/${props.jobId}/export/docx`)
    if (!res.ok) throw new Error('Error al generar DOCX')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'informe_resumen.docx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {}
  exporting.value = false
  exportLabel.value = ''
}
</script>

<template>
  <div class="summary-view">
    <div class="toolbar">
      <span class="toolbar-title"><IconClipboardText :size="18" :stroke="1.8" /> Informe Resumen</span>
      <div class="toolbar-actions">
        <span v-if="exporting" class="exporting-label">{{ exportLabel }}</span>
        <button :disabled="exporting" @click="downloadPDF" class="btn-export pdf-btn" title="Descargar PDF">
          <IconFileTypePdf :size="16" />
          <span>PDF</span>
        </button>
        <button v-if="jobId" :disabled="exporting" @click="downloadDocx" class="btn-export docx-btn" title="Descargar Word">
          <IconFileTypeDocx :size="16" />
          <span>Word</span>
        </button>
      </div>
    </div>

    <div v-if="!summary" class="empty-state">
      <IconClipboardText :size="32" :stroke="1.2" />
      <p>No hay resumen disponible</p>
    </div>

    <div v-else id="summary-export-content" class="summary-content">
      <!-- Stats bar -->
      <div v-if="visibleStats.length" class="stats-bar">
        <div v-for="s in visibleStats" :key="s.key" class="stat-card" :style="{ borderTopColor: s.color }">
          <div class="stat-icon" :style="{ color: s.color }">
            <component :is="s.icon" :size="20" :stroke="1.8" />
          </div>
          <span class="stat-number" :style="{ color: s.color }">{{ getCount(s.key) }}</span>
          <span class="stat-label-text">{{ s.label }}</span>
        </div>
      </div>

      <!-- Main Idea -->
      <section v-if="summary.one_liner || summary.main_idea" class="section hero-card">
        <div class="hero-badge"><IconSparkles :size="14" :stroke="2" /> Idea Central</div>
        <p class="hero-text">{{ summary.one_liner || summary.main_idea }}</p>
      </section>

      <!-- Executive Paragraph -->
      <section v-if="summary.executive_paragraph" class="section exec-card">
        <h3 class="section-heading">
          <IconClipboardText :size="16" :stroke="1.8" />
          Resumen Ejecutivo
        </h3>
        <p class="exec-text">{{ summary.executive_paragraph }}</p>
      </section>

      <!-- Key Takeaways (NEW) -->
      <section v-if="showKeyTakeaways" class="section">
        <h3 class="section-heading">
          <IconBulb :size="16" :stroke="1.8" />
          Key Takeaways
        </h3>
        <div class="takeaways-grid">
          <div v-for="(item, i) in summary.key_takeaways" :key="i" class="takeaway-card">
            <span class="takeaway-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <p>{{ item }}</p>
          </div>
        </div>
      </section>

      <!-- Topics -->
      <section v-if="showTopics" class="section">
        <h3 class="section-heading">
          <IconListDetails :size="16" :stroke="1.8" />
          Temas Tratados
          <span class="section-count">{{ summary.topics.length }}</span>
        </h3>
        <div class="topics-grid">
          <article v-for="(t, i) in summary.topics" :key="i" class="topic-card">
            <div class="topic-header">
              <span class="topic-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <h4>{{ t.title }}</h4>
            </div>
            <p class="topic-desc">{{ t.description }}</p>
          </article>
        </div>
      </section>

      <!-- Stats & Facts table -->
      <section v-if="showStatsFacts" class="section">
        <h3 class="section-heading">
          <IconDatabase :size="16" :stroke="1.8" />
          Datos y Cifras
          <span class="section-count">{{ summary.stats_and_facts.length }}</span>
        </h3>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Dato / Metrica</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in summary.stats_and_facts" :key="i">
                <td class="row-num">{{ i + 1 }}</td>
                <td>{{ item }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Key Insights -->
      <section v-if="showKeyInsights" class="section">
        <h3 class="section-heading">
          <IconBulb :size="16" :stroke="1.8" />
          Insights Clave
          <span class="section-count">{{ summary.key_insights.length }}</span>
        </h3>
        <div class="insights-list">
          <div v-for="(item, i) in summary.key_insights" :key="i" class="insight-item">
            <span class="insight-num">{{ i + 1 }}</span>
            <p>{{ item }}</p>
          </div>
        </div>
      </section>

      <!-- Conclusions + Key Decisions row -->
      <div v-if="showConclusions || showDecisions" class="two-col-section">
        <section v-if="showConclusions" class="section col-section">
          <h3 class="section-heading">
            <IconScale :size="16" :stroke="1.8" />
            Conclusiones
            <span class="section-count">{{ summary.conclusions.length }}</span>
          </h3>
          <ul class="conclusion-list">
            <li v-for="(item, i) in summary.conclusions" :key="i" class="conclusion-item">
              <IconCheck :size="14" class="conclusion-icon" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>

        <section v-if="showDecisions" class="section col-section">
          <h3 class="section-heading">
            <IconGavel :size="16" :stroke="1.8" />
            Decisiones Clave
            <span class="section-count">{{ summary.key_decisions.length }}</span>
          </h3>
          <ul class="decision-list">
            <li v-for="(item, i) in summary.key_decisions" :key="i" class="decision-item">
              <IconArrowRight :size="14" class="decision-icon" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>
      </div>

      <!-- Action Items -->
      <section v-if="showActions" class="section">
        <h3 class="section-heading">
          <IconTargetArrow :size="16" :stroke="1.8" />
          Acciones y Proximos Pasos
          <span class="section-count">{{ summary.action_items.length }}</span>
        </h3>
        <div class="actions-grid">
          <div v-for="(item, i) in summary.action_items" :key="i" class="action-card">
            <span class="action-check">
              <IconCheck :size="14" :stroke="2.5" />
            </span>
            <span>{{ item }}</span>
          </div>
        </div>
      </section>

      <!-- Watermark -->
      <div class="watermark">TranscribeVideos</div>
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
  gap: 12px;
}

.toolbar-title {
  font-size: 0.8125rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #e6edf3;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exporting-label {
  font-size: 0.75rem;
  color: #8b949e;
  margin-right: 4px;
}

.btn-export {
  padding: 6px 14px;
  border: 1px solid #30363d;
  color: #c9d1d9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #161b22;
}

.btn-export:hover:not(:disabled) {
  background: #21262d;
  border-color: #484f58;
}

.pdf-btn:hover:not(:disabled) {
  color: #ff7a59;
  border-color: #ff7a59;
}

.docx-btn:hover:not(:disabled) {
  color: #5ab2ff;
  border-color: #5ab2ff;
}

.btn-export:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #484f58;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
}

.summary-content {
  padding: 20px 24px 40px;
  max-height: 70vh;
  overflow-y: auto;
}

/* ---- Stats Bar ---- */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 8px;
  margin-bottom: 24px;
}

.stat-card {
  background: linear-gradient(180deg, rgba(13, 17, 23, 0.95), rgba(9, 12, 17, 0.98));
  border: 1px solid #21262d;
  border-top: 2px solid;
  border-radius: 10px;
  padding: 12px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  margin-bottom: 2px;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label-text {
  font-size: 0.65rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
}

/* ---- Hero Card ---- */
.hero-card {
  background: linear-gradient(135deg, rgba(26, 45, 71, 0.9), rgba(15, 20, 33, 0.95));
  border: 1px solid rgba(90, 178, 255, 0.2);
  border-radius: 14px;
  padding: 22px 24px;
  margin-bottom: 22px;
  position: relative;
  overflow: hidden;
}

.hero-card::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(90, 178, 255, 0.1), transparent 70%);
  border-radius: 50%;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #5ab2ff;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 10px;
}

.hero-text {
  font-size: 1.05rem;
  line-height: 1.65;
  color: #e6edf3;
  margin: 0;
  position: relative;
}

/* ---- Executive Card ---- */
.exec-card {
  background: linear-gradient(180deg, rgba(22, 27, 34, 0.9), rgba(13, 17, 25, 0.95));
  border: 1px solid #21262d;
  border-radius: 12px;
  padding: 18px 22px;
  margin-bottom: 24px;
}

.exec-text {
  font-size: 0.875rem;
  line-height: 1.75;
  color: #b3becd;
  margin: 8px 0 0;
}

/* ---- Section shared ---- */
.section {
  margin-bottom: 28px;
}

.section-heading {
  font-size: 0.75rem;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.section-count {
  background: #21262d;
  color: #8b949e;
  font-size: 0.65rem;
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
}

/* ---- Takeaways ---- */
.takeaways-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.takeaway-card {
  background: linear-gradient(135deg, rgba(26, 33, 30, 0.9), rgba(15, 20, 17, 0.95));
  border: 1px solid rgba(255, 200, 87, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.takeaway-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: #ffc857;
  font-family: 'SF Mono', 'Cascadia Code', monospace;
  flex-shrink: 0;
  margin-top: 1px;
}

.takeaway-card p {
  font-size: 0.8125rem;
  line-height: 1.55;
  color: #c9d1d9;
  margin: 0;
}

/* ---- Topics Grid ---- */
.topics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.topic-card {
  background: linear-gradient(180deg, rgba(13, 17, 25, 0.95), rgba(9, 12, 18, 0.98));
  border: 1px solid #1e2736;
  border-radius: 12px;
  padding: 16px 18px;
  transition: border-color 0.15s;
}

.topic-card:hover {
  border-color: #303f58;
}

.topic-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}

.topic-num {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #5ab2ff;
  font-family: 'SF Mono', 'Cascadia Code', monospace;
  flex-shrink: 0;
}

.topic-header h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e6edf3;
  margin: 0;
  line-height: 1.35;
}

.topic-desc {
  font-size: 0.75rem;
  line-height: 1.55;
  color: #8b949e;
  margin: 0;
  padding-left: 24px;
}

/* ---- Data Table ---- */
.data-table-wrap {
  border: 1px solid #21262d;
  border-radius: 10px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.data-table th {
  background: #161b22;
  color: #58a6ff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.6875rem;
  padding: 10px 16px;
  text-align: left;
  border-bottom: 1px solid #21262d;
}

.data-table td {
  padding: 10px 16px;
  color: #c9d1d9;
  border-bottom: 1px solid #1a1f2b;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:nth-child(even) td {
  background: rgba(13, 17, 23, 0.5);
}

.row-num {
  color: #484f58;
  font-family: 'SF Mono', 'Cascadia Code', monospace;
  font-size: 0.75rem;
  width: 40px;
}

/* ---- Insights List ---- */
.insights-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.insight-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 12px 16px;
  background: rgba(13, 17, 23, 0.7);
  border: 1px solid #1a2230;
  border-radius: 10px;
}

.insight-num {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #1a7f4b, #238636);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  margin-top: 1px;
}

.insight-item p {
  font-size: 0.8125rem;
  line-height: 1.55;
  color: #c9d1d9;
  margin: 0;
}

/* ---- Two column (conclusions + decisions) ---- */
.two-col-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.col-section {
  margin-bottom: 0;
}

.conclusion-list,
.decision-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conclusion-item,
.decision-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: #c9d1d9;
  padding: 10px 14px;
  background: rgba(13, 17, 23, 0.6);
  border-radius: 8px;
  border: 1px solid #1a2230;
}

.conclusion-icon {
  color: #5ce1a8;
  flex-shrink: 0;
  margin-top: 2px;
}

.decision-icon {
  color: #ff7a59;
  flex-shrink: 0;
  margin-top: 2px;
}

/* ---- Actions ---- */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}

.action-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid #1e2736;
  border-radius: 10px;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #c9d1d9;
}

.action-check {
  width: 20px;
  height: 20px;
  background: rgba(255, 200, 87, 0.12);
  border: 1.5px solid rgba(255, 200, 87, 0.4);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffc857;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ---- Watermark ---- */
.watermark {
  text-align: center;
  color: #21262d;
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #1a1f2b;
}

@media (max-width: 720px) {
  .topics-grid {
    grid-template-columns: 1fr;
  }

  .two-col-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .col-section {
    margin-bottom: 0;
  }

  .stats-bar {
    grid-template-columns: repeat(3, 1fr);
  }

  .takeaways-grid {
    grid-template-columns: 1fr;
  }
}
</style>
