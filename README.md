# Portal Lapzo

Portal interno que reúne el **Centro de Reportes** y el **Tablero Unificado** detrás de un solo
inicio de sesión. La autenticación y los permisos viven en Supabase; el sitio sigue siendo HTML,
CSS y JavaScript estático, sin build ni backend, publicable en GitHub Pages.

```text
Portal Lapzo
│
├── Login                  Supabase Auth (correo y contraseña)
├── Inicio                 Solo los módulos que Supabase autoriza
├── Centro de Reportes     Reportes y análisis por empresa
├── Tablero Unificado      KPIs de Activaciones y TaaS
├── Hub de Activaciones    Solicitudes, roadmap y capacidad del equipo
└── Administrar accesos    Solo para superadmin
```

---

## Configuración

Todo está en un único archivo: **`shared/js/config.js`**.

```javascript
window.LAPZO_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_...",
  AUTH_STORAGE_KEY: "lapzo_portal_auth",
  ...
};
```

- **`SUPABASE_URL`**: Supabase → Project Settings → API → *Project URL*.
- **`SUPABASE_PUBLISHABLE_KEY`**: la misma pantalla, *Publishable key* (la que empieza con
  `sb_publishable_`). Está pensada para viajar en el navegador: la seguridad real la dan Supabase
  Auth y las políticas RLS.
- **`AUTH_STORAGE_KEY`**: la clave con la que se guarda la sesión. La comparten el portal, los dos
  módulos y el artefacto de FEVISA, y por eso basta iniciar sesión una vez. Si la cambias, cámbiala
  también dentro de
  `centro-reportes/reportes/fevisa/indicadores-capacitacion-supabase/index.html`
  (busca `LS_KEY`).

Cambiar de proyecto Supabase es editar esas dos líneas. No hay URL ni llave repetidas en otros
archivos.

**Nunca** agregues aquí ni en ningún otro archivo `service_role`, secret key, contraseña de la base
de datos o JWT secret. El portal no los necesita y el repositorio es estático: cualquiera que abra
el sitio puede leer estos archivos.

---

## Cómo ejecutarlo localmente

Levanta un servidor y abre `http://localhost:8000`:

```bash
cd portal-lapzo
python -m http.server 8000
```

Con Node: `npx serve .`

No lo abras con `file://`. El login necesita hacer peticiones a Supabase y los navegadores
bloquean parte de eso en archivos locales. El sitio publicado siempre será HTTP/HTTPS.

---

## Cómo publicarlo en GitHub Pages

1. Sube la carpeta `portal-lapzo/` a un repositorio.
2. Settings → Pages → *Deploy from a branch*, rama principal, carpeta raíz.
3. En Supabase → Authentication → URL Configuration, agrega la URL publicada a *Site URL* y a
   *Redirect URLs*.

Funciona igual en la raíz de un dominio (`reportes.lapzo.com/`) que en un subpath
(`usuario.github.io/portal-lapzo/`): no hay rutas absolutas. La base se deduce de la URL con la que
se cargó `shared/js/config.js`, y todo lo demás se resuelve contra ella con `LapzoPaths.resolve()`.
Por eso las rutas que guardes en Supabase deben ser **relativas a la raíz del portal y sin barra
inicial**:

```text
centro-reportes/index.html                       ← modulos_portal.ruta
centro-reportes/reportes/fevisa/xxx/index.html   ← artefactos.ruta
```

---

## Estructura de carpetas

```text
portal-lapzo/
│
├── index.html                  Login, inicio y administración de accesos
├── README.md
│
├── shared/
│   ├── css/portal.css          Estilos del portal (no se cargan en los módulos)
│   └── js/
│       ├── config.js           URL y llave de Supabase + resolución de rutas
│       ├── supabase.js         Cliente único (SDK o respaldo REST)
│       ├── auth.js             Sesión y usuarios_portal
│       ├── permissions.js      Módulos, empresas y artefactos permitidos
│       ├── guard.js            requireAuth / requireModule / requireCompany
│       ├── portal.js           Pantallas de login e inicio
│       └── admin.js            Administrar accesos
│
├── centro-reportes/            Módulo 1 (proyecto original + guard)
│   ├── index.html
│   ├── assets/{css,js}
│   ├── data/reports.{js,json}  Metadatos de presentación
│   └── reportes/…              Los artefactos, sin modificar
│
├── tablero-unificado/
│   └── index.html              Módulo 2 (bundle generado + guard)
│
├── hub-activaciones/           Módulo 3 (HTML/CSS/JS vanilla)
│   ├── index.html
│   ├── src/js/00-portal-runtime.js   única capa que habla con Supabase
│   └── src/js/01..06, src/css, docs/
│
└── sql/
    └── registro_artefactos.sql Para registrar el catálogo en Supabase
```

### Cómo encaja cada pieza

```text
Supabase Auth
      ↓
usuarios_portal  ──→ ¿existe y está activo?         auth.js
      ↓
rol_global       ──→ superadmin ve todo             permissions.js
      ↓
usuario_modulo   ──→ modulos_portal (activos)       → tarjetas del inicio
      ↓
usuario_empresa  ──→ empresas (activas)             → agrupación del Centro
      ↓
                     artefactos (activos)           → catálogo visible
```

RLS es la frontera real. El portal muestra lo que Supabase le devuelve; esconder una tarjeta no
protege nada y no se usa como mecanismo de seguridad.

---

## Cómo agregar un nuevo módulo

1. Crea la carpeta con su `index.html` (por ejemplo `renovaciones/index.html`).
2. Registra el módulo en Supabase:

```sql
insert into public.modulos_portal (slug, nombre, descripcion, ruta, activo, orden)
values ('renovaciones', 'Renovaciones', 'Acuerdos y propuestas de renovación.',
        'renovaciones/index.html', true, 3);
```

3. Protege la página nueva agregando al final de su `<body>`:

```html
<script src="../shared/js/config.js"></script>
<script src="../shared/js/supabase.js"></script>
<script src="../shared/js/auth.js"></script>
<script src="../shared/js/permissions.js"></script>
<script src="../shared/js/guard.js"></script>
<script>
window.LapzoGuard.protect({
  module: "renovaciones",
  nombre: "Renovaciones",
  userMenu: "#portalBar",          // un div vacío donde quieras la barra
  onReady: function () { /* aquí arranca tu módulo */ }
});
</script>
```

4. Asigna el módulo a quien lo necesite desde **Administrar accesos**.

No hay que tocar el inicio: la tarjeta aparece sola. Si quieres darle icono y color propios,
agrégalo a `MODULE_UI` en `config.js`; sin eso funciona igual con el estilo por defecto.

## Cómo agregar una nueva empresa

```sql
insert into public.empresas (slug, nombre, descripcion, activo, orden)
values ('ibc', 'IBC', 'Descripción corta.', true, 2);
```

Después, en **Administrar accesos**, márcala para los usuarios que deban verla y elige su rol
(`admin`, `usuario` o `lector`). Los superadmins la ven sin necesidad de asignación.

Ojo con la dependencia: las empresas solo tienen sentido para quien tiene el módulo **Centro de
Reportes**. La pantalla de administración desactiva el selector de empresas si ese módulo no está
activo y lo explica en pantalla.

## Cómo agregar un nuevo artefacto

1. Copia el HTML en `centro-reportes/reportes/<empresa>/<slug>/index.html`.
2. Regístralo en Supabase (esto es lo que lo hace visible):

```sql
insert into public.artefactos (empresa_id, slug, nombre, descripcion, ruta, activo, orden)
select id, 'evaluacion-360', 'Evaluación 360°', 'Resultados del ciclo 360°.',
       'centro-reportes/reportes/ibc/evaluacion-360/index.html', true, 10
  from public.empresas where slug = 'ibc';
```

3. Opcional pero recomendado: agrega sus metadatos de presentación en
   `centro-reportes/data/reports.js` **y** `reports.json` (categoría, módulo, tipo, tags, fecha,
   descripción). El Centro cruza los dos por la ruta o por el slug de la carpeta.

Sin el paso 2 el artefacto no se muestra a nadie, aunque el archivo exista y aparezca en
`reports.js`. Es a propósito: **Supabase decide qué se ve, `reports.js` solo decide cómo se ve.**
Cuando faltan registros, un superadmin ve en la portada del Centro un aviso con la lista de
pendientes.

Para dar de alta de una vez los artefactos que ya venían en el Centro, usa
`sql/registro_artefactos.sql`.

---

## Usuarios y permisos

Los usuarios se crean en **Supabase → Authentication** y luego se agregan a `public.usuarios_portal`.
El portal no crea cuentas: no tiene registro público ni usa `service_role`, y eso es deliberado.

| Rol global | Qué implica |
|---|---|
| `superadmin` | Acceso global a lo que RLS permita. No necesita filas en `usuario_modulo` ni `usuario_empresa`. Ve *Administrar accesos*. |
| `usuario` | Solo lo que tenga asignado explícitamente. |

El rol `admin` de una empresa (en `usuario_empresa`) permite administrar recursos de esa empresa
donde RLS lo autorice — por ejemplo el maestro de colaboradores de FEVISA — y **no** equivale a
superadmin del portal: no crea usuarios ni toca otras empresas.

Al quitar un acceso desde la pantalla de administración se marca `activo = false` en lugar de
borrar el renglón, para conservar la trazabilidad. Los permisos no se guardan en `localStorage`:
se cachean unos segundos dentro de la misma carga de página y en el siguiente reload manda Supabase.

---

## Detalles que conviene conocer

**Sesión compartida.** Un solo cliente de Supabase (`shared/js/supabase.js`) y una sola clave de
almacenamiento. Cambiar de módulo no vuelve a pedir contraseña, y cerrar sesión en cualquier
pantalla cierra en todas, incluido el artefacto de FEVISA.

**Si el CDN está bloqueado.** El portal intenta cargar `@supabase/supabase-js` desde jsDelivr; si
la red corporativa lo bloquea, cae automáticamente a llamadas `fetch` contra la API REST y Auth de
Supabase, con la misma interfaz. Ambos caminos están probados.

**Orden de arranque.** Ninguna página protegida pinta nada antes de: inicializar Supabase →
restaurar sesión → validar `usuarios_portal` → validar el módulo. Mientras eso ocurre se ve
*Cargando tus accesos…*, así que nadie alcanza a ver un módulo que no le corresponde. Entrar por
URL directa no evita la comprobación.

**Sin conexión.** El portal no deja entrar con permisos viejos guardados en el navegador: avisa que
necesita conexión para validar la sesión.

**returnUrl.** Si alguien abre un módulo sin sesión, se le manda al login con el destino guardado y
vuelve ahí después de entrar. Solo se aceptan rutas internas del portal; una URL externa se
descarta.

**Datos del Hub de Activaciones.** Sus solicitudes, catálogos, recursos y
configuración viven en las tablas `hub_*` de Supabase. Ya no usa `localStorage`
como base ni depende del entorno de Claude. Además del permiso del módulo, cada
persona necesita un nivel operativo (AE / AS / HCS) en `hub_usuario_rol`, que se
asigna dentro del propio Hub en Ajustes → Accesos; los superadministradores del
portal entran como HCS. El detalle está en el README de ese módulo.

**Datos del Tablero.** Desde la migración de persistencia, el Tablero Unificado guarda sus datos
en Supabase (`tablero_semanas`, `tablero_semana_filas`, `tablero_semana_kpis`,
`tablero_reportes`, `tablero_cohort_history`, `tablero_preferencias_usuario` y
`tablero_bitacora`). Ya no usa `localStorage` para nada de negocio: una semana que carga alguien
la ven los demás desde otra computadora. El detalle está en el README del proyecto del tablero.

El bundle del tablero trae su propia comprobación de sesión y de permiso del módulo, y su propia
barra de retorno al portal, así que integrarlo es solo copiar `dist/index.html` en
`tablero-unificado/index.html`. No hace falta ningún parche adicional.

**Lo que no se toca desde la aplicación.** El portal no ejecuta `CREATE TABLE`, `ALTER TABLE`,
`CREATE POLICY` ni `DROP POLICY`, no borra `usuarios_artefacto` (queda como respaldo heredado) y no
implementa `DELETE` sobre `maestro_colaboradores`.

---

## Solución de problemas

| Síntoma | Qué revisar |
|---|---|
| "Tu usuario no tiene acceso al Portal Lapzo" | Falta su renglón en `usuarios_portal` con el mismo `user_id` que en Authentication. |
| "Tu usuario está inactivo" | `usuarios_portal.activo = false`. |
| Entra pero no ve módulos | Faltan filas activas en `usuario_modulo`, o `modulos_portal.activo = false`. |
| El Centro abre vacío | No hay artefactos activos en Supabase para sus empresas. Corre `sql/registro_artefactos.sql`. |
| Un reporte abre en blanco | `artefactos.ruta` no coincide con la carpeta real. Debe ser relativa a la raíz del portal. |
| "No fue posible consultar tus permisos" | Revisa la consola del navegador: ahí queda el detalle técnico (nombre de tabla o columna, o una política RLS que niega la lectura). |
| El visor del Centro no muestra el artefacto | Usa *Abrir en pestaña nueva*; el visor siempre ofrece esa salida. |
