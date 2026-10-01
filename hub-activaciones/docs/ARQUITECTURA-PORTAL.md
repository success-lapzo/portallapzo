# Arquitectura del Hub dentro de Portal Lapzo

Este documento describe la implementación final. Sustituye a
`INTEGRACION-PORTAL.md`, que era la checklist de lo que faltaba por hacer y ya
no aplica: la integración está hecha.

---

## Dónde vive

```text
portal-lapzo/
├── index.html            login e inicio del portal
├── shared/js/            configuración, cliente Supabase, sesión, permisos, guard
├── centro-reportes/
├── tablero-unificado/
└── hub-activaciones/     ← este módulo
    ├── index.html
    ├── src/css/styles.css
    ├── src/js/00-portal-runtime.js   ← única capa que habla con Supabase
    ├── src/js/01..06                 ← catálogos, vistas y motor (casi intactos)
    ├── assets/
    ├── tools/dev-server.mjs
    └── docs/
```

Ruta propia, mismo origen, sin iframe. El módulo está registrado en
`modulos_portal` con `slug = hub_activaciones` y
`ruta = hub-activaciones/index.html`, así que la tarjeta del inicio aparece sola
para quien tenga el permiso.

## Cómo se conecta

```text
01 catálogos · 03 shell · 04 solicitudes · 05 carga/roadmap
                        │
                02 estado · 06 eventos
                        │
                       HUB            src/js/00-portal-runtime.js
                        │
   LapzoSB · LapzoAuth · LapzoPerms · LapzoGuard      portal-lapzo/shared/js
                        │
                    Supabase
```

El Hub no tiene configuración de Supabase propia, ni cliente propio, ni login
propio: consume la capa compartida del portal. Cambiar de proyecto Supabase se
sigue haciendo en un solo archivo, `shared/js/config.js`.

## Arranque

```text
1. LapzoGuard.requireModule('hub_activaciones')
      sesión válida + usuarios_portal activo + permiso del módulo
2. hub_nivel_actual()                → ae | as | hcs
3. en paralelo: hub_configuracion · hub_catalogos · hub_solicitudes · hub_recursos
4. reconstruir S
5. render() una sola vez
6. cerrar la pantalla de carga
```

Nada protegido se pinta antes del paso 6. Al volver a la pestaña
(`visibilitychange`) se releen los datos, que es lo que hace que el trabajo de
otra persona aparezca sin recargar a mano.

## Mapeo de datos

| En el Hub | En Supabase |
|---|---|
| `S.config` (roster, sprint, slotsDefault) | `hub_configuracion` con `clave='general'`, campo `valor` |
| `S.pesos` y `S.niveles` | `hub_catalogos` `tipo='peso'`, `clave='motor_complejidad'` |
| `S.catalogo.productos[pk]` | `hub_catalogos` `tipo='componente'`, `clave=pk`, `valor.items` |
| `S.categorias[pk]` | `hub_catalogos` `tipo='categoria'`, `clave=pk`, `valor.secciones` |
| `S.solicitudes` | `hub_solicitudes` (una fila por solicitud) |
| `S.recursos[pk]` | `hub_recursos` (una fila por recurso, agrupadas por `producto`) |
| `S.roles` | `hub_usuario_rol` + `usuarios_portal` |
| auditoría | `hub_bitacora` |

### Folio y UUID

La aplicación usa el folio (`SOL-XXXXXXX`) como `s.id`, que es lo que ya
referencian sus vistas. El UUID real de la fila se conserva en `s.__dbId` y en
un mapa `folio → uuid` dentro del runtime, porque los `UPDATE` y la bitácora
central lo necesitan. El UUID no se muestra nunca.

### Solicitudes: columnas

`cuenta`, `ae`, `tipo`, `contexto` y `productos` van directo. Se renombran
`fechaCliente → fecha_cliente`, `vitallyId → vitally_id`,
`cuentaInfo → cuenta_info`, `fechaEntrega → fecha_entrega`. `creadoEn` se lee
de `created_at`, que lo pone Postgres. `creado_por` es siempre el usuario
autenticado; `ae_user_id` se llena solo cuando quien crea es un AE.

## Escrituras

Primero Supabase, después el estado, después el render. Si la base rechaza la
operación, la pantalla no se queda diciendo que guardó algo que no guardó.
Las funciones del Hub conservan su firma original (`guardarSolicitud(id, patch)`,
`guardarConfig(patch)`, `guardarRecursos(pk, items)`…) para no tocar las vistas
ni los manejadores de eventos; lo que cambió es lo que hacen por dentro:

- `guardarSolicitud` actualiza **solo las columnas afectadas**, no la fila completa.
- `guardarCatalogo` recibe el mapa completo de productos, compara con lo que
  había y escribe **solo la fila del producto que cambió**.
- `guardarRecursos` recibe el array completo del producto y lo traduce a alta o
  baja **individual** de filas.
- Cancelar una solicitud es `estado = 'cancelada'`. No hay DELETE, y es
  deliberado.

## Roles

| Nivel | De dónde sale | Puede |
|---|---|---|
| AE | `hub_usuario_rol.nivel = 'ae'` | ver y crear solicitudes, ver roadmap |
| AS | `hub_usuario_rol.nivel = 'as'` | además diagnosticar, asignar, mover sprint y curar recursos |
| HCS | `hub_usuario_rol.nivel = 'hcs'`, o superadmin del portal | además configuración, motor, catálogos y niveles del Hub |

El nivel lo resuelve `hub_nivel_actual()`; si esa función no respondiera, se
cae a leer `hub_usuario_rol` y, en último caso, a `ae`, que es el nivel sin
privilegios. Ya no se deduce probando escrituras contra rutas protegidas.

«Ver como» sigue existiendo como herramienta de QA del HCS: cambia la interfaz
y nada más. La sesión y el nivel real no se tocan, y RLS sigue aplicando lo que
corresponde.

## Lo que ya no está

`claude.use("db")`, `claude.use("mcp")`, `claude.use("downloads")`,
`00-claude-runtime-shim.js`, las claves `lapzo.hub.db/*`, `lapzo.hub.nivel`,
`?nivel=ae|as|hcs`, `detectarRol()` y sus sondas `_probe`. Lo único que sigue
en el navegador es `lapzo.tema` (preferencia visual, no información de negocio)
y la sesión de Supabase Auth, compartida con el portal.

Las descargas de CSV usan `Blob` + `<a download>`, sin ninguna capacidad
externa. Vitally y Google Drive no tienen puente seguro en Portal Lapzo, así que
la aplicación cae a captura manual, que es el camino que ya contemplaba; el
gancho `S.mcp` queda listo para cuando exista un puente del lado del servidor.
