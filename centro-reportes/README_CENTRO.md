# Centro de Reportes

Portal interno que centraliza los reportes, dashboards, generadores y diagnósticos construidos
sobre datos de Lapzo. Cada artefacto sigue siendo un archivo HTML independiente: el portal es
únicamente una capa de navegación, clasificación y búsqueda encima de ellos.

Estado actual: **11 reportes · 4 clientes · 8 categorías · 6 módulos**.

---

## Qué es el Centro de Reportes

Antes había una carpeta con archivos HTML sueltos. Ahora hay un punto de entrada único desde el
cual puedes:

- ver todos los reportes existentes y cuáles son los más recientes;
- saber de qué cliente, categoría y módulo es cada uno;
- buscar por título, cliente, módulo, categoría, tipo, descripción o tag;
- filtrar y ordenar el catálogo;
- marcar reportes como destacados;
- abrir cualquier artefacto sin salir del portal, o en una pestaña nueva;
- agregar reportes nuevos sin volver a tocar la interfaz.

Lo que el portal **no** hace: modificar los reportes. No cambia sus estilos, cálculos, tablas,
gráficas ni textos. Se abren dentro de un `iframe` aislado o en pestaña nueva, así que el CSS del
portal nunca los alcanza.

---

## Cómo está estructurado

```text
CENTRO_REPORTES/
│
├── index.html                  Portada y contenedor único de todas las vistas
├── README.md                   Este archivo
├── INTEGRATION_REPORT.md       Bitácora de la integración de los 10 artefactos
│
├── assets/
│   ├── css/hub.css             Estilos del portal (nunca de los reportes)
│   └── js/
│       ├── catalog.js          Capa de datos: carga, búsqueda, filtros, orden, agrupaciones
│       └── hub.js              Interfaz: rutas, vistas, tarjetas, visor
│
├── data/
│   ├── reports.json            Fuente maestra del catálogo (formato estándar)
│   └── reports.js              Misma información como variable global (para usar con file://)
│
└── reportes/
    ├── fevisa/
    │   ├── indicadores-capacitacion/index.html
    │   └── indicadores-capacitacion-consolidado/index.html
    ├── palos-garza/
    │   └── informe-cursos/index.html
    ├── general/                Reportes multicliente (los que sirven para cualquier cuenta)
    │   ├── nom035-guia-ii/index.html
    │   ├── nom035-guia-iii/index.html
    │   ├── clima-organizacional/index.html
    │   ├── avance-pid-cursos-extras/index.html
    │   └── avance-diagnosticos/index.html
    └── interno/                Herramientas de uso interno de Lapzo
        ├── diagnostico-kickoff/index.html
        ├── elegibilidad-taas/index.html
        └── generador-renovaciones/index.html
```

La convención es `reportes/<cliente>/<reporte>/index.html`. Cada reporte vive en su propia carpeta
para que, si algún día uno necesita imágenes, CSS o JSON propios, puedas ponerlos junto a él sin
afectar a los demás.

Las vistas del portal (`Inicio`, `Todos los reportes`, `Recientes`, `Destacados`, `Clientes`,
`Categorías`, `Módulos`, `Acerca del Hub`) no son archivos: son rutas dentro de `index.html`, con
la forma `#/vista?filtro=valor`. Eso significa que puedes copiar y compartir una URL con filtros
aplicados, por ejemplo `index.html#/reportes?cliente=FEVISA&orden=az`.

---

## Cómo abrirlo

Haz doble clic en `index.html`. Nada más. No hace falta instalar ni levantar nada.

El portal funciona así porque los datos se cargan desde `data/reports.js`, no con `fetch()`.

Una advertencia sobre el visor: al abrir con `file://`, algunos navegadores restringen mostrar
archivos locales dentro de un `iframe`. Si eso pasa, el visor detecta la falla y muestra el botón
**Abrir en pestaña nueva**, que siempre funciona. Probado en Chromium: el visor incrustado
funciona con `file://` sin problema. Si tu navegador es más estricto, usa el servidor local
(ver más abajo).

---

## Cómo funciona reports.js

Es el catálogo expuesto como variable global:

```javascript
window.REPORTS_META = { ... };
window.REPORTS_DATA = [ { id: "report-001", ... }, ... ];
```

`index.html` lo carga con una etiqueta `<script>` normal, así que no depende de `fetch()` ni de un
servidor. **Este es el archivo que el portal lee en la práctica.**

## Cómo funciona reports.json

Es la misma información en formato JSON estándar, con un bloque `meta` y un arreglo `reportes`:

```json
{
  "meta": { "version_catalogo": "1.0.0", "fecha_catalogo": "2026-09-04", "total_reportes": 10 },
  "reportes": [ { "id": "report-001", "...": "..." } ]
}
```

Sirve para dos cosas: ser la fuente legible y versionable del catálogo, y funcionar como respaldo
automático. Si `data/reports.js` faltara y el portal estuviera servido por HTTP, `catalog.js`
intenta `fetch("data/reports.json")` por su cuenta.

**Los dos archivos deben tener el mismo contenido.** Si editas uno, edita el otro.

### Campos de un reporte

| Campo | Obligatorio | Para qué sirve |
|---|---|---|
| `id` | sí | Identificador único (`report-011`, …) |
| `titulo` | sí | Nombre visible en la tarjeta y el visor |
| `archivo` | sí | Ruta al HTML, relativa a `index.html` |
| `cliente` | sí | Agrupa la vista Clientes y alimenta el filtro |
| `categoria` | sí | Agrupa la vista Categorías |
| `modulo` | sí | Agrupa la vista Módulos y define el color del lomo de la tarjeta |
| `tipo` | sí | Dashboard, Generador de reportes, Checklist, Instrumento… |
| `fecha` | sí | `AAAA-MM-DD`. Ordena Recientes y alimenta el filtro por año |
| `descripcion` | sí | Una línea; es lo que se lee en la tarjeta |
| `tags` | no | Máximo 3 se muestran en la tarjeta |
| `destacado` | no | `true` lo pone en la sección Destacados |
| `nota` | no | Aviso corto sobre una limitación real del artefacto; se muestra en su tarjeta |
| `descripcion_larga` | no | Detalle extendido, para consulta |
| `periodo`, `estado`, `origen` | no | Contexto de trazabilidad |
| `archivo_original` | no | Nombre del archivo tal como llegó, para rastrearlo |
| `autocontenido`, `requiere_internet`, `librerias` | no | Dependencias técnicas del artefacto |
| `riesgo_movimiento` | no | Bajo / Medio / Alto, según sus dependencias |

Si un dato no se puede determinar con certeza, no lo inventes: usa `"No especificado"`,
`"Sin clasificar"` u `"Otros"`. La capa de datos rellena con esas etiquetas cualquier campo vacío.

---

## Cómo agregar un reporte

**Paso 1.** Copia el HTML en su carpeta:

```text
reportes/<cliente>/<nombre-del-reporte>/index.html
```

Usa slugs en minúsculas y con guiones para las carpetas (`clima-organizacional`,
`evaluacion-360`, `nom035-guia-iii`). El HTML dentro puede llamarse `index.html` o conservar su
nombre original; si lo conservas, apunta a él en el campo `archivo`.

**Paso 2.** Agrega el registro al final del arreglo, en `data/reports.js` **y** en
`data/reports.json`:

```javascript
{
  "id": "report-011",
  "titulo": "Evaluación 360° — Resultados",
  "cliente": "Cliente A",
  "categoria": "Evaluaciones",
  "modulo": "Evaluaciones y Clima",
  "tipo": "Dashboard",
  "fecha": "2026-09-15",
  "descripcion": "Resultados consolidados del ciclo 360° por competencia y área.",
  "archivo": "reportes/cliente-a/evaluacion-360/index.html",
  "tags": ["360", "Competencias"],
  "destacado": false
}
```

**Paso 3.** Recarga el portal. Aparece solo: contadores del Home, filtros, opciones de los
selectores, vista de clientes, categorías, módulos, recientes y conteos del sidebar se recalculan
a partir del catálogo. No hay ningún número ni lista escrita a mano en la interfaz.

## Cómo eliminar un reporte

Borra su objeto de `data/reports.js` y de `data/reports.json`. Si además quieres eliminar el
archivo, borra su carpeta dentro de `reportes/`. Quitar solo el registro es útil cuando quieres
ocultar un reporte del portal sin perderlo.

## Cómo modificar un reporte

Para cambiar cómo se ve en el portal (título, descripción, tags, fecha), edita su registro en los
dos archivos de datos. Para cambiar el reporte en sí, edita su HTML dentro de `reportes/`; el
portal no necesita saberlo.

## Cómo cambiar su cliente

Cambia el valor de `cliente`. La vista Clientes y el filtro se reconstruyen solos; si el cliente
no existía, se crea. Mover también la carpeta a `reportes/<nuevo-cliente>/` es opcional y solo
por orden: si lo haces, actualiza `archivo`.

## Cómo cambiar su categoría

Cambia el valor de `categoria`. Si la categoría anterior se queda sin reportes, desaparece del
portal automáticamente.

## Cómo marcarlo como destacado

Pon `"destacado": true`. Aparece en la sección Destacados del Home, en la vista Destacados y con
una estrella en su tarjeta. Si ningún reporte está destacado, esa sección no se dibuja: no verás
un bloque vacío.

## Cómo agregar una nueva categoría

No hay lista de categorías que mantener. Escribe el nombre nuevo en el campo `categoria` de
cualquier reporte y la categoría existe. Lo mismo aplica a clientes, módulos y tipos.

Un detalle sobre módulos: el color del lomo de cada tarjeta está asociado al módulo. Los cinco
módulos actuales tienen color asignado en `assets/css/hub.css`:

```css
[data-mod="Evaluaciones y Clima"]        { --mod: var(--purple); }
[data-mod="Capacitación y Aprendizaje"]  { --mod: var(--mint); }
[data-mod="Desarrollo por Competencias"] { --mod: var(--pink); }
[data-mod="Activación"]                  { --mod: var(--amber); }
[data-mod="Comercial y TaaS"]            { --mod: var(--teal); }
[data-mod="Customer Success"]            { --mod: var(--blue); }
```

Hoy son seis. Un módulo nuevo funciona igual sin tocar el CSS: recibe el color neutro. Si quieres darle uno
propio, agrega una línea con el mismo patrón.

---

## Cómo mover reportes

1. Revisa primero de qué depende el artefacto (siguiente sección).
2. Mueve la carpeta completa, no solo el HTML.
3. Actualiza el campo `archivo` en `data/reports.js` y `data/reports.json`.
4. Abre el reporte desde el portal y comprueba que carga, con sus estilos, gráficas y tablas.

Los 11 reportes actuales son HTML autocontenidos y se movieron sin ningún ajuste. El detalle está
en `INTEGRATION_REPORT.md`.

## Cómo evitar romper rutas

Antes de mover un artefacto, búscale dependencias relativas:

```bash
grep -oE '(src|href)="[^"]+"' reportes/cliente/reporte/index.html | grep -v 'http'
grep -oE 'fetch\(|url\(|import ' reportes/cliente/reporte/index.html
```

Y clasifícalo:

| Riesgo | Cómo se ve | Qué hacer |
|---|---|---|
| **Bajo** | HTML autocontenido, sin rutas relativas | Se mueve libremente |
| **Medio** | Usa imágenes o CSS relativos | Mover la carpeta completa, con todo dentro |
| **Alto** | Depende de varios scripts, `fetch()`, JSON o estructuras externas | Dejarlo donde está y apuntar `archivo` a su ubicación original |

La regla es funcionalidad primero, orden después: no reorganices un archivo solo por estética si
eso puede romperlo.

## Conexión a internet

8 de los 11 reportes cargan librerías desde un CDN (Chart.js, SheetJS, ExcelJS, pdfmake,
PapaParse, html2canvas, jsPDF, pdf.js, JSZip, Tesseract.js, Tabler Icons, Poppins) y necesitan red
para funcionar completamente. Los otros 3 traen todo incluido. El campo `requiere_internet` de cada registro lo
indica, y la vista *Acerca del Hub* muestra el conteo al día.

El portal en sí solo pide una cosa a la red: la tipografía Poppins. Sin conexión cae al tipo de
letra del sistema y todo lo demás funciona igual.

### Un caso aparte: el Generador de Renovaciones

`reportes/interno/generador-renovaciones/index.html` llama a la API de Claude
(`api.anthropic.com`) para extraer los datos del acuerdo anterior, y lo hace sin enviar una llave:
depende de que la llave la inyecte el entorno de artefactos de claude.ai. Abierto como archivo
local o desde un hosting propio, todo el flujo funciona salvo el paso de extracción con IA, que
devolverá un error de la API. Por eso su registro lleva el campo `nota`, que se muestra como aviso
en su tarjeta. Si algún día necesitas usarlo fuera de claude.ai, habría que agregarle la llave o
capturar los datos a mano en los pasos siguientes.

---

## Cómo ejecutarlo mediante servidor local

Solo hace falta si tu navegador bloquea el visor incrustado con `file://`. Desde la carpeta
`CENTRO_REPORTES/`:

```bash
python -m http.server 8000
```

Y abre `http://localhost:8000`. Alternativa con Node:

```bash
npx serve .
```

## Cómo publicarlo posteriormente

La carpeta es un sitio estático, sin build ni backend, así que se publica tal cual:

- **GitHub Pages**: sube la carpeta a un repositorio y activa Pages sobre la rama principal. Es
  el mismo camino que ya se usa en `success-lapzo.github.io`.
- **Cualquier hosting estático** (Netlify, Vercel, S3, un directorio de intranet): arrastra la
  carpeta.

Dos cosas antes de publicar. Primero, revisa el contenido: varios artefactos son herramientas
internas y los datos que procesan son de clientes, así que si el sitio va a ser público conviene
protegerlo con acceso restringido. Segundo, al servirse por HTTP el visor incrustado funciona sin
excepciones y `reports.json` queda disponible como respaldo real.
