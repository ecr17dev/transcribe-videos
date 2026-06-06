<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import html2pdf from 'html2pdf.js'

const { t } = useI18n()
import {
  IconChartInfographic,
  IconFileTypePdf,
  IconCopy,
  IconCheck,
  IconBulb,
  IconListDetails,
  IconTargetArrow,
  IconChartBarPopular,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconArrowRight,
  IconChartBar,
  IconUsers,
  IconBrain,
  IconTarget,
  IconClock,
  IconCalendar,
  IconCash,
  IconBuilding,
  IconShield,
  IconBolt,
  IconStar,
  IconChecklist,
  IconMessages,
  IconScale,
  IconFileReport,
  IconWorld,
  IconCode,
  IconDatabase,
  IconCloud,
  IconLock,
  IconRocket,
  IconSettings,
  IconSearch,
  IconChartDots,
  IconLayoutDashboard,
} from '@tabler/icons-vue'

const props = defineProps({ html: String, summary: Object, infographicData: Object })

const exporting = ref(false)
const copied = ref(false)
const chartInstances = ref([])
const canvasRefs = ref({})

const iconMap = {
  'chart-bar': IconChartBar, 'users': IconUsers, 'brain': IconBrain, 'target': IconTarget,
  'clock': IconClock, 'calendar': IconCalendar, 'cash': IconCash, 'building': IconBuilding,
  'shield': IconShield, 'zap': IconBolt, 'star': IconStar, 'trending-up': IconTrendingUp,
  'checklist': IconChecklist, 'messages': IconMessages, 'bulb': IconBulb, 'scale': IconScale,
  'file-report': IconFileReport, 'world': IconWorld, 'code': IconCode, 'database': IconDatabase,
  'cloud': IconCloud, 'lock': IconLock, 'rocket': IconRocket, 'settings': IconSettings,
  'search': IconSearch, 'list-details': IconListDetails, 'target-arrow': IconTargetArrow,
  'chart-bar-popular': IconChartBarPopular,
}

function getIcon(name) {
  return iconMap[name] || IconFileReport
}

function trendIcon(trend) {
  if (trend === 'up') return IconTrendingUp
  if (trend === 'down') return IconTrendingDown
  return IconMinus
}

function trendColor(trend) {
  if (trend === 'up') return '#5ce1a8'
  if (trend === 'down') return '#ff7a59'
  return '#8b949e'
}

const data = computed(() => props.infographicData)
const renderMode = computed(() => {
  if (props.infographicData) return 'structured'
  if (props.html) return 'legacy'
  return 'synthetic'
})

// Chart.js CDN loader
let chartJsLoaded = false

async function loadChartJs() {
  if (chartJsLoaded) return
  if (typeof Chart !== 'undefined') { chartJsLoaded = true; return }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
    script.onload = () => { chartJsLoaded = true; resolve() }
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })
}

function setCanvasRef(index, el) {
  if (el) canvasRefs.value[index] = el
}

async function initCharts() {
  await nextTick()
  await loadChartJs()
  if (typeof Chart === 'undefined') return

  destroyCharts()

  const charts = data.value?.charts
  if (!charts?.length) return

  charts.forEach((chart, i) => {
    const canvas = canvasRefs.value[i]
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const isDoughnut = chart.type === 'doughnut'

    const instance = new Chart(ctx, {
      type: isDoughnut ? 'doughnut' : 'bar',
      data: {
        labels: chart.labels || [],
        datasets: (chart.datasets || []).map(ds => ({
          label: ds.label || '',
          data: ds.data || [],
          backgroundColor: ds.backgroundColor || (isDoughnut
            ? ['#5ab2ff', '#5ce1a8', '#ffc857', '#ff7a59', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c']
            : '#5ab2ff'),
          borderColor: isDoughnut ? '#0d1117' : 'transparent',
          borderWidth: isDoughnut ? 2 : 0,
          borderRadius: isDoughnut ? 0 : 4,
          maxBarThickness: 40,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: isDoughnut ? 'bottom' : 'top',
            labels: {
              color: '#8b949e',
              padding: 16,
              font: { size: 11, family: 'system-ui, -apple-system, sans-serif' },
            },
          },
        },
        scales: isDoughnut ? {} : {
          x: {
            ticks: { color: '#8b949e', font: { size: 10 } },
            grid: { color: '#1a2230' },
          },
          y: {
            ticks: { color: '#8b949e', font: { size: 10 } },
            grid: { color: '#1a2230' },
            beginAtZero: true,
          },
        },
      },
    })
    chartInstances.value.push(instance)
  })
}

function destroyCharts() {
  chartInstances.value.forEach(c => c.destroy())
  chartInstances.value = []
}

watch(data, () => {
  if (renderMode.value === 'structured') {
    setTimeout(initCharts, 100)
  }
}, { deep: true })

onMounted(() => {
  if (renderMode.value === 'structured') {
    setTimeout(initCharts, 200)
  }
})

// Highlight cards for synthetic fallback
const highlightCards = computed(() => {
  if (!props.summary) return []
  return [
    { label: t('infographic.synthetic.topics'), value: props.summary.topics?.length || 0, icon: IconListDetails },
    { label: t('infographic.synthetic.insights'), value: props.summary.key_insights?.length || 0, icon: IconBulb },
    { label: t('infographic.synthetic.actions'), value: props.summary.action_items?.length || 0, icon: IconTargetArrow },
    { label: t('infographic.synthetic.data'), value: props.summary.stats_and_facts?.length || 0, icon: IconChartBarPopular },
  ].filter((item) => item.value > 0)
})

const fallbackNarrative = computed(() => {
  if (!props.summary) return []
  return [
    ...(props.summary.key_insights || []),
    ...(props.summary.conclusions || []),
  ].slice(0, 6)
})

// Export
async function downloadPDF() {
  const el = document.getElementById('infographic-export-content')
  if (!el) return
  exporting.value = true

  const opt = {
    margin: [5, 5, 5, 5],
    filename: t('infographic.pdfFilename'),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, backgroundColor: '#0a0e14', logging: false },
    jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' },
  }

  try {
    await html2pdf().set(opt).from(el).save()
  } catch {}
  exporting.value = false
}

async function copyHTML() {
  const content = props.html
  if (!content) return
  try {
    await navigator.clipboard.writeText(content)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}
</script>

<template>
  <div class="infographic-view">
    <div class="toolbar">
      <span class="toolbar-title"><IconChartInfographic :size="18" :stroke="1.8" /> {{ t('infographic.heading') }}</span>
      <div class="toolbar-actions">
        <button v-if="html" @click="copyHTML" class="btn-tool" :title="t('infographic.copyHtml')">
          <component :is="copied ? IconCheck : IconCopy" :size="15" />
          <span>{{ copied ? t('infographic.copied') : t('infographic.html') }}</span>
        </button>
        <button :disabled="exporting" @click="downloadPDF" class="btn-tool pdf-btn" :title="t('infographic.pdfTitle')">
          <IconFileTypePdf :size="16" />
          <span>{{ exporting ? t('infographic.generating') : t('infographic.pdf') }}</span>
        </button>
      </div>
    </div>

    <!-- LEGACY: GPT-generated raw HTML -->
    <div v-if="renderMode === 'legacy'" class="infographic-content" v-html="html" />

    <!-- SYNTHETIC: built from summary data -->
    <div v-else-if="renderMode === 'synthetic'" class="fallback-infographic">
      <div class="fallback-canvas">
        <p class="eyebrow">{{ t('infographic.synthetic.eyebrow') }}</p>
        <h3>{{ summary?.one_liner || summary?.main_idea || t('infographic.synthetic.noData') }}</h3>
        <p class="canvas-copy">
          {{ summary?.executive_paragraph || t('infographic.synthetic.desc') }}
        </p>

        <div v-if="highlightCards.length" class="highlight-row">
          <div v-for="item in highlightCards" :key="item.label" class="highlight-item">
            <component :is="item.icon" :size="18" />
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>

        <div v-if="summary?.topics?.length" class="topic-ribbon">
          <article v-for="(topic, index) in summary.topics.slice(0, 4)" :key="index" class="topic-card">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <h4>{{ topic.title }}</h4>
            <p>{{ topic.description }}</p>
          </article>
        </div>

        <div v-if="fallbackNarrative.length" class="narrative-block">
          <h4>{{ t('infographic.synthetic.relevant') }}</h4>
          <ul>
            <li v-for="(item, index) in fallbackNarrative" :key="index">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- STRUCTURED: built from infographicData JSON -->
    <div v-else id="infographic-export-content" class="structured-infographic">
      <!-- Hero Section -->
      <section class="info-hero">
        <div class="info-hero-badge">{{ data.hero.badge }}</div>
        <h1 class="info-hero-title">{{ data.hero.title }}</h1>
        <p class="info-hero-subtitle">{{ data.hero.subtitle }}</p>
      </section>

      <!-- Metric Cards -->
      <section v-if="data.metric_cards?.length" class="info-metrics">
        <div v-for="(card, i) in data.metric_cards" :key="i" class="metric-card">
          <div class="metric-icon">
            <component :is="getIcon(card.icon_suggestion)" :size="22" :stroke="1.6" />
          </div>
          <div class="metric-body">
            <span class="metric-value">{{ card.value }}</span>
            <span class="metric-label">{{ card.label }}</span>
          </div>
          <div v-if="card.trend" class="metric-trend" :style="{ color: trendColor(card.trend) }">
            <component :is="trendIcon(card.trend)" :size="14" />
          </div>
        </div>
      </section>

      <!-- Main Insight -->
      <section v-if="data.main_insight?.quote" class="info-insight-block">
        <div class="insight-quote-mark">&ldquo;</div>
        <blockquote class="insight-quote">{{ data.main_insight.quote }}</blockquote>
        <p v-if="data.main_insight.context" class="insight-context">{{ data.main_insight.context }}</p>
      </section>

      <!-- Charts -->
      <section v-if="data.charts?.length" class="info-charts">
        <div v-for="(chart, i) in data.charts" :key="i" class="chart-card">
          <h3 class="chart-title">{{ chart.title }}</h3>
          <p v-if="chart.description" class="chart-desc">{{ chart.description }}</p>
          <div class="chart-canvas-wrap">
            <canvas :ref="(el) => setCanvasRef(i, el)" :id="`chart-${i}`"></canvas>
          </div>
        </div>
      </section>

      <!-- Data Table -->
      <section v-if="data.data_table?.rows?.length" class="info-table-section">
        <h3 class="info-section-title">
          <IconLayoutDashboard :size="16" :stroke="1.8" />
          {{ data.data_table.title }}
        </h3>
        <div class="info-table-wrap">
          <table class="info-table">
            <thead>
              <tr>
                <th v-for="(h, i) in data.data_table.headers" :key="i">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in data.data_table.rows" :key="ri">
                <td v-for="(cell, ci) in row" :key="ci" :class="{ 'row-num-cell': ci === 0 }">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Topic Sections -->
      <section v-if="data.topic_sections?.length" class="info-topics">
        <h3 class="info-section-title">
          <IconListDetails :size="16" :stroke="1.8" />
          {{ t('infographic.sections.topicsDeep') }}
        </h3>
        <div class="info-topic-grid">
          <div v-for="(t, i) in data.topic_sections" :key="i" class="info-topic-card">
            <div class="info-topic-head">
              <span class="info-topic-order">{{ String(t.order || i + 1).padStart(2, '0') }}</span>
              <component :is="getIcon(t.icon_suggestion)" :size="18" :stroke="1.6" class="info-topic-icon" />
              <h4>{{ t.title }}</h4>
            </div>
            <p class="info-topic-desc">{{ t.description }}</p>
            <ul v-if="t.key_points?.length" class="info-topic-points">
              <li v-for="(kp, j) in t.key_points" :key="j">{{ kp }}</li>
            </ul>
            <div v-if="t.stats?.length" class="info-topic-stats">
              <span v-for="(s, j) in t.stats" :key="j" class="info-topic-stat">
                <strong>{{ s.value }}</strong> {{ s.label }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Timeline -->
      <section v-if="data.timeline?.length" class="info-timeline">
        <h3 class="info-section-title">
          <IconChartDots :size="16" :stroke="1.8" />
          {{ t('infographic.sections.flow') }}
        </h3>
        <div class="timeline-track">
          <div v-for="(phase, i) in data.timeline" :key="i" class="timeline-node">
            <div class="timeline-dot">
              <span>{{ i + 1 }}</span>
            </div>
            <div class="timeline-card">
              <span class="timeline-phase">{{ phase.phase }}</span>
              <h4>{{ phase.title }}</h4>
              <p>{{ phase.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Conclusion -->
      <section v-if="data.conclusion" class="info-conclusion">
        <h3 class="info-section-title">
          <IconBulb :size="16" :stroke="1.8" />
          {{ data.conclusion.title }}
        </h3>
        <div class="conclusion-grid">
          <div v-if="data.conclusion.key_takeaways?.length" class="conclusion-col">
            <h4>{{ t('infographic.sections.keyPoints') }}</h4>
            <ul>
              <li v-for="(kt, i) in data.conclusion.key_takeaways" :key="i">
                <IconCheck :size="14" :stroke="2.5" class="takeaway-check" />
                {{ kt }}
              </li>
            </ul>
          </div>
          <div v-if="data.conclusion.next_steps?.length" class="conclusion-col">
            <h4>{{ t('infographic.sections.nextSteps') }}</h4>
            <ul>
              <li v-for="(ns, i) in data.conclusion.next_steps" :key="i">
                <IconArrowRight :size="14" :stroke="2" class="nextstep-arrow" />
                {{ ns }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div class="info-footer">{{ t('infographic.watermark') }}</div>
    </div>
  </div>
</template>

<style scoped>
.infographic-view {
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

.btn-tool {
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

.btn-tool:hover:not(:disabled) {
  background: #21262d;
  border-color: #484f58;
}

.pdf-btn:hover:not(:disabled) {
  color: #ff7a59;
  border-color: #ff7a59;
}

.btn-tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---- STRUCTURED INFOGRAPHIC ---- */
.structured-infographic {
  padding: 28px 32px 40px;
  max-height: 70vh;
  overflow-y: auto;
}

/* Hero */
.info-hero {
  text-align: center;
  padding: 32px 20px 28px;
  border-bottom: 1px solid #1a2230;
  margin-bottom: 28px;
}

.info-hero-badge {
  display: inline-block;
  padding: 5px 14px;
  background: rgba(90, 178, 255, 0.1);
  border: 1px solid rgba(90, 178, 255, 0.25);
  border-radius: 20px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #5ab2ff;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.info-hero-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #f4f7fb;
  margin: 0 0 10px;
  line-height: 1.2;
}

.info-hero-subtitle {
  font-size: 0.875rem;
  color: #8b949e;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Metrics */
.info-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 28px;
}

.metric-card {
  background: linear-gradient(180deg, rgba(13, 18, 26, 0.95), rgba(9, 13, 20, 0.98));
  border: 1px solid #1e2738;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-icon {
  color: #5ab2ff;
  flex-shrink: 0;
  opacity: 0.8;
}

.metric-body {
  flex: 1;
  min-width: 0;
}

.metric-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #f4f7fb;
  line-height: 1.1;
}

.metric-label {
  display: block;
  font-size: 0.65rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}

.metric-trend {
  flex-shrink: 0;
}

/* Insight Block */
.info-insight-block {
  background: linear-gradient(135deg, rgba(26, 45, 71, 0.7), rgba(15, 20, 33, 0.9));
  border: 1px solid rgba(90, 178, 255, 0.15);
  border-radius: 14px;
  padding: 24px 28px;
  margin-bottom: 28px;
  position: relative;
}

.insight-quote-mark {
  position: absolute;
  top: 8px;
  left: 14px;
  font-size: 4rem;
  color: rgba(90, 178, 255, 0.12);
  font-family: Georgia, serif;
  line-height: 1;
  pointer-events: none;
}

.insight-quote {
  font-size: 1rem;
  line-height: 1.65;
  color: #e6edf3;
  margin: 0 0 8px;
  font-style: italic;
  position: relative;
}

.insight-context {
  font-size: 0.75rem;
  color: #8b949e;
  margin: 0;
}

/* Charts */
.info-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.chart-card {
  background: rgba(13, 17, 24, 0.8);
  border: 1px solid #1e2738;
  border-radius: 14px;
  padding: 18px 20px;
}

.chart-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e6edf3;
  margin: 0 0 4px;
}

.chart-desc {
  font-size: 0.6875rem;
  color: #8b949e;
  margin: 0 0 14px;
}

.chart-canvas-wrap {
  width: 100%;
  max-height: 280px;
}

.chart-canvas-wrap canvas {
  max-height: 280px;
}

/* Section title */
.info-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Data Table */
.info-table-section {
  margin-bottom: 28px;
}

.info-table-wrap {
  border: 1px solid #1a2230;
  border-radius: 10px;
  overflow: hidden;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.info-table th {
  background: #111822;
  color: #58a6ff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.6875rem;
  padding: 10px 16px;
  text-align: left;
  border-bottom: 1px solid #21262d;
}

.info-table td {
  padding: 10px 16px;
  color: #c9d1d9;
  border-bottom: 1px solid #1a1f2b;
}

.info-table tr:last-child td { border-bottom: none; }
.info-table tr:nth-child(even) td { background: rgba(13, 17, 23, 0.4); }
.row-num-cell { color: #484f58; font-family: 'SF Mono', monospace; font-size: 0.75rem; width: 40px; }

/* Topic Grid */
.info-topics { margin-bottom: 28px; }

.info-topic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.info-topic-card {
  background: linear-gradient(180deg, rgba(13, 18, 26, 0.9), rgba(9, 13, 20, 0.95));
  border: 1px solid #1a2534;
  border-radius: 12px;
  padding: 16px 18px;
}

.info-topic-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.info-topic-order {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #5ab2ff;
  font-family: 'SF Mono', monospace;
}

.info-topic-icon { color: #8b949e; flex-shrink: 0; }

.info-topic-head h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e6edf3;
  margin: 0;
}

.info-topic-desc {
  font-size: 0.75rem;
  line-height: 1.55;
  color: #8b949e;
  margin: 0 0 8px;
  padding-left: 32px;
}

.info-topic-points {
  list-style: none;
  padding: 0 0 0 32px;
  margin: 0 0 8px;
}

.info-topic-points li {
  font-size: 0.71875rem;
  color: #6e7681;
  padding: 2px 0;
  position: relative;
  padding-left: 12px;
}

.info-topic-points li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #30363d;
}

.info-topic-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-left: 32px;
}

.info-topic-stat {
  font-size: 0.6875rem;
  color: #8b949e;
  background: rgba(22, 27, 34, 0.6);
  padding: 3px 8px;
  border-radius: 6px;
}

.info-topic-stat strong { color: #5ce1a8; }

/* Timeline */
.info-timeline { margin-bottom: 28px; }

.timeline-track {
  display: flex;
  gap: 0;
  position: relative;
  padding: 10px 0;
}

.timeline-track::before {
  content: '';
  position: absolute;
  top: 34px;
  left: 24px;
  right: 24px;
  height: 2px;
  background: linear-gradient(90deg, #5ab2ff, #5ce1a8, #ffc857, #ff7a59);
}

.timeline-node {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.timeline-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a3a5c, #0d2137);
  border: 2px solid #5ab2ff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  margin-bottom: 10px;
}

.timeline-dot span {
  font-size: 0.75rem;
  font-weight: 700;
  color: #5ab2ff;
}

.timeline-card {
  padding: 12px;
}

.timeline-phase {
  display: block;
  font-size: 0.625rem;
  color: #5ab2ff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-bottom: 4px;
}

.timeline-card h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e6edf3;
  margin: 0 0 4px;
}

.timeline-card p {
  font-size: 0.6875rem;
  color: #8b949e;
  margin: 0;
  line-height: 1.4;
}

/* Conclusion */
.info-conclusion {
  margin-bottom: 28px;
  background: linear-gradient(180deg, rgba(17, 22, 32, 0.8), rgba(10, 14, 21, 0.9));
  border: 1px solid #1a2534;
  border-radius: 14px;
  padding: 24px;
}

.conclusion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.conclusion-col h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #e6edf3;
  margin: 0 0 10px;
}

.conclusion-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conclusion-col li {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #c9d1d9;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.takeaway-check { color: #5ce1a8; flex-shrink: 0; margin-top: 2px; }
.nextstep-arrow { color: #ffc857; flex-shrink: 0; margin-top: 2px; }

/* Footer */
.info-footer {
  text-align: center;
  color: #21262d;
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #1a1f2b;
}

/* ---- LEGACY HTML ---- */
.infographic-content {
  padding: 24px;
  max-height: 70vh;
  overflow: auto;
}

.infographic-content :deep(*) {
  max-width: 100%;
  box-sizing: border-box;
}

.infographic-content :deep(img) {
  max-width: 100%;
  height: auto;
}

/* ---- SYNTHETIC FALLBACK ---- */
.fallback-infographic {
  padding: 24px;
  max-height: 70vh;
  overflow: auto;
}

.fallback-canvas {
  min-height: 100%;
  border-radius: 24px;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(16, 54, 96, 0.86), rgba(18, 22, 32, 0.96) 50%, rgba(16, 61, 46, 0.86));
  border: 1px solid rgba(104, 160, 255, 0.2);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.fallback-canvas h3 {
  font-size: 1.7rem;
  line-height: 1.1;
  max-width: 680px;
  margin-bottom: 14px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.68rem;
  color: #58a6ff;
  margin-bottom: 10px;
}

.canvas-copy {
  max-width: 720px;
  color: #c6d3e8;
  line-height: 1.75;
  margin-bottom: 22px;
}

.highlight-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.highlight-item {
  padding: 14px;
  border-radius: 16px;
  background: rgba(19, 28, 40, 0.94);
  border: 1px solid #233147;
  display: grid;
  gap: 4px;
  color: #8da0ba;
}

.highlight-item strong {
  font-size: 1.3rem;
  color: #f5f7fb;
}

.topic-ribbon {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.topic-card {
  padding: 18px;
  border-radius: 18px;
  background: rgba(9, 14, 21, 0.7);
  border: 1px solid rgba(148, 180, 226, 0.18);
}

.topic-card span {
  display: inline-block;
  margin-bottom: 10px;
  color: #7cb7ff;
  font-size: 0.75rem;
  letter-spacing: 0.14em;
}

.topic-card h4 { margin: 0 0 8px; color: #f4f7fb; }
.topic-card p { color: #b5c4db; line-height: 1.6; }

.narrative-block h4 { margin: 0 0 10px; color: #e6edf8; }
.narrative-block ul { list-style: none; display: grid; gap: 10px; padding: 0; }
.narrative-block li {
  padding: 12px 14px;
  background: rgba(15, 21, 31, 0.9);
  border: 1px solid #202c3d;
  border-radius: 14px;
  color: #b3bfd0;
  line-height: 1.55;
}

@media (max-width: 820px) {
  .info-topic-grid { grid-template-columns: 1fr; }
  .conclusion-grid { grid-template-columns: 1fr; }
  .info-charts { grid-template-columns: 1fr; }
  .timeline-track { flex-direction: column; align-items: flex-start; gap: 12px; padding: 0; }
  .timeline-track::before { display: none; }
  .timeline-node { flex-direction: row; align-items: center; gap: 12px; text-align: left; width: 100%; }
  .timeline-card { padding: 0; }
}
</style>
