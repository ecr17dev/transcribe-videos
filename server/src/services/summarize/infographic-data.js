import OpenAI from 'openai'
import { INFOGRAPHIC_DATA_PROMPT } from './defaults.js'
import { getProviderConfig } from '../settings-store.js'

function getOpenAI() {
  const config = getProviderConfig('openai')
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY
  return new OpenAI({ apiKey })
}

async function callGPT(messages, model, maxTokens = 16384, temperature = 0.3) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      })
      return response
    } catch (err) {
      if (attempt === 2) throw err
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}

function parseJSON(raw) {
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {}
    }
  }

  return null
}

function normalizeData(parsed, summary) {
  if (!parsed || typeof parsed !== 'object') return null

  const d = parsed

  const hero = {
    title: d.hero?.title || summary.one_liner || summary.main_idea || '',
    subtitle: d.hero?.subtitle || summary.executive_paragraph?.slice(0, 200) || '',
    badge: d.hero?.badge || 'Resumen Ejecutivo',
  }

  const metric_cards = Array.isArray(d.metric_cards) ? d.metric_cards.slice(0, 6) : [
    { label: 'Temas', value: String(summary.topics?.length || 0), trend: 'neutral', icon_suggestion: 'list-details' },
    { label: 'Insights', value: String(summary.key_insights?.length || 0), trend: 'up', icon_suggestion: 'bulb' },
    { label: 'Acciones', value: String(summary.action_items?.length || 0), trend: 'neutral', icon_suggestion: 'checklist' },
    { label: 'Datos', value: String(summary.stats_and_facts?.length || 0), trend: 'up', icon_suggestion: 'chart-bar' },
  ]

  const main_insight = {
    quote: d.main_insight?.quote || summary.key_insights?.[0] || summary.main_idea || '',
    context: d.main_insight?.context || '',
  }

  const charts = Array.isArray(d.charts) ? d.charts.filter(c => c.type && c.labels?.length && c.datasets?.length).slice(0, 3) : []

  const data_table = d.data_table?.rows?.length ? d.data_table : {
    title: 'Datos Clave',
    headers: ['Metrica', 'Valor'],
    rows: (summary.stats_and_facts || []).map(s => {
      const parts = s.split(/[:\-]\s*/, 2)
      return parts.length === 2 ? [parts[0], parts[1]] : ['Dato', s]
    }).slice(0, 10),
  }

  if (data_table.headers.length === 2) {
    data_table.headers.push('Detalle')
    data_table.rows = data_table.rows.map(r => [...r, ''])
  }

  const topic_sections = Array.isArray(d.topic_sections) ? d.topic_sections.slice(0, 12) : (summary.topics || []).map((t, i) => ({
    order: i + 1,
    title: t.title,
    description: t.description,
    icon_suggestion: 'file-report',
    key_points: [],
    stats: [],
  }))

  const timeline = Array.isArray(d.timeline) && d.timeline.length >= 3 ? d.timeline.slice(0, 7) : buildTimeline(summary)

  const conclusion = {
    title: d.conclusion?.title || 'Conclusiones y Proximos Pasos',
    key_takeaways: d.conclusion?.key_takeaways?.length ? d.conclusion.key_takeaways.slice(0, 8) : (summary.key_takeaways || summary.key_insights || []).slice(0, 8),
    next_steps: d.conclusion?.next_steps?.length ? d.conclusion.next_steps.slice(0, 6) : (summary.action_items || []).slice(0, 6),
  }

  return {
    hero,
    metric_cards,
    main_insight,
    charts,
    data_table,
    topic_sections,
    timeline,
    conclusion,
  }
}

function buildTimeline(summary) {
  const phases = []
  const topics = summary.topics || []

  if (topics.length >= 3) {
    const chunkSize = Math.ceil(topics.length / 4)

    for (let i = 0; i < Math.min(4, Math.ceil(topics.length / chunkSize)); i++) {
      const chunk = topics.slice(i * chunkSize, (i + 1) * chunkSize)
      if (chunk.length === 0) continue

      phases.push({
        phase: `Bloque ${i + 1}`,
        title: chunk[0].title,
        description: chunk.map(t => t.title).join(' | '),
      })
    }
  } else {
    phases.push(
      { phase: 'Apertura', title: 'Inicio de la sesion', description: 'Introduccion y planteamiento inicial' },
      { phase: 'Desarrollo', title: 'Discusion principal', description: 'Temas centrales abordados' },
      { phase: 'Cierre', title: 'Conclusiones', description: 'Resolucion y siguientes pasos' },
    )
  }

  return phases
}

export async function generateInfographicData(detailedSummary, model = 'gpt-4o-mini') {
  const summaryText = JSON.stringify(detailedSummary, null, 2)

  const response = await callGPT(
    [
      { role: 'system', content: INFOGRAPHIC_DATA_PROMPT },
      { role: 'user', content: `Organiza estos datos para una infografia visual profesional:\n\n${summaryText}` },
    ],
    model,
    8192,
    0.5
  )

  const content = response.choices[0]?.message?.content?.trim() || ''
  const parsed = parseJSON(content)

  const data = normalizeData(parsed, detailedSummary)

  return {
    data,
    raw: parsed,
    usage: response.usage || null,
  }
}
