import OpenAI from 'openai'
import { EXTRACTION_PROMPT, STRUCTURING_PROMPT, LEGACY_SUMMARY_PROMPT, INFOGRAPHIC_PROMPT } from './defaults.js'
import { getSetting, getProviderConfig } from '../settings-store.js'

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
      await sleep(2000 * (attempt + 1))
    }
  }
  throw new Error('Max retries exceeded')
}

export async function generateInfographic(summary, model = 'gpt-4o-mini') {
  const systemPrompt = INFOGRAPHIC_PROMPT

  const summaryText = JSON.stringify(summary, null, 2)

  const response = await callGPT(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Crea una infografia HTML basada en este resumen:\n\n${summaryText}` },
    ],
    model,
    8192,
    0.7
  )

  const content = response.choices[0]?.message?.content?.trim() || ''

  const html = content
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  return {
    html,
    usage: response.usage || null,
  }
}

export async function extractData(transcript, model = 'gpt-4o-mini') {
  const customPrompt = getSetting('prompt_extraction', null)
  const systemPrompt = customPrompt || EXTRACTION_PROMPT

  const response = await callGPT(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript },
    ],
    model,
    16384,
    0.2
  )

  return {
    content: response.choices[0]?.message?.content?.trim() || '',
    usage: response.usage || null,
  }
}

export async function structureData(extractedContent, model = 'gpt-4o-mini') {
  const customPrompt = getSetting('prompt_structuring', null)
  const systemPrompt = customPrompt || STRUCTURING_PROMPT

  const response = await callGPT(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: extractedContent },
    ],
    model,
    16384,
    0.3
  )

  const content = response.choices[0]?.message?.content?.trim() || ''
  const parsed = parseJSON(content)

  return {
    parsed,
    usage: response.usage || null,
  }
}

export async function summarizeTranscript(transcript, model = 'gpt-4o-mini') {
  const useTwoPass = getSetting('two_pass_summary', 'true') === 'true'
  const wordCount = transcript.split(/\s+/).filter(Boolean).length

  if (useTwoPass && wordCount > 1500) {
    return twoPassSummary(transcript, model)
  }

  return singlePassSummary(transcript, model)
}

async function twoPassSummary(transcript, model = 'gpt-4o-mini') {
  const { content: extracted, usage: usage1 } = await extractData(transcript, model)
  const { parsed, usage: usage2 } = await structureData(extracted, model)

  const summary = backwardCompatibleSummary(parsed)

  const totalUsage = usage1 && usage2 ? {
    prompt_tokens: (usage1.prompt_tokens || 0) + (usage2.prompt_tokens || 0),
    completion_tokens: (usage1.completion_tokens || 0) + (usage2.completion_tokens || 0),
    total_tokens: (usage1.total_tokens || 0) + (usage2.total_tokens || 0),
  } : null

  return {
    summary,
    raw: parsed,
    usage: totalUsage,
    twoPass: true,
  }
}

async function singlePassSummary(transcript, model = 'gpt-4o-mini') {
  const systemPrompt = LEGACY_SUMMARY_PROMPT

  const response = await callGPT(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript },
    ],
    model,
    16384,
    0.3
  )

  const content = response.choices[0]?.message?.content?.trim() || ''
  const parsed = parseJSON(content)

  return {
    summary: backwardCompatibleSummary(parsed),
    raw: parsed,
    usage: response.usage || null,
    twoPass: false,
  }
}

function backwardCompatibleSummary(parsed) {
  const db = parsed.detailed_breakdown || parsed.summary || {}
  const es = parsed.executive_summary || {}

  return {
    main_idea: db.main_idea || es.one_liner || '',
    topics: (db.topics || []).map(t => ({
      title: t.title || '',
      description: t.description || '',
    })),
    key_insights: db.key_insights || [],
    key_takeaways: es.key_takeaways || [],
    conclusions: db.conclusions || [],
    action_items: db.action_items || [],
    stats_and_facts: db.stats_and_facts || [],
    key_decisions: db.key_decisions || [],
    one_liner: es.one_liner || '',
    executive_paragraph: es.paragraph || '',
  }
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

  return {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}
