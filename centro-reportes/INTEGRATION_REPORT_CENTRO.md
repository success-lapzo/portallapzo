# Reporte de integración

Bitácora de la consolidación de los artefactos HTML en el Centro de Reportes.

```text
Artefactos recibidos ............ 11
Artefactos integrados ........... 11
Modificados ...................... 0   (copia idéntica byte a byte, verificada con md5)
Con dependencias externas (CDN) ... 8
Con riesgo alto de movimiento ..... 0
Errores detectados ................ 0
Requieren clasificación manual .... 1   (ver "Pendientes de tu revisión")
```

Fuente inicial: `Artefactos_Claude.rar` (10 artefactos) · integrado el 4 de septiembre de 2026
Incorporación posterior: `Generador_de_acuerdos_de_servicio_con_propuesta_de_renovación.html`
· integrado el 8 de septiembre de 2026 · catálogo v1.1.0

---

## 1. Inventario

Las fechas provienen de la fecha de modificación registrada en el RAR: ninguno de los archivos
contiene una fecha propia en su contenido.

| # | Archivo original | Carpeta de origen | Cliente | Reporte | Categoría | Módulo | Tipo | Fecha | Peso | Riesgo |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `Generador_Reportes_NOM035_GuiaIII.html` | Generales | Multicliente | NOM-035 Guía III | NOM-035 | Evaluaciones y Clima | Generador | 2026-08-31 | 91 KB | Bajo |
| 2 | `Generador_Reportes_NOM035_GuiaII.html` | Generales | Multicliente | NOM-035 Guía II | NOM-035 | Evaluaciones y Clima | Generador | 2026-07-03 | 73 KB | Bajo |
| 3 | `FEVISA indicadores.html` | Clientes especificos/Fevisa | FEVISA | Indicadores de Capacitación | Capacitación | Capacitación y Aprendizaje | Dashboard | 2026-08-15 | 1365 KB | Bajo |
| 4 | `Indicadores_Capacitacion_FEVISA ultimo.html` | Clientes especificos/Fevisa | FEVISA | Indicadores de Capacitación · FEVISA | Capacitación | Capacitación y Aprendizaje | Dashboard | 2026-08-14 | 1152 KB | Bajo |
| 5 | `Avance PID y Cursos Extras.html` | Generales | Multicliente | Avance PID | Desarrollo | Desarrollo por Competencias | Generador | 2026-08-11 | 65 KB | Bajo |
| 6 | `Avance y resultados de Diagnosticos.html` | Generales | Multicliente | Avance de Diagnósticos | Diagnósticos | Desarrollo por Competencias | Generador | 2026-07-09 | 1683 KB | Bajo |
| 7 | `clima_organizacional_lapzo.html` | Generales | Multicliente | Clima Organizacional | Clima | Evaluaciones y Clima | Generador | 2026-06-24 | 32 KB | Bajo |
| 8 | `Palos Garza Tabla de Cursos v2.html` | Clientes especificos/Palos Garza | Palos Garza | Informe de Cursos | Capacitación | Capacitación y Aprendizaje | Generador de Excel | 2026-06-25 | 42 KB | Bajo |
| 9 | `elegibilidad_TaaS.html` | Internos | Lapzo (interno) | Checklist de elegibilidad TaaS | TaaS | Comercial y TaaS | Checklist | 2026-08-14 | 83 KB | Bajo |
| 10 | `Diagnostico_KickOff_v4.html` | Internos | Lapzo (interno) | Diagnóstico de Kick-off | Activación | Activación | Instrumento | 2026-06-30 | 130 KB | Bajo |
| 11 | `Generador_de_acuerdos_de_servicio_con_propuesta_de_renovación.html` | Internos (entrega posterior) | Lapzo (interno) | Generador de Renovaciones Lapzo | Renovaciones | Customer Success | Generador de documentos | 2026-09-08 | 303 KB | Bajo |

### Cómo se determinó cada dato

- **Título**: leído de la etiqueta `<title>` y del `<h1>` real de cada archivo.
- **Cliente**: de la carpeta de origen. `Generales/` corresponde a herramientas que funcionan con
  cualquier cuenta, por lo que se registraron como *Multicliente*; `Internos/` como
  *Lapzo (interno)*. No se inventó ningún nombre de cliente.
- **Categoría, módulo, tipo**: del contenido visible de cada artefacto. Los nombres de módulo se
  tomaron de los que el propio `Diagnostico_KickOff_v4.html` declara (Capacitación y Aprendizaje,
  Desarrollo por Competencias, Evaluaciones y Clima, Estrategia y Ejecución), más *Activación* y
  *Comercial y TaaS* para los dos artefactos internos. *Estrategia y Ejecución* no se usó porque
  ningún artefacto pertenece a ese módulo hoy.
- **Descripción y tags**: extraídos de los encabezados y textos de instrucciones reales de cada
  archivo. No hay descripciones redactadas desde cero ni resúmenes reinterpretados.
- **Fecha**: fecha de modificación en el RAR.
- **Periodo y estado**: ningún artefacto declara un periodo de datos, así que quedaron como
  `"No especificado"` y `"Vigente"` respectivamente.

---

## 2. Mapa de dependencias

Ninguno de los 10 artefactos tiene rutas relativas, imágenes externas, CSS separado, `fetch()` a
archivos locales, `import` de módulos ni `url()` apuntando a recursos del disco. Las únicas
coincidencias con `src=`/`href=` relativos que aparecieron en el análisis son plantillas de
JavaScript (`${LOGO_DATAURL}`, `${STATE.logoDataUrl}`, `${e.target.result}`), es decir imágenes
que el propio tool inyecta como data URL en tiempo de ejecución. Por eso el riesgo de movimiento
es Bajo en todos los casos.

| # | Reporte | Librerías | Origen | Necesita red |
|---|---|---|---|---|
| 1 | NOM-035 Guía III | Chart.js 4.4.0, SheetJS 0.18.5, ExcelJS 4.3.0, pdfmake 0.2.7 | CDN (cdnjs) | Sí |
| 2 | NOM-035 Guía II | Chart.js 4.4.0, SheetJS 0.18.5, ExcelJS 4.3.0, pdfmake 0.2.7 | CDN (cdnjs) | Sí |
| 3 | Indicadores de Capacitación | Chart.js, ExcelJS, PapaParse | Incluidas en el archivo | No |
| 4 | Indicadores de Capacitación · FEVISA | Chart.js, SheetJS | Incluidas en el archivo | No |
| 5 | Avance PID | Chart.js 4.4.0, SheetJS 0.18.5, html2canvas 1.4.1, jsPDF 2.5.1 | CDN (cdnjs) | Sí |
| 6 | Avance de Diagnósticos | Chart.js, SheetJS, jsPDF | Incluidas en el archivo | No |
| 7 | Clima Organizacional | SheetJS 0.18.5, Tabler Icons 2.44.0 | CDN (cdnjs, jsDelivr) | Sí |
| 8 | Informe de Cursos | PapaParse 5.4.1, ExcelJS 4.4.0 | CDN (cdnjs, jsDelivr) | Sí |
| 9 | Checklist TaaS | Ninguna | — | Sí, solo para enviar a Google Sheets |
| 10 | Diagnóstico de Kick-off | Poppins | Google Fonts | Sí, solo para la tipografía |
| 11 | Generador de Renovaciones | pdf.js 3.11.174, JSZip 3.10.1, jsPDF 2.5.1, html2canvas 1.4.1, Tesseract.js 5.1.0 (carga diferida), API de Claude | CDN (cdnjs) + api.anthropic.com | Sí |

Los tres archivos grandes (#3, #4, #6, entre 1.1 y 1.7 MB) pesan justamente porque llevan sus
librerías incrustadas. Eso los vuelve los más portátiles del conjunto: funcionan sin conexión.

El #11 es el único con una dependencia que no es una librería: llama a `api.anthropic.com` para
extraer los datos del acuerdo anterior, y lo hace sin enviar llave, así que solo funciona dentro
del entorno de artefactos de claude.ai. Está documentado más abajo.

---

## 3. Decisiones de arquitectura

**Renombrado a `index.html` dentro de carpetas con slug.** Los nombres originales tenían espacios,
versiones y sufijos (`FEVISA indicadores.html`, `Palos Garza Tabla de Cursos v2.html`,
`Diagnostico_KickOff_v4.html`) que obligan a codificar la URL y no dicen mucho. Como los 10
archivos son autocontenidos, renombrarlos no rompe nada. El nombre original quedó registrado en el
campo `archivo_original` de cada registro, así que la trazabilidad hacia el RAR se conserva.

**Carpeta por reporte, no archivo suelto.** Aunque hoy ninguno necesita recursos adicionales, cada
artefacto tiene su propia carpeta para que mañana pueda llevar imágenes, CSS o JSON propios sin
tocar a los demás.

**`general/` e `interno/` como clientes.** Las carpetas `Generales` e `Internos` del RAR no son
clientes, pero sí son una distinción real y útil, así que se conservaron como agrupación con las
etiquetas *Multicliente* y *Lapzo (interno)*.

**Dos artefactos de FEVISA, no uno.** `FEVISA indicadores.html` y
`Indicadores_Capacitacion_FEVISA ultimo.html` resuelven cosas distintas (mapeo de columnas y Plan
Maestro el primero; base consolidada y cumplimiento por razón social el segundo). Se integraron
como dos reportes separados; no se fusionaron ni se descartó ninguno.

**Catálogo doble sincronizado.** `data/reports.json` es la fuente legible; `data/reports.js` se
generó a partir de él con un script, para que el portal abra con `file://` sin servidor y sin
riesgo de que los dos archivos digan cosas distintas.

**Módulo nuevo para el Generador de Renovaciones.** No entró a *Comercial y TaaS* porque no es
TaaS. Su propio encabezado dice "Generador de Renovaciones Lapzo · Customer Success", así que se
registró en un módulo *Customer Success*, con color azul asignado en el CSS. La categoría
*Renovaciones* también es nueva y salió del mismo contenido.

**Campo `nota` en el catálogo.** El Generador de Renovaciones es el primer artefacto con una
limitación que el usuario necesita ver antes de abrirlo, no después. Se agregó un campo opcional
`nota` que se muestra como aviso en la tarjeta. Los otros 10 registros no lo llevan, y cualquier
reporte futuro puede usarlo o no.

**Visor bajo demanda.** El Home nunca monta un `iframe`: los artefactos se cargan solo al pulsar
*Ver reporte*, y al cerrar el visor su `src` vuelve a `about:blank` para liberar memoria. Con
archivos de 1.7 MB esto importa.

---

## 4. Problemas encontrados y solución aplicada

### Artefactos

**Extracción del RAR.** El archivo es RAR 5 y las herramientas disponibles inicialmente no
soportaban su método de compresión (`ERROR: Unsupported Method` en los 10 archivos). Se resolvió
extrayendo con `unar`. Sin efecto sobre el contenido: los 10 archivos salieron completos.

**Ningún artefacto presentó rutas rotas, scripts faltantes ni errores de JavaScript.** No se
aplicó ninguna corrección sobre su contenido, porque no hizo falta ninguna.

**El Generador de Renovaciones depende del entorno de claude.ai.** Su función `callClaude()` hace
`fetch` a `https://api.anthropic.com/v1/messages` con `model: claude-sonnet-4-6` y sin cabecera de
autenticación: la llave la inyecta el entorno de artefactos. Servido desde esta carpeta, el flujo
de 9 pasos abre y funciona, pero el paso de extracción con IA devolverá un error HTTP de la API.
No se modificó el archivo: la limitación quedó registrada en su campo `nota`, visible en la
tarjeta, y explicada en el README. Si se necesita usarlo fuera de claude.ai hay dos caminos:
agregar la llave al artefacto (con el riesgo de exponerla en un archivo estático) o capturar los
datos a mano en los pasos siguientes, que ya son editables.

### Portal

Cuatro defectos propios se detectaron durante el QA visual y se corrigieron antes de la entrega:

| Problema | Causa | Solución |
|---|---|---|
| El lomo de color y el punto de módulo no se pintaban | La declaración `--mod: var(--mod, …)` es cíclica y CSS la descarta | Se declara primero el color neutro y luego los específicos |
| Iconos SVG invisibles en botones y estrellas | El tamaño estaba definido solo para los iconos del sidebar | Regla única `svg.ic { width: 16px; height: 16px }` |
| Nombre y conteo pegados en las tarjetas de agrupación (`Multicliente5 reportes`) | El contenedor de texto no era columna | Se agregó `.g-body` con `flex-direction: column` |
| Contorno púrpura alrededor de toda la vista al navegar | El contenedor recibe el foco al cambiar de ruta, por accesibilidad, y el navegador lo dibujaba | Se anula el contorno solo en ese contenedor, conservando el foco para lectores de pantalla |
| El contenedor del visor compartía el atributo `data-open` con los botones "Ver reporte" | Mismo nombre para dos cosas distintas: un clic dentro del visor abierto disparaba el manejador sin efecto | El estado del visor pasó a `data-viewer-open` |

También se corrigió un dato del catálogo: el reporte 3 se había registrado con SheetJS cuando en
realidad usa ExcelJS y PapaParse. Se verificó ejecutando cada artefacto y comprobando qué
librerías quedan disponibles en `window`.

---

## 5. QA ejecutado

Pruebas automatizadas con Chromium (Playwright), sirviendo el portal por HTTP y abriéndolo también
como archivo local.

### Portal

| Prueba | Resultado |
|---|---|
| Home abre y renderiza | Pasa |
| Sidebar con 8 accesos y conteos vivos | Pasa (11 / 4 / 4 / 8 / 6) |
| Indicadores calculados del catálogo | Pasa (11 reportes, 4 clientes, 8 categorías, 6 módulos) |
| Buscador global instantáneo | Pasa (`nom` → 6 resultados, sin recargar) |
| Filtro por cliente | Pasa (FEVISA → 2) |
| Filtro por categoría, módulo, tipo, año | Pasa |
| Solo destacados | Pasa (4) |
| Filtro de texto en la barra de controles | Pasa (`clima` → 4, incluye coincidencias por módulo) |
| Limpiar filtros | Pasa (vuelve a 11) |
| Ordenamiento A–Z / Z–A / recientes / antiguos / cliente / categoría | Pasa |
| Estado de los filtros reflejado en la URL | Pasa (`#/reportes?cliente=FEVISA`) |
| Vista Recientes | Pasa (11 ordenados por fecha) |
| Vista Destacados | Pasa (4) |
| Vista Clientes | Pasa (4 grupos con conteo y última fecha) |
| Filtro por cliente Lapzo (interno) | Pasa (3: Renovaciones, TaaS, Kick-off) |
| Búsqueda sin acentos (`renovacion`) | Pasa (2 coincidencias) |
| Aviso del campo `nota` visible en la tarjeta | Pasa |
| Vista Categorías | Pasa (8 grupos) |
| Vista Módulos | Pasa (6 grupos con color) |
| Vista Acerca del Hub | Pasa |
| Estado vacío en búsqueda sin resultados | Pasa (mensaje con salida) |
| Visor abre, muestra título, cliente, categoría y fecha | Pasa |
| Escape cierra el visor y libera el `iframe` | Pasa (`src` vuelve a `about:blank`) |
| Errores de JavaScript en consola | 0 |

### Compatibilidad `file://`

| Prueba | Resultado |
|---|---|
| `index.html` abre por doble clic | Pasa |
| Catálogo cargado desde `reports.js` | Pasa |
| Búsqueda y filtros | Pasa (`taas` → 1 resultado) |
| Visor incrustado con `file://` | Pasa (artefacto cargado dentro del `iframe`) |
| Respaldo *Abrir en pestaña nueva* disponible siempre | Pasa |

### Artefactos, uno por uno

Cada reporte se abrió de forma individual desde su nueva ubicación. Se verificó título, texto
renderizado, cantidad de nodos, tipografía propia aplicada, librerías disponibles y errores de
consola.

| # | Reporte | Abre | Estilos y tipografía propios | Scripts y librerías | Errores JS |
|---|---|---|---|---|---|
| 1 | NOM-035 Guía III | Sí | Sí | CDN (sin red en el entorno de prueba) | 0 |
| 2 | NOM-035 Guía II | Sí | Sí | CDN (sin red en el entorno de prueba) | 0 |
| 3 | Indicadores de Capacitación | Sí | Sí (IBM Plex Sans) | Chart.js, ExcelJS, PapaParse activas | 0 |
| 4 | Indicadores · FEVISA | Sí | Sí (IBM Plex Sans) | Chart.js, SheetJS activas | 0 |
| 5 | Avance PID | Sí | Sí | CDN (sin red en el entorno de prueba) | 0 |
| 6 | Avance de Diagnósticos | Sí | Sí | Chart.js, SheetJS, jsPDF activas | 0 |
| 7 | Clima Organizacional | Sí | Sí | CDN (sin red en el entorno de prueba) | 0 |
| 8 | Informe de Cursos | Sí | Sí (Inter) | CDN (sin red en el entorno de prueba) | 0 |
| 9 | Checklist TaaS | Sí | Sí | No usa librerías | 0 |
| 10 | Diagnóstico de Kick-off | Sí | Sí (Poppins) | No usa librerías | 0 |
| 11 | Generador de Renovaciones | Sí | Sí | CDN + API de Claude (ver observación) | 0 |

Sobre la columna de librerías: el entorno donde se ejecutó el QA bloquea cdnjs, jsDelivr y Google
Fonts, así que en los reportes que dependen de CDN se confirmó que la estructura, los estilos y el
JavaScript propio funcionan, y que las peticiones fallidas son exactamente las de CDN esperadas.
Con conexión normal esos reportes cargan sus librerías como siempre.

### Integridad

Se comparó el md5 de los 11 archivos originales contra las 11 copias integradas: **coinciden en su
totalidad**. No se modificó ni un byte de ningún artefacto.

### Validación visual

| Prueba | Resultado |
|---|---|
| Textos largos se adaptan (títulos de dos líneas, descripciones a 3 líneas) | Pasa |
| Aviso de dos líneas en la tarjeta sin desalinear la cuadrícula | Pasa |
| Tarjetas alineadas en cuadrícula, sin desbordes | Pasa |
| Filtros no se montan entre sí | Pasa |
| Sidebar no tapa contenido | Pasa |
| Modal del visor a pantalla completa, con barra fija | Pasa |
| Móvil 390 px sin scroll horizontal | Pasa (0 px de desbordamiento) |
| Menú móvil abre, cierra por fondo y por Escape | Pasa |
| Foco de teclado visible | Pasa |
| `prefers-reduced-motion` respetado | Pasa |

---

## 6. Pendientes de tu revisión

Solo hay un punto que conviene que confirmes, y no bloquea nada:

**`FEVISA indicadores.html` (reporte 3) podría no ser específico de FEVISA.** Está en la carpeta
de FEVISA, pero su título dice "Indicadores de Capacitación · Lapzo", no menciona al cliente en
ningún texto y tiene mapeo de columnas configurable, carga de configuración y Plan Maestro
opcional: parece la versión generalizable del reporte 4. Se dejó como FEVISA porque es lo que dice
la fuente. Si en realidad es multicliente, basta cambiar `"cliente": "Multicliente"` en su
registro; mover la carpeta a `reportes/general/` es opcional.

Dos cosas más que quizá quieras ajustar, ya que son criterio y no dato:

- **Destacados.** Quedaron marcados cuatro: NOM-035 Guía III, Indicadores de Capacitación,
  Avance PID y Checklist TaaS. Se eligieron por ser los más recientes de su módulo. Cámbialos con
  el campo `destacado`.
- **Categorías.** Los reportes de PID y de diagnósticos quedaron en categorías distintas
  (*Desarrollo* y *Diagnósticos*) aunque comparten módulo. Si prefieres una sola categoría, cambia
  el campo `categoria` en ambos y la vista se reordena sola.
- **Módulo del Generador de Renovaciones.** Quedó en *Customer Success*, tomado de su propio
  encabezado. Si prefieres agruparlo con el checklist de TaaS bajo *Comercial y TaaS*, cambia el
  campo `modulo` y el módulo vacío desaparece solo.
