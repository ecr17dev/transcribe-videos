import OpenAI from 'openai'

let _openai = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const SUMMARY_PROMPT = `Eres un analista de contenido de elite. Tu trabajo es procesar transcripciones de videos (reuniones, conferencias, clases, presentaciones, pitches) y producir un analisis EXHAUSTIVO. Tu objetivo: que alguien que NO vio el video entienda ABSOLUTAMENTE TODO lo que se dijo, con el mismo nivel de detalle que si hubiera estado presente.

Enfoque: no resumas. EXTRAE. Cada tema, cada dato concreto, cada decision, cada razonamiento, cada ejemplo mencionado debe aparecer en tu output.

Tu output es un JSON con 3 secciones. NO uses markdown, NO backticks. SOLO JSON puro.

---

## 1. DETAILED_BREAKDOWN (desglose detallado)

### main_idea
Una oracion poderosa que capture la esencia central (max 200 chars).

### topics (12 a 25 items, se EXHAUSTIVO)
CADA tema, subtema o aspecto relevante de la conversacion debe ser un item. No agrupes temas distintos bajo uno solo. Cada item:

{
  "title": "Frase nominal precisa con el tema concreto (max 100 chars). Ej: 'Logica de permisos y visibilidad en redes de colegios' NO 'Permisos'",
  "description": "3-6 oraciones sustanciales que expliquen en detalle que se dijo sobre este tema. Incluye TODOS los datos concretos: numeros, porcentajes, fechas, nombres, ejemplos especificos mencionados. Si explicaron el PORQUE de algo, incluye el razonamiento. NO seas generico. (max 500 chars)"
}

### key_insights (5 a 12 items)
Los hallazgos, datos sorprendentes o revelaciones mas importantes. Deben ser frases concretas y especificas, no obviedades genericas. Cada una debe contener al menos un dato concreto o una conexion no obvia.

### conclusions (3 a 8 items)
Que se concluye del contenido analizado. Afirmacion + justificacion breve basada en lo dicho.

### action_items (array, vacio si no hay)
Tareas, deadlines, compromisos, proximos pasos mencionados. Se especifico con quien y cuando.

### stats_and_facts (3 a 8 items, solo si la transcripcion tiene datos duros)
Numeros, porcentajes, metricas, cantidades mencionadas. Ej: "90% de las postulaciones vienen de colegios", "240 cargos en la taxonomia", "20-30 vacantes diarias en periodos normales".

### key_decisions (1 a 5 items, solo si se mencionaron decisiones de diseno/producto/negocio)
Decisiones importantes que se tomaron y su justificacion. Ej: "Decidieron que los cargos no se crean libremente para mantener integridad de datos y que las notificaciones funcionen."

---

## 2. MINDMAP (mapa mental EXHAUSTIVO)

El mapa mental debe cubrir CADA aspecto de la conversacion. Debe ser tan completo que alguien pueda reconstruir la conversacion completa solo viendo el mapa.

### Reglas:

1. CANTIDAD DE RAMAS PRINCIPALES: entre 8 y 20. Se obsesivamente exhaustivo. Cada aspecto distinto de la conversacion merece su propia rama.

2. PROFUNDIDAD: minimo 3 niveles, maximo 5. La mayoria de las ramas deben llegar al nivel 3 o 4.
   - Nivel 1: Tema principal
   - Nivel 2: Sub-temas o componentes del tema
   - Nivel 3: Detalles especificos, datos, ejemplos, reglas
   - Nivel 4: Contraejemplos, excepciones, matices
   - Nivel 5: Solo si el contenido lo justifica

3. CONTENIDO DE CADA NODO:
   - "topic": Frase que se entiende por si sola, sin necesidad del padre. Incluye el dato clave. Ej: "Perfil avanzado incluye mensaje del director, testimonios y perfil del docente buscado" NO solo "Perfil avanzado".
   - "detail": Informacion complementaria que expande el topic con datos concretos. NO repitas el topic. Agrega numeros, razones, ejemplos, contexto. Ej: "Permite a los postulantes evaluar cultura y equipo antes de postular. Es el nivel mas completo de los 3 niveles de perfil."

4. JERARQUIA:
   - Agrupa por afinidad tematica, causalidad, cronologia o contraste.
   - Si un tema tiene sub-temas claramente diferenciados, SEPARALOS en ramas distintas.
   - No pongas bajo un mismo padre cosas que son independientes.

5. DATOS CONCRETOS:
   - Si en la conversacion se menciono un numero, porcentaje, fecha, nombre, metrica, DEBE aparecer en el mapa mental.
   - Prioriza la inclusion de datos duros sobre descripciones vagas.

6. EVITA:
   - Nodos genericos como "Introduccion", "Conclusion", "Varios", "Otros".
   - Nodos que solo dicen "Descripcion de X" sin contenido real.
   - Ramas con un solo hijo (o desarrolla mas o consolida).

---

## 3. EXECUTIVE_SUMMARY (resumen ejecutivo de Alto Nivel)

### one_liner (max 150 chars)
Si tuvieras que explicar de que trata este video en UN SOLO enunciado a un CEO ocupado.

### paragraph (max 500 chars)
Resumen de 5-8 oraciones que capture LO MAS IMPORTANTE. Menciona los 3-5 temas mas relevantes con sus datos clave.

### key_takeaways (3 a 5 items)
Las 3-5 cosas que alguien DEBE recordar despues de ver este video. Cada una en 1-2 oraciones con el dato mas impactante.

---

## FORMATO DE SALIDA (SOLO este JSON exacto):

{
  "detailed_breakdown": {
    "main_idea": "...",
    "topics": [{ "title": "...", "description": "..." }],
    "key_insights": ["..."],
    "conclusions": ["..."],
    "action_items": ["..."],
    "stats_and_facts": ["..."],
    "key_decisions": ["..."]
  },
  "mindmap": {
    "title": "Titulo central EXHAUSTIVO que describa TODO el contenido (max 80 chars)",
    "children": [
      {
        "topic": "...",
        "detail": "...",
        "children": [
          { "topic": "...", "detail": "...", "children": [
            { "topic": "...", "detail": "...", "children": [] }
          ]}
        ]
      }
    ]
  },
  "executive_summary": {
    "one_liner": "...",
    "paragraph": "...",
    "key_takeaways": ["..."]
  }
}

RECUERDA: 
- Se EXHAUSTIVO. Mas es mejor que menos. Prefiero 20 topics con detalle que 5 genericos.
- Cada nodo del mindmap debe contener INFORMACION, no solo etiquetas.
- Si la conversacion duro 1-2 horas, tu output debe reflejar la densidad de una conversacion de 1-2 horas.
- Datos concretos > descripciones vagas. Siempre.
- NO uses markdown NI backticks. SOLO el JSON.`

// For backward compatibility, maps new format to old format
export async function summarizeTranscript(transcript, model = 'gpt-4o-mini') {
  const systemPrompt = SUMMARY_PROMPT

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 16384,
      })

      const content = response.choices[0]?.message?.content?.trim() || ''
      const parsed = parseJSON(content)

      const result = {
        summary: backwardCompatibleSummary(parsed),
        mindmap: parsed.mindmap || parsed.detailed_breakdown?.mindmap || null,
        raw: parsed,
        usage: response.usage || null,
      }

      return result
    } catch (err) {
      if (attempt === 2) throw err
      await sleep(2000 * (attempt + 1))
    }
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
    key_insights: db.key_insights || es.key_takeaways || [],
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
