export default {
  // App.vue
  app: {
    settings: 'Configuracion',
    newVideo: 'Nuevo video',
    processing: 'Procesando...',
    costEstimated: 'Coste estimado:',
    twoPass: '2-pass',
  },

  // Tabs
  tabs: {
    transcript: 'Transcripcion',
    summary: 'Resumen',
    infographic: 'Infografia',
  },

  // UploadPanel.vue
  upload: {
    heading: 'Sube un video o audio para transcribir',
    subtitle: 'Genera una transcripcion clara, un resumen util y una infografia visual lista para presentar.',
    dropzone: 'Arrastra un archivo aqui o haz clic para seleccionar',
    dropzoneHint: 'Soporta video y audio hasta 5 GB. El procesamiento queda en tu instancia.',
    modelLabel: 'Modelo para analisis e infografia:',
    gpt4oMini: 'GPT-4o Mini',
    gpt4oMiniDesc: 'Mas rapido y economico para iterar.',
    gpt4o: 'GPT-4o',
    gpt4oDesc: 'Mayor calidad para piezas visuales mas finas.',
    transcribeOnly: 'Solo transcribir',
    transcribeOnlyDesc: 'Sin resumen ni infografia',
    errorFormat: 'Formato no soportado. Usa video (MP4, MOV) o audio (MP3, WAV, M4A, etc.)',
    errorSize: 'Archivo demasiado grande (maximo 5GB)',
  },

  // ProgressTracker.vue
  progress: {
    extracting: 'Extrayendo audio',
    transcribing: 'Transcribiendo',
    summarizing: 'Resumen e infografia',
  },

  // TranscriptView.vue
  transcript: {
    heading: 'Transcripcion completa',
    copy: 'Copiar texto',
    copied: 'Copiado',
    empty: 'No hay transcripcion disponible',
  },

  // SummaryView.vue
  summary: {
    heading: 'Informe Resumen',
    empty: 'No hay resumen disponible',
    pdfTitle: 'Descargar PDF',
    pdf: 'PDF',
    docxTitle: 'Descargar Word',
    docx: 'Word',
    generatingPdf: 'Generando PDF...',
    generatingDocx: 'Generando DOCX...',
    errorDocx: 'Error al generar DOCX',
    pdfFilename: 'informe_resumen.pdf',
    docxFilename: 'informe_resumen.docx',

    // Stats cards
    stats: {
      topics: 'Temas',
      insights: 'Insights',
      takeaways: 'Takeaways',
      conclusions: 'Conclusiones',
      actions: 'Acciones',
      data: 'Datos',
    },

    // Section headings
    sections: {
      mainIdea: 'Idea Central',
      executiveSummary: 'Resumen Ejecutivo',
      keyTakeaways: 'Key Takeaways',
      topics: 'Temas Tratados',
      dataTable: 'Datos y Cifras',
      dataColNum: '#',
      dataColMetric: 'Dato / Metrica',
      keyInsights: 'Insights Clave',
      conclusions: 'Conclusiones',
      keyDecisions: 'Decisiones Clave',
      actions: 'Acciones y Proximos Pasos',
    },

    watermark: 'TranscribeVideos',
  },

  // InfographicView.vue
  infographic: {
    heading: 'Infografia',
    copyHtml: 'Copiar HTML',
    html: 'HTML',
    copied: 'Copiado',
    pdfTitle: 'Descargar PDF',
    pdf: 'PDF',
    generating: 'Generando...',
    pdfFilename: 'infografia.pdf',

    // Synthetic fallback
    synthetic: {
      eyebrow: 'Infografia sintetica',
      noData: 'No hay infografia disponible',
      desc: 'La infografia se genera automaticamente al procesar el video completo.',
      relevant: 'Lo mas relevante',
      topics: 'Temas',
      insights: 'Insights',
      actions: 'Acciones',
      data: 'Datos',
    },

    // Structured sections
    sections: {
      topicsDeep: 'Temas en Profundidad',
      flow: 'Flujo del Contenido',
      keyPoints: 'Puntos Clave',
      nextSteps: 'Proximos Pasos',
    },

    watermark: 'TranscribeVideos',
  },

  // JobHistory.vue
  history: {
    heading: 'Historial de transcripciones',
    loading: 'Cargando historial...',
    delete: 'Eliminar',
    now: 'Ahora',
    minAgo: 'Hace {n} min',
    hourAgo: 'Hace {n} h',
    status: {
      done: 'Completado',
      error: 'Error',
      extracting: 'Procesando',
      transcribing: 'Transcribiendo',
      summarizing: 'Resumiendo',
      pending: 'Pendiente',
    },
  },

  // SettingsModal.vue
  settings: {
    heading: 'Configuracion',
    tabs: {
      providers: 'Proveedores',
      models: 'Modelos',
      prompts: 'Prompts',
    },
  },

  // ProviderSettings.vue
  providerSettings: {
    configured: 'Configurado',
    notConfigured: 'Sin configurar',
    save: 'Guardar',
    test: 'Probar',
    testing: 'Probando...',
    delete: 'Eliminar',
    apiKey: 'API Key',
    credentialsJson: 'Credentials JSON',
    groupId: 'Group ID',
    placeholderSk: 'sk-...',
    placeholderCredentials: '{"type": "service_account", ...}',
    placeholderEy: 'ey...',
    placeholderToken: 'Token...',
    placeholderGroup: 'Grupo...',
    hidden: 'hidden',
    credentialsHidden: 'credentials hidden',
    groupIdHidden: 'group id hidden',
    testSuccess: 'Conexion exitosa',
    testYes: 'Si',
    testNo: 'No',
    testProjects: 'proyectos',
    testErrorPrefix: 'Error:',
  },

  // ModelSettings.vue
  modelSettings: {
    sttProvider: 'Proveedor STT por defecto',
    sttProviderDesc: 'Proveedor de Speech-to-Text usado para nuevas transcripciones.',
    noProviders: 'OpenAI (no configurado)',
    summaryModel: 'Modelo para Resumenes',
    summaryModelDesc: 'Modelo GPT usado para generar resumenes y analisis.',
    twoPass: 'Resumen en 2 pasos',
    twoPassDesc: 'Paso 1 extrae datos brutos. Paso 2 los estructura. Mejor calidad pero ~2x tokens. Solo aplica a transcripciones >1500 palabras.',
    enabled: 'Activado',
    monthlyModel: 'Modelo para Mapas Mensuales',
    monthlyModelDesc: 'Modelo GPT usado para generar el analisis mensual y grafos.',
    gpt4oMini: 'GPT-4o Mini',
    gpt4oMiniDesc: 'Economico y rapido (recomendado)',
    gpt4o: 'GPT-4o',
    gpt4oDesc: 'Mayor calidad, mas costoso',
    gpt41: 'GPT-4.1',
    gpt41Desc: 'Ultimo modelo, maxima calidad',
    gpt4oMiniMonthly: 'GPT-4o Mini',
    gpt4oMiniMonthlyDesc: 'Economico para mapas mensuales',
    gpt4oMonthly: 'GPT-4o',
    gpt4oMonthlyDesc: 'Mayor calidad en grafos',
    save: 'Guardar preferencias',
    saving: 'Guardando...',
    saved: 'Guardado',
  },

  // PromptSettings.vue
  promptSettings: {
    extraction: 'Extraccion (Paso 1 del resumen)',
    extractionDesc: 'Extrae datos brutos de la transcripcion sin estructurar.',
    structuring: 'Estructuracion (Paso 2 del resumen)',
    structuringDesc: 'Estructura los datos extraidos en JSON analitico.',
    singlePass: 'Resumen Single-Pass',
    singlePassDesc: 'Usado cuando el resumen en 2 pasos esta desactivado.',
    infographic: 'Infografia',
    infographicDesc: 'Genera infografia HTML visual por cada video procesado.',
    custom: 'Personalizado',
    default: 'Default',
    chars: ' chars',
    save: 'Guardar',
    saving: 'Guardando...',
    restore: 'Restaurar default',
    saved: 'Guardado',
    error: 'Error al guardar',
  },

  // ProviderSelector.vue
  providerSelector: {
    label: 'STT:',
    empty: 'No hay proveedores configurados',
  },

  // api.js
  api: {
    uploadError: 'Error al subir el video',
    jobError: 'Error al obtener estado del job',
    docxError: 'Error al generar DOCX',
    htmlError: 'Error al generar HTML',
  },
}
