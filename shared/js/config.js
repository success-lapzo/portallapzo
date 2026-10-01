/* ============================================================================
   PORTAL LAPZO · configuración pública
   ----------------------------------------------------------------------------
   Único lugar donde viven la URL y la llave de Supabase. Cambiar de proyecto
   Supabase se hace aquí y en ningún otro archivo.

   Aquí solo van valores PÚBLICOS. La publishable key está pensada para viajar
   en el navegador; la seguridad real la dan Supabase Auth y las políticas RLS.
   Nunca agregar service_role, secret key, contraseña de base de datos ni JWT
   secret a este archivo ni a ningún otro del proyecto.
   ============================================================================ */

window.LAPZO_CONFIG = {
  APP_NAME: "Portal Lapzo",

  SUPABASE_URL: "https://dragcvvpylmihjrihujm.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_I2ydX0mtdwHKNaWFYU7Oeg_UmMROhaW",

  /* Clave de almacenamiento de la sesión. La comparten el portal, el Centro de
     Reportes, el Tablero Unificado y los artefactos que hablan con Supabase:
     por eso basta iniciar sesión una vez. Si se cambia, hay que cambiarla
     también en el artefacto de FEVISA (busca LAPZO_AUTH_KEY ahí). */
  AUTH_STORAGE_KEY: "lapzo_portal_auth",

  /* SDK oficial de Supabase. Si el CDN está bloqueado por la red corporativa,
     shared/js/supabase.js cae solo a llamadas fetch contra la API REST. */
  SUPABASE_JS_CDN: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",

  /* Slugs que el portal conoce de antemano SOLO para decidir icono y orden de
     respaldo. No son permisos: los permisos siempre salen de Supabase. */
  MODULE_UI: {
    centro_reportes:   { icono: "reportes", color: "#8b55fe" },
    tablero_unificado: { icono: "tablero",  color: "#01da8c" },
    renovaciones:      { icono: "documento", color: "#3f6fd6" }
  },

  /* Segundos que se puede reutilizar la respuesta de permisos dentro de la
     misma carga de página. Supabase sigue siendo la fuente de verdad: nada de
     esto se guarda en localStorage. */
  PERMISSION_CACHE_TTL: 30
};

/* ----------------------------------------------------------------------------
   Resolución de rutas
   ----------------------------------------------------------------------------
   El portal puede vivir en la raíz de un dominio (reportes.lapzo.com/) o en un
   subpath de GitHub Pages (usuario.github.io/portal-lapzo/). Para no depender
   de rutas absolutas, la base se deduce de la URL con la que se cargó este
   mismo archivo: siempre es <base>/shared/js/config.js.
   ---------------------------------------------------------------------------- */
window.LapzoPaths = (function () {
  var src = "";
  if (document.currentScript && document.currentScript.src) {
    src = document.currentScript.src;
  } else {
    var tags = document.getElementsByTagName("script");
    for (var i = tags.length - 1; i >= 0; i--) {
      if (tags[i].src && tags[i].src.indexOf("shared/js/config.js") !== -1) {
        src = tags[i].src;
        break;
      }
    }
  }
  var base = src.replace(/shared\/js\/config\.js(\?.*)?$/, "");
  if (!base) base = new URL(".", location.href).href;

  function resolve(path) {
    return new URL(String(path || "").replace(/^\.?\//, ""), base).href;
  }

  // Convierte una URL absoluta del portal en ruta relativa a la base.
  function relative(url) {
    var abs = new URL(url, location.href).href;
    return abs.indexOf(base) === 0 ? abs.slice(base.length) : null;
  }

  // Solo se aceptan destinos dentro del portal (evita returnUrl a sitios externos).
  function isInternal(url) {
    try { return new URL(url, location.href).href.indexOf(base) === 0; }
    catch (e) { return false; }
  }

  return { base: base, resolve: resolve, relative: relative, isInternal: isInternal };
})();
