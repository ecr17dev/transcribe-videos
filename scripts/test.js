import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OpenAI from 'openai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-')) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-tu-api-key-aqui') {
    console.error('ERROR: OPENAI_API_KEY no configurada en .env')
    console.error('  1. Copia .env.example a .env:  cp .env.example .env')
    console.error('  2. Edita .env y pon tu API key de OpenAI')
    process.exit(1)
  }
}

const openai = new OpenAI()

console.log('Verificando conexion con OpenAI...\n')

try {
  const response = await openai.models.list()

  const models = response.data || []
  const whisperModels = models.filter(m => m.id.includes('whisper'))
  const gptMini = models.filter(m => m.id.includes('gpt-4o-mini'))
  const gpt4o = models.filter(m => m.id.includes('gpt-4o') && !m.id.includes('mini'))

  console.log('Conexion con OpenAI exitosa')
  console.log('')
  console.log(`  Modelos accesibles: ${models.length}`)
  console.log('')
  console.log('  Whisper:')
  whisperModels.forEach(m => console.log(`    ${m.id} (${m.owned_by})`))
  if (whisperModels.length === 0) console.log('    (ninguno, verifica tu API key)')
  console.log('')
  console.log('  GPT:')
  ;[...gptMini, ...gpt4o].forEach(m => console.log(`    ${m.id} (${m.owned_by})`))
  if (gptMini.length === 0 && gpt4o.length === 0) console.log('    (ninguno, verifica tu API key)')
  console.log('')
  console.log('Listo. La app esta lista para transcribir videos.')
} catch (err) {
  console.error('ERROR de conexion con OpenAI:')
  console.error(`  ${err.message}`)

  if (err.status === 401) {
    console.error('')
    console.error('  Tu API key parece invalida. Revisa OPENAI_API_KEY en .env')
  }

  process.exit(1)
}
