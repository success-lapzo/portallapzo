# Hub de Activaciones — Lapzo

Tablero de solicitudes, diagnóstico, capacidad y roadmap del equipo de
Activaciones. Es un módulo de **Portal Lapzo**: mismo login, mismos permisos, y
todos sus datos en **Supabase**.

Sigue siendo HTML, CSS y JavaScript vanilla, sin bundler y sin paso de
compilación.

---

## Qué cambió

Antes el Hub era la exportación de un artifact de Claude: la base era
`localStorage`, el nivel de acceso se deducía probando escrituras y los
conectores venían del entorno de Claude. Nada de eso queda.

| Antes | Ahora |
|---|---|
| `claude.use("db")` sobre `localStorage` | Supabase, a través de la capa compartida del portal |
| claves `lapzo.hub.db/*` | `hub_configuracion`, `hub_catalogos`, `hub_solicitudes`, `hub_recursos` |
| `detectarRol()` con sondas `_probe` | `hub_nivel_actual()` |
| `?nivel=ae\|as\|hcs`, `lapzo.hub.nivel` | `hub_usuario_rol` |
| `sistema/roles` como identidad propia | `usuarios_portal` + Supabase Auth |
| `claude.use("downloads")` | descarga nativa del navegador |
| textos «claude.ai → Conectores» | mensajes de Portal Lapzo |

Lo único que sigue guardándose en el navegador es `lapzo.tema` (claro u oscuro,
que no es información de negocio) y la sesión de Supabase Auth, que es la misma
del portal y por eso no hay un segundo login.

**Lo que no cambió:** el diseño, la navegación, el motor de complejidad, el
cálculo de slots, el diagnóstico, el roadmap, los sprints, los filtros, las
exportaciones a CSV, los criterios de activación y las vistas AE / AS / HCS.

---

## Cómo se usa

```text
Portal Lapzo → Login → Hub de Activaciones
```

Para entrar hacen falta dos cosas:

1. acceso al módulo **Hub de Activaciones** en Portal Lapzo
   (`usuario_modulo`, se administra en *Administrar accesos*);
2. un nivel operativo en el Hub (`hub_usuario_rol`), que el HCS asigna desde
   **Ajustes → Accesos**.

Quien entre directo a `/hub-activaciones/index.html` sin sesión va al login del
portal y vuelve aquí después de entrar. Sin permiso del módulo ve *Acceso
denegado* y el Hub no se pinta.

### Niveles

| Nivel | Puede |
|---|---|
| **AE** | ver y crear solicitudes, consultar el roadmap de sus clientes |
| **AS** | además diagnosticar, marcar componentes, asignar sprint y activador, curar recursos |
| **HCS** | además configuración, motor de complejidad, catálogos, equipo y niveles del Hub |

Quien sea superadministrador de Portal Lapzo entra como HCS. Esa regla vive en
la base, no en la pantalla.

La interfaz oculta lo que el nivel no puede hacer, pero eso no es la seguridad:
la seguridad son las políticas RLS de Supabase. Si alguien fuerza una operación
que no le toca, la base la rechaza y el Hub lo dice en lenguaje claro.

---

## Cómo se ejecuta en local

Desde la raíz del portal:

```bash
cd portal-lapzo
python3 -m http.server 8000
```

Y abre `http://localhost:8000` (el portal) o directo
`http://localhost:8000/hub-activaciones/index.html`.

El servidor incluido en `tools/dev-server.mjs` sirve solo esta carpeta, así que
no alcanza `../shared/js`. Para trabajar en el Hub, sirve la raíz del portal.

**No lo abras con `file://`**: el login y las consultas a Supabase no funcionan
así.

## Cómo se publica

Es un sitio estático: se publica la carpeta del portal completa. Funciona igual
en la raíz de un dominio que en un subpath de GitHub Pages
(`usuario.github.io/portal-lapzo/`), porque no hay rutas absolutas: el regreso
al portal se resuelve con `LapzoPaths`.

## Configuración

No hay ninguna en este módulo. La URL y la llave de Supabase están en
`portal-lapzo/shared/js/config.js`, que es el único punto de configuración.
La publishable key está pensada para viajar en el navegador; **nunca** agregues
`service_role`, secret key, contraseña de base de datos ni JWT secret.

---

## Tablas que usa

Todas existen ya en el proyecto de Portal Lapzo. Este módulo no crea ni
modifica tablas, políticas ni funciones.

| Tabla | Para qué |
|---|---|
| `hub_configuracion` | roster del equipo, sprint en curso y slots por defecto (`clave='general'`) |
| `hub_catalogos` | componentes por producto, pesos y niveles del motor, y secciones de recursos |
| `hub_solicitudes` | una fila por solicitud, con su diagnóstico, componentes y criterios |
| `hub_recursos` | una fila por recurso, agrupadas por producto |
| `hub_usuario_rol` | nivel operativo AE / AS / HCS |
| `hub_bitacora` | auditoría: quién cambió qué y de qué estado a cuál |
| `usuarios_portal`, `modulos_portal`, `usuario_modulo` | identidad y permiso del módulo (del portal) |

Funciones que consulta: `hub_nivel_actual()`. El resto de la autorización la
aplican las políticas RLS.

### Cosas que conviene saber

- **No se borran solicitudes.** La tabla no permite DELETE y es deliberado:
  cancelar una solicitud la deja en `estado = 'cancelada'`, que sale de la
  capacidad pero conserva el historial.
- **El roadmap y la capacidad no tienen tabla propia.** Se calculan desde
  `hub_solicitudes` y el roster, con el mismo motor de siempre.
- **Los catálogos pueden estar vacíos.** Es válido: el HCS los llena desde
  Ajustes. El Hub no siembra nada en la base por su cuenta.
- **`hub_solicitudes.bitacora`** se conserva por compatibilidad con las vistas,
  pero la trazabilidad oficial es `hub_bitacora`.

## Estructura

```text
hub-activaciones/
├── index.html                        carga la capa compartida del portal y el Hub
├── src/css/styles.css                diseño del Hub (no se mezcla con portal.css)
├── src/js/
│   ├── 00-portal-runtime.js          ÚNICA capa que habla con Supabase
│   ├── 01-catalogos.js               productos, semáforos, flags, rutas, criterios, motor
│   ├── 02-estado-persistencia.js     estado S, accesores, capacidad, persistencia
│   ├── 03-shell-navegacion.js        shell, rail, cabecera, vistas de producto
│   ├── 04-solicitudes-diagnostico.js bandeja, ficha y diagnóstico
│   ├── 05-carga-roadmap-proceso.js   carga, roadmap, proceso y ajustes
│   └── 06-eventos-arranque.js        eventos, cierre de sprint y arranque
├── assets/
├── docs/ARQUITECTURA-PORTAL.md       cómo está armada la integración
└── tools/dev-server.mjs              servidor estático de apoyo
```

El orden de los scripts importa: originalmente todo era un solo `<script>`, así
que los archivos comparten el ámbito global y se cargan en secuencia, sin
`defer` y sin `type="module"`.

---

## Conectores externos

Vitally y Google Drive se consultaban desde el entorno de Claude. Portal Lapzo
no tiene todavía un puente seguro para eso, y meter esas credenciales en el
navegador no es una opción. Así que el Hub cae al camino que ya contemplaba:

- **Cuentas:** se escribe el nombre a mano al crear la solicitud.
- **Recursos:** se agregan pegando su enlace.

El gancho está listo (`S.mcp`): el día que exista un puente del lado del
servidor, se conecta ahí sin tocar las vistas.

## Limitaciones conocidas

- **No se probó contra el Supabase real.** Los nombres de columnas, la firma de
  `hub_nivel_actual()` y el comportamiento de las políticas se tomaron de la
  especificación. Si algo no coincide, el usuario ve un mensaje claro y el
  detalle técnico queda en la consola del navegador. Es lo primero que conviene
  revisar al desplegar: entrar, crear una solicitud y mirar la consola.
- **Cerrar sprint no es una transacción única.** Actualiza varias solicitudes y
  después la configuración, en secuencia controlada: no se muestra éxito antes
  de terminar, se informa cuántas fallaron si alguna falla, y al final se relee
  todo desde Supabase. Si se quisiera atómico haría falta una RPC nueva, que no
  se creó por indicación expresa.
- **Sin realtime.** Los cambios de otras personas aparecen al recargar o al
  volver a la pestaña. Bastaría suscribirse a `postgres_changes` si el proyecto
  ya lo tiene habilitado para estas tablas.
- **Los datos del artifact no se migran.** Es intencional: la base del artifact
  se considera vacía.
