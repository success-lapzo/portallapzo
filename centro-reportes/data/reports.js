/* ============================================================================
   CENTRO DE REPORTES — METADATOS DE PRESENTACIÓN
   ----------------------------------------------------------------------------
   Copia exacta de data/reports.json expuesta como variable global.

   IMPORTANTE: este archivo NO otorga permisos. Un artefacto se muestra solo si
   Supabase (public.artefactos, filtrado por RLS) lo devuelve para el usuario
   autenticado. Aquí viven únicamente categoría, módulo, tipo, tags, fechas y
   descripciones, que se cruzan con esos artefactos.

   Si editas este archivo, edita también data/reports.json.
   ============================================================================ */

window.REPORTS_META = {
  "nombre": "Centro de Reportes",
  "organizacion": "Lapzo",
  "version_catalogo": "2.1.0",
  "fecha_catalogo": "2026-10-01",
  "total_reportes": 12,
  "nota": "Metadatos de presentación del Centro de Reportes. La autorización NO vive aquí: un artefacto se muestra solo si Supabase (public.artefactos) lo devuelve para el usuario. Ver README del portal."
};

window.REPORTS_DATA = [
  {
    "id": "report-001",
    "titulo": "Generador de Reportes NOM-035 · Guía de Referencia III",
    "cliente": "Multicliente",
    "categoria": "NOM-035",
    "modulo": "Evaluaciones y Clima",
    "tipo": "Generador de reportes",
    "fecha": "2026-08-31",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Convierte el export crudo de la plataforma en el PDF ejecutivo y el Excel de resultados de la Guía III.",
    "descripcion_larga": "Carga la base de datos (.xlsx) exportada de Lapzo y el logo del cliente, y genera el PDF ejecutivo (portada, metodología, resultados por categoría, dominio y departamento, anexo individual por colaborador, bandera de seguimiento, hallazgos y recomendaciones) más el Excel de resultados con el detalle por colaborador, categoría, dominio y departamento. Incluye observaciones de calidad de datos cuando faltan Departamento o Puesto.",
    "archivo": "reportes/general/nom035-guia-iii/index.html",
    "archivo_original": "Generador_Reportes_NOM035_GuiaIII.html",
    "origen": "Generales",
    "tags": [
      "NOM-035",
      "Guía III",
      "Riesgo psicosocial",
      "PDF",
      "Excel"
    ],
    "destacado": true,
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "Chart.js 4.4.0",
      "SheetJS 0.18.5",
      "ExcelJS 4.3.0",
      "pdfmake 0.2.7"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-002",
    "titulo": "Generador de Reportes NOM-035 · Guía de Referencia II",
    "cliente": "Multicliente",
    "categoria": "NOM-035",
    "modulo": "Evaluaciones y Clima",
    "tipo": "Generador de reportes",
    "fecha": "2026-07-03",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Genera el PDF ejecutivo y el Excel de resultados de la Guía II a partir del export de la plataforma.",
    "descripcion_larga": "Versión Guía de Referencia II del generador NOM-035. Produce el PDF ejecutivo con portada, metodología, resultados por categoría, dominio y departamento, anexo individual por colaborador y valoración médica, además del Excel de resultados con el detalle completo.",
    "archivo": "reportes/general/nom035-guia-ii/index.html",
    "archivo_original": "Generador_Reportes_NOM035_GuiaII.html",
    "origen": "Generales",
    "tags": [
      "NOM-035",
      "Guía II",
      "Riesgo psicosocial",
      "PDF",
      "Excel"
    ],
    "destacado": false,
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "Chart.js 4.4.0",
      "SheetJS 0.18.5",
      "ExcelJS 4.3.0",
      "pdfmake 0.2.7"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-003",
    "titulo": "Indicadores de Capacitación",
    "cliente": "FEVISA",
    "categoria": "Capacitación",
    "modulo": "Capacitación y Aprendizaje",
    "tipo": "Dashboard",
    "fecha": "2026-08-15",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Procesa el reporte detallado de Lapzo y construye los indicadores de capacitación en el navegador.",
    "descripcion_larga": "Flujo por pasos: carga del reporte detallado (.csv/.xlsx), mapeo confirmable de columnas, clasificación de cursos por competencia y dashboard de indicadores. Admite el Plan Maestro de Capacitación opcional para calcular eventos y participantes planeados con la fuente oficial. Permite guardar y volver a cargar la configuración. Todo el procesamiento ocurre en el navegador.",
    "archivo": "reportes/fevisa/indicadores-capacitacion/index.html",
    "archivo_original": "FEVISA indicadores.html",
    "origen": "Clientes especificos/Fevisa",
    "tags": [
      "Indicadores",
      "Capacitación",
      "Plan Maestro",
      "Competencias"
    ],
    "destacado": true,
    "autocontenido": true,
    "requiere_internet": false,
    "librerias": [
      "Chart.js (incluida)",
      "ExcelJS (incluida)",
      "PapaParse (incluida)"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-004",
    "titulo": "Indicadores de Capacitación · FEVISA",
    "cliente": "FEVISA",
    "categoria": "Capacitación",
    "modulo": "Capacitación y Aprendizaje",
    "tipo": "Dashboard",
    "fecha": "2026-08-14",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Base consolidada, cumplimiento y calificaciones a partir del reporte colaborador + curso + lección.",
    "descripcion_larga": "Toma el reporte consolidado de Lapzo (colaborador + curso + lección) y construye la base sin duplicar cursos, personas ni horas. Permite capturar la población objetivo por razón social y puesto para calcular el indicador de cumplimiento, y muestra horas por razón social, cumplimiento y distribución teórico / práctico.",
    "archivo": "reportes/fevisa/indicadores-capacitacion-consolidado/index.html",
    "archivo_original": "Indicadores_Capacitacion_FEVISA ultimo.html",
    "origen": "Clientes especificos/Fevisa",
    "tags": [
      "Indicadores",
      "Cumplimiento",
      "Horas",
      "Razón social"
    ],
    "destacado": false,
    "autocontenido": true,
    "requiere_internet": false,
    "librerias": [
      "Chart.js (incluida)",
      "SheetJS (incluida)"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-005",
    "titulo": "Generador de Reporte de Avance PID",
    "cliente": "Multicliente",
    "categoria": "Desarrollo",
    "modulo": "Desarrollo por Competencias",
    "tipo": "Generador de reportes",
    "fecha": "2026-08-11",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Convierte la data cruda del cliente en un reporte ejecutivo de avance de PID en PDF, listo para enviar.",
    "descripcion_larga": "Se capturan nombre del cliente, fecha del reporte, color primario de la instancia y logo en versión blanca; se carga el Excel con la hoja \"Resultado consulta\" y el tool genera la vista previa y el PDF ejecutivo de avance del PID, incluyendo cursos del plan y cursos adicionales.",
    "archivo": "reportes/general/avance-pid-cursos-extras/index.html",
    "archivo_original": "Avance PID y Cursos Extras.html",
    "origen": "Generales",
    "tags": [
      "PID",
      "Cursos",
      "Avance",
      "PDF"
    ],
    "destacado": true,
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "Chart.js 4.4.0",
      "SheetJS 0.18.5",
      "html2canvas 1.4.1",
      "jsPDF 2.5.1"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-006",
    "titulo": "Generador de Reporte de Avance de Diagnósticos",
    "cliente": "Multicliente",
    "categoria": "Diagnósticos",
    "modulo": "Desarrollo por Competencias",
    "tipo": "Generador de reportes",
    "fecha": "2026-07-09",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Sube la data cruda de Lapzo y obtén el PDF ejecutivo de avance y resultados de diagnósticos.",
    "descripcion_larga": "Personaliza portada y acento visual con nombre del cliente, fecha, color primario y logo blanco. A partir del Excel con la hoja \"Resultado consulta\" arma la vista previa navegable con zoom y descarga el PDF ejecutivo de avance y resultados de diagnósticos.",
    "archivo": "reportes/general/avance-diagnosticos/index.html",
    "archivo_original": "Avance y resultados de Diagnosticos.html",
    "origen": "Generales",
    "tags": [
      "Diagnósticos",
      "Competencias",
      "Avance",
      "PDF"
    ],
    "destacado": false,
    "autocontenido": true,
    "requiere_internet": false,
    "librerias": [
      "Chart.js (incluida)",
      "SheetJS (incluida)",
      "jsPDF (incluida)"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-007",
    "titulo": "Generador de Clima Organizacional",
    "cliente": "Multicliente",
    "categoria": "Clima",
    "modulo": "Evaluaciones y Clima",
    "tipo": "Generador de reportes",
    "fecha": "2026-06-24",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Informe ejecutivo automático de clima organizacional por dimensión a partir de un Excel o CSV.",
    "descripcion_larga": "Captura nombre del cliente y fecha del informe, carga el archivo de datos (.xlsx, .xls o .csv) usando la columna \"Sección\" como dimensión, muestra la vista previa de lo detectado y genera el informe completo con resumen ejecutivo, metodología, resultados por dimensión, resultados por área y preguntas destacadas, exportable a PDF.",
    "archivo": "reportes/general/clima-organizacional/index.html",
    "archivo_original": "clima_organizacional_lapzo.html",
    "origen": "Generales",
    "tags": [
      "Clima",
      "Dimensiones",
      "PDF"
    ],
    "destacado": false,
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "SheetJS 0.18.5",
      "Tabler Icons 2.44.0"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-008",
    "titulo": "Generador de Informe de Cursos",
    "cliente": "Palos Garza",
    "categoria": "Capacitación",
    "modulo": "Capacitación y Aprendizaje",
    "tipo": "Generador de Excel",
    "fecha": "2026-06-25",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Carga el reporte detallado de cursos en CSV y descarga el informe consolidado en Excel.",
    "descripcion_larga": "Toma el reporte detallado de cursos descargado de la plataforma (el nombre del archivo es libre mientras conserve la estructura esperada), muestra la vista previa del informe y descarga Informe_Resultados_Cursos.xlsx.",
    "archivo": "reportes/palos-garza/informe-cursos/index.html",
    "archivo_original": "Palos Garza Tabla de Cursos v2.html",
    "origen": "Clientes especificos/Palos Garza",
    "tags": [
      "Cursos",
      "Excel",
      "Consolidado"
    ],
    "destacado": false,
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "PapaParse 5.4.1",
      "ExcelJS 4.4.0"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-009",
    "titulo": "Checklist de elegibilidad TaaS",
    "cliente": "Lapzo (interno)",
    "categoria": "TaaS",
    "modulo": "Comercial y TaaS",
    "tipo": "Checklist",
    "fecha": "2026-08-14",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Evalúa en minutos si un prospecto es apto para el modelo Talent-as-a-Service.",
    "descripcion_larga": "19 criterios agrupados en bloques (perfil del cliente, champion y gobierno, entre otros) con criterios bloqueantes, clave y generales, score ponderado con indicador circular y umbral de 85% para considerar al cliente listo para TaaS. Incluye la validación automática de hasta 150 licencias y el mínimo de 6 meses antes de la renovación del contrato. Las respuestas se envían a Google Sheets.",
    "archivo": "reportes/interno/elegibilidad-taas/index.html",
    "archivo_original": "elegibilidad_TaaS.html",
    "origen": "Internos",
    "tags": [
      "TaaS",
      "Elegibilidad",
      "Score",
      "Comercial"
    ],
    "destacado": true,
    "autocontenido": true,
    "requiere_internet": true,
    "librerias": [],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-010",
    "titulo": "Diagnóstico de Kick-off",
    "cliente": "Lapzo (interno)",
    "categoria": "Activación",
    "modulo": "Activación",
    "tipo": "Instrumento",
    "fecha": "2026-06-30",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Instrumento de activación de 4 dimensiones que alimenta el plan de implementación y el score de preparación.",
    "descripcion_larga": "Se captura la información del cliente y los módulos contratados (Capacitación y Aprendizaje, Desarrollo por Competencias, Evaluaciones y Clima, Estrategia y Ejecución) y las secciones se muestran según lo contratado. Las cuatro dimensiones —empezando por Objetivo de Negocio, con 30% del score— alimentan el plan de implementación personalizado y el score de preparación en Vitally.",
    "archivo": "reportes/interno/diagnostico-kickoff/index.html",
    "archivo_original": "Diagnostico_KickOff_v4.html",
    "origen": "Internos",
    "tags": [
      "Activación",
      "Kick-off",
      "Onboarding",
      "Score"
    ],
    "destacado": false,
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "Google Fonts (Poppins)"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-011",
    "titulo": "Generador de Renovaciones Lapzo",
    "cliente": "Lapzo (interno)",
    "categoria": "Renovaciones",
    "modulo": "Customer Success",
    "tipo": "Generador de documentos",
    "fecha": "2026-09-08",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Arma el acuerdo de renovación a partir del acuerdo anterior y genera la propuesta económica del Anexo A.",
    "descripcion_larga": "Flujo de 9 pasos: acuerdo anterior, validación, logo del cliente, renovación, personas, productos, forma de pago, resumen y generación del acuerdo. Lee el acuerdo previo en DOCX o PDF (con OCR cuando el PDF viene escaneado), lo toma como plantilla autoritativa, aplica la inflación y los nuevos valores, compara acuerdo anterior contra renovación, señala inconsistencias entre el acuerdo y la propuesta, y entrega el documento con el Anexo A comparativo.",
    "archivo": "reportes/interno/generador-renovaciones/index.html",
    "archivo_original": "Generador_de_acuerdos_de_servicio_con_propuesta_de_renovación.html",
    "origen": "Internos",
    "tags": [
      "Renovaciones",
      "Acuerdos",
      "Anexo A",
      "Customer Success"
    ],
    "destacado": false,
    "nota": "La extracción con IA solo funciona dentro de claude.ai",
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "pdf.js 3.11.174",
      "JSZip 3.10.1",
      "jsPDF 2.5.1",
      "html2canvas 1.4.1",
      "Tesseract.js 5.1.0",
      "API de Claude"
    ],
    "riesgo_movimiento": "Bajo"
  },
  {
    "id": "report-012",
    "titulo": "Indicadores de Capacitación · FEVISA (Supabase)",
    "cliente": "FEVISA",
    "categoria": "Capacitación",
    "modulo": "Capacitación y Aprendizaje",
    "tipo": "Dashboard",
    "fecha": "2026-10-01",
    "periodo": "No especificado",
    "estado": "Vigente",
    "descripcion": "Indicadores de capacitación con el Maestro de colaboradores vivo en Supabase.",
    "descripcion_larga": "Versión conectada a Supabase: inicia sesión con la cuenta del portal, carga el Maestro de colaboradores desde public.maestro_colaboradores con paginación y cruza el reporte de actividad de Lapzo contra ese maestro. Siete pestañas: cumplimiento FEVISA, horas, calificaciones, detalle por colaborador, maestro de colaboradores, base procesada y calidad de datos. La captura de capacitación presencial admite el curso como opcional: sin curso la cantidad es el headcount de personas del rol, y con curso alimenta el detalle de cobertura por competencia. Solo INSERT y UPDATE sobre el maestro; no implementa DELETE.",
    "archivo": "reportes/fevisa/indicadores-capacitacion-supabase/index.html",
    "archivo_original": "Indicadores_Capacitacion_FEVISA.html",
    "origen": "Clientes especificos/Fevisa",
    "tags": [
      "Indicadores",
      "Supabase",
      "Maestro",
      "Presencial"
    ],
    "destacado": true,
    "autocontenido": false,
    "requiere_internet": true,
    "librerias": [
      "@supabase/supabase-js 2.45.4",
      "SheetJS (incluida)",
      "Chart.js (incluida)"
    ],
    "riesgo_movimiento": "Bajo"
  }
];
