import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageBreak,
} from 'docx'

const COLORS = {
  primary: '1F3A5F',
  accent: '2D6BC5',
  dark: '0F141E',
  text: '2D3748',
  muted: '718096',
  white: 'FFFFFF',
  lightBg: 'F7FAFC',
  border: 'E2E8F0',
  green: '276749',
  greenBg: 'F0FFF4',
  amber: '975A16',
  amberBg: 'FFFFF0',
  red: '9B2C2C',
  redBg: 'FFF5F5',
}

const defaultBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 360, after: 180 },
    thematicBreak: level === HeadingLevel.HEADING_1,
  })
}

function bodyText(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120, ...options.spacing },
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        size: 22,
        font: 'Calibri',
        color: COLORS.text,
        ...options.runOptions,
      }),
    ],
  })
}

function boldParagraph(label, value) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, font: 'Calibri', color: COLORS.text }),
      new TextRun({ text: value || '', size: 22, font: 'Calibri', color: COLORS.text }),
    ],
  })
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 300, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        font: 'Calibri',
        color: COLORS.primary,
      }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent },
    },
  })
}

function formatArrayItems(items) {
  if (!items?.length) return [bodyText('Sin datos disponibles')]

  return items.flatMap((item, i) => [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${i + 1}. `,
          bold: true,
          size: 22,
          font: 'Calibri',
          color: COLORS.accent,
        }),
        new TextRun({
          text: typeof item === 'string' ? item : item.title || JSON.stringify(item),
          size: 22,
          font: 'Calibri',
          color: COLORS.text,
        }),
      ],
    }),
  ])
}

function createCardParagraph(label, value) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({ text: value, bold: true, size: 36, font: 'Calibri', color: COLORS.accent }),
      new TextRun({ text: '  ', size: 22 }),
      new TextRun({ text: label, size: 20, font: 'Calibri', color: COLORS.muted }),
    ],
  })
}

function createDataTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: COLORS.primary },
        borders: defaultBorder,
        width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: h, bold: true, size: 20, font: 'Calibri', color: COLORS.white })],
          }),
        ],
      })
    ),
  })

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          borders: defaultBorder,
          shading: ri % 2 === 0 ? { type: ShadingType.SOLID, color: COLORS.lightBg } : undefined,
          width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 50, after: 50 },
              children: [new TextRun({ text: cell, size: 20, font: 'Calibri', color: COLORS.text })],
            }),
          ],
        })
      ),
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })
}

export async function generateDocx(detailedSummary) {
  const db = detailedSummary?.detailed_breakdown || detailedSummary || {}
  const es = detailedSummary?.executive_summary || {}

  const children = []

  children.push(heading('Informe de Transcripcion', HeadingLevel.TITLE))
  children.push(bodyText(`Fecha de generacion: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, { alignment: AlignmentType.LEFT, runOptions: { color: COLORS.muted, size: 20 } }))

  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }))

  // Stats cards
  const statsFields = [
    { label: 'Temas analizados', value: String(db.topics?.length || 0) },
    { label: 'Insights clave', value: String(db.key_insights?.length || 0) },
    { label: 'Conclusiones', value: String(db.conclusions?.length || 0) },
    { label: 'Acciones', value: String(db.action_items?.length || 0) },
    { label: 'Datos concretos', value: String(db.stats_and_facts?.length || 0) },
    { label: 'Decisiones', value: String(db.key_decisions?.length || 0) },
  ]

  children.push(sectionTitle('Resumen General'))
  children.push(...statsFields.map(s => createCardParagraph(s.label, s.value)))
  children.push(new Paragraph({ spacing: { after: 200 }, children: [] }))

  // Main idea
  if (db.main_idea || es.one_liner) {
    children.push(sectionTitle('Idea Central'))
    children.push(bodyText(db.main_idea || es.one_liner))
  }

  // Executive summary
  const execParagraph = es.paragraph || db.executive_paragraph || ''
  if (execParagraph) {
    children.push(sectionTitle('Resumen Ejecutivo'))
    const chunks = execParagraph.split('. ').filter(Boolean)
    for (const chunk of chunks) {
      const sentence = chunk.endsWith('.') ? chunk : chunk + '.'
      children.push(bodyText(sentence.trim()))
    }
  }

  // Key takeaways
  if (es.key_takeaways?.length) {
    children.push(sectionTitle('Puntos Clave (Key Takeaways)'))
    children.push(...formatArrayItems(es.key_takeaways))
  }

  // Topics
  if (db.topics?.length) {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(sectionTitle(`Temas Tratados (${db.topics.length})`))

    for (const topic of db.topics) {
      children.push(new Paragraph({
        spacing: { before: 180, after: 60 },
        children: [new TextRun({ text: topic.title || '', bold: true, size: 24, font: 'Calibri', color: COLORS.primary })],
      }))
      children.push(bodyText(topic.description || ''))
    }
  }

  // Stats and facts
  if (db.stats_and_facts?.length) {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(sectionTitle('Datos y Cifras'))

    const tableHeaders = ['#', 'Dato / Metrica']
    const tableRows = db.stats_and_facts.map((fact, i) => [String(i + 1), fact])

    children.push(createDataTable(tableHeaders, tableRows))
  }

  // Key insights
  if (db.key_insights?.length) {
    children.push(sectionTitle('Insights Clave'))
    children.push(...formatArrayItems(db.key_insights))
  }

  // Conclusions
  if (db.conclusions?.length) {
    children.push(sectionTitle('Conclusiones'))
    children.push(...formatArrayItems(db.conclusions))
  }

  // Key decisions
  if (db.key_decisions?.length) {
    children.push(sectionTitle('Decisiones Clave'))
    children.push(...formatArrayItems(db.key_decisions))
  }

  // Action items
  if (db.action_items?.length) {
    children.push(sectionTitle('Acciones y Proximos Pasos'))
    for (const action of db.action_items) {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: '\u2610  ', size: 24, font: 'Calibri', color: COLORS.accent }),
          new TextRun({ text: action, size: 22, font: 'Calibri', color: COLORS.text }),
        ],
      }))
    }
  }

  // Footer
  children.push(new Paragraph({ spacing: { after: 100 }, children: [] }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border } },
    children: [
      new TextRun({ text: 'Documento generado con TranscribeVideos', size: 18, font: 'Calibri', color: COLORS.muted, italics: true }),
    ],
  }))

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 },
        },
      },
      children,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  return buffer
}
