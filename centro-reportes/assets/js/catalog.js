/* ============================================================================
   CENTRO DE REPORTES · capa de datos (DATA)
   ----------------------------------------------------------------------------
   Única puerta de entrada al catálogo. La interfaz nunca lee los archivos de
   datos directamente: siempre pasa por aquí.

   Desde la integración con el Portal Lapzo hay DOS fuentes con papeles
   distintos, y no conviene confundirlas:

     · Supabase (public.artefactos + public.empresas) = AUTORIZACIÓN.
       Decide qué se puede ver. Es la fuente de verdad.
     · data/reports.js = METADATOS de presentación (categoría, módulo, tipo,
       tags, descripción, fecha, nota). No autoriza nada.

   Un artefacto se muestra únicamente si Supabase lo devolvió. Si está en
   reports.js pero no en Supabase, no se muestra: queda listado como pendiente
   de registrar y solo un superadmin ve ese aviso.

   Orden de carga de los metadatos locales:
     1. window.REPORTS_DATA  (data/reports.js)
     2. fetch("data/reports.json")             — respaldo si se sirve por HTTP

   Todo lo demás del portal (contadores, filtros, agrupaciones, secciones) se
   deriva de estos datos. No hay listas ni números escritos a mano.
   ============================================================================ */

window.Catalog = (function () {
  "use strict";

  var SIN_DATO = ["", null, undefined];
  var state = { items: [], meta: {}, source: null, locales: [], pendientes: [], modo: "local" };

  /* --- Normalización ------------------------------------------------------ */
  // Rellena campos faltantes con etiquetas explícitas en lugar de inventarlos.
  function normalize(raw, i) {
    function val(v, fallback) {
      return SIN_DATO.indexOf(v) === -1 ? v : fallback;
    }
    var fecha = val(raw.fecha, null);
    return {
      id: val(raw.id, "report-" + String(i + 1).padStart(3, "0")),
      titulo: val(raw.titulo, "Sin título"),
      cliente: val(raw.cliente, "No especificado"),
      categoria: val(raw.categoria, "Sin clasificar"),
      modulo: val(raw.modulo, "Otros"),
      tipo: val(raw.tipo, "Otros"),
      fecha: fecha,
      anio: fecha ? String(fecha).slice(0, 4) : "Sin fecha",
      periodo: val(raw.periodo, "No especificado"),
      estado: val(raw.estado, "No especificado"),
      descripcion: val(raw.descripcion, ""),
      descripcion_larga: val(raw.descripcion_larga, val(raw.descripcion, "")),
      archivo: val(raw.archivo, null),
      archivo_original: val(raw.archivo_original, null),
      origen: val(raw.origen, "No especificado"),
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      destacado: raw.destacado === true,
      // Aviso breve y opcional sobre una limitación real del artefacto.
      nota: val(raw.nota, ""),
      autocontenido: raw.autocontenido === true,
      requiere_internet: raw.requiere_internet === true,
      librerias: Array.isArray(raw.librerias) ? raw.librerias : [],
      riesgo_movimiento: val(raw.riesgo_movimiento, "No especificado"),
      // Datos que aporta Supabase al autorizar (ver authorize()).
      empresa_slug: val(raw.empresa_slug, null),
      artefacto_id: val(raw.artefacto_id, null),
      rol_empresa: val(raw.rol_empresa, null)
    };
  }

  function ingest(list, meta, source) {
    state.items = (list || []).map(normalize);
    state.meta = meta || {};
    state.source = source;
    state.locales = state.items.slice();
    return state.items;
  }

  /* --- Carga -------------------------------------------------------------- */
  function load() {
    if (Array.isArray(window.REPORTS_DATA) && window.REPORTS_DATA.length) {
      ingest(window.REPORTS_DATA, window.REPORTS_META, "reports.js");
      return Promise.resolve(state.items);
    }
    // Respaldo: sólo funciona sirviendo el portal por HTTP.
    return fetch("data/reports.json")
      .then(function (r) { return r.json(); })
      .then(function (j) {
        return ingest(j.reportes || j, j.meta, "reports.json");
      })
      .catch(function () { return ingest([], {}, "error"); });
  }

  /* --- Utilidades --------------------------------------------------------- */
  // Búsqueda insensible a acentos y mayúsculas.
  function fold(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function haystack(r) {
    if (!r._hay) {
      r._hay = fold([
        r.titulo, r.cliente, r.categoria, r.modulo, r.tipo,
        r.descripcion, r.descripcion_larga, r.tags.join(" "), r.archivo_original
      ].join(" \u00b7 "));
    }
    return r._hay;
  }

  function all() { return state.items.slice(); }
  function meta() { return state.meta; }
  function source() { return state.source; }
  function byId(id) {
    return state.items.filter(function (r) { return r.id === id; })[0] || null;
  }

  // Valores únicos de un campo, ordenados alfabéticamente, con su conteo.
  function facet(field) {
    var map = {};
    state.items.forEach(function (r) {
      var k = r[field];
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map)
      .sort(function (a, b) { return a.localeCompare(b, "es"); })
      .map(function (k) { return { value: k, count: map[k] }; });
  }

  /* --- Filtro, búsqueda y orden ------------------------------------------ */
  function query(opts) {
    opts = opts || {};
    var terms = fold(opts.q || "").split(/\s+/).filter(Boolean);
    var out = state.items.filter(function (r) {
      if (opts.cliente && r.cliente !== opts.cliente) return false;
      if (opts.categoria && r.categoria !== opts.categoria) return false;
      if (opts.modulo && r.modulo !== opts.modulo) return false;
      if (opts.tipo && r.tipo !== opts.tipo) return false;
      if (opts.anio && r.anio !== opts.anio) return false;
      if (opts.destacado && !r.destacado) return false;
      if (!terms.length) return true;
      var h = haystack(r);
      return terms.every(function (t) { return h.indexOf(t) !== -1; });
    });
    return sort(out, opts.orden);
  }

  function sort(list, orden) {
    var byDate = function (a, b) {
      return String(b.fecha || "").localeCompare(String(a.fecha || ""));
    };
    var byTitle = function (a, b) { return a.titulo.localeCompare(b.titulo, "es"); };
    var s = {
      recientes: byDate,
      antiguos: function (a, b) { return -byDate(a, b); },
      az: byTitle,
      za: function (a, b) { return -byTitle(a, b); },
      cliente: function (a, b) {
        return a.cliente.localeCompare(b.cliente, "es") || byDate(a, b);
      },
      categoria: function (a, b) {
        return a.categoria.localeCompare(b.categoria, "es") || byDate(a, b);
      }
    };
    return list.sort(s[orden] || byDate);
  }

  function recientes(n) { return sort(all(), "recientes").slice(0, n || 6); }
  function destacados() { return sort(all().filter(function (r) { return r.destacado; }), "recientes"); }

  // Agrupa por un campo y devuelve los grupos ordenados por volumen.
  function grouped(field) {
    var map = {};
    state.items.forEach(function (r) {
      (map[r[field]] = map[r[field]] || []).push(r);
    });
    return Object.keys(map)
      .map(function (k) {
        return {
          value: k,
          items: sort(map[k], "recientes"),
          count: map[k].length,
          ultima: sort(map[k], "recientes")[0].fecha
        };
      })
      .sort(function (a, b) {
        return b.count - a.count || a.value.localeCompare(b.value, "es");
      });
  }

  /* --- Cruce con Supabase (autorización) --------------------------------- */
  // La ruta de artefactos.ruta se guarda relativa a la raíz del portal
  // (centro-reportes/reportes/...), mientras que reports.js la guarda relativa
  // al Centro (reportes/...). Se normalizan las dos para poder compararlas.
  function normRuta(r) {
    return String(r || "")
      .trim()
      .replace(/^https?:\/\/[^/]+\//i, "")
      .replace(/^\.?\//, "")
      .replace(/^centro-reportes\//i, "")
      .replace(/[?#].*$/, "")
      .toLowerCase();
  }

  // Slug de la carpeta del artefacto: reportes/fevisa/<slug>/index.html
  function slugDeRuta(r) {
    var partes = normRuta(r).split("/").filter(Boolean);
    if (partes.length >= 2) return partes[partes.length - 2];
    return partes[0] || "";
  }

  function indexarLocales(items) {
    var porRuta = {}, porSlug = {};
    items.forEach(function (it) {
      porRuta[normRuta(it.archivo)] = it;
      var sl = slugDeRuta(it.archivo);
      if (sl && !porSlug[sl]) porSlug[sl] = it;
    });
    return { porRuta: porRuta, porSlug: porSlug };
  }

  function buscarLocal(idx, art) {
    var porRuta = idx.porRuta[normRuta(art.ruta)];
    if (porRuta) return porRuta;
    if (art.slug && idx.porSlug[String(art.slug).toLowerCase()]) {
      return idx.porSlug[String(art.slug).toLowerCase()];
    }
    var sl = slugDeRuta(art.ruta);
    if (sl && idx.porSlug[sl]) return idx.porSlug[sl];
    return null;
  }

  /* Construye el catálogo visible a partir de los artefactos que Supabase
     devolvió para este usuario, enriquecidos con los metadatos locales.
     La empresa siempre viene de Supabase: es el dato autorizado. */
  function authorize(artefactos, opciones) {
    opciones = opciones || {};
    var resolver = opciones.resolver || function (r) { return r; };
    var idx = indexarLocales(state.locales);
    var usados = {};
    var visibles = [];

    (artefactos || []).forEach(function (art, i) {
      var local = buscarLocal(idx, art);
      if (local) usados[local.id] = true;
      var base = local ? Object.assign({}, local) : normalize({
        id: "sb-" + (art.id || i),
        titulo: art.nombre,
        descripcion: art.descripcion,
        tipo: "Otros",
        categoria: "Sin clasificar",
        modulo: "Otros"
      }, i);

      base.cliente = art.empresa_nombre || base.cliente;
      base.empresa_slug = art.empresa_slug || null;
      base.empresa_id = art.empresa_id || null;
      base.rol_empresa = art.rol_empresa || null;
      base.artefacto_id = art.id || null;
      base.artefacto_slug = art.slug || null;
      base.orden = art.orden;
      base.archivo = resolver(art.ruta || (local ? local.archivo : ""));
      if (!local && art.descripcion) base.descripcion = art.descripcion;
      base._hay = null;
      visibles.push(base);
    });

    state.pendientes = state.locales.filter(function (it) { return !usados[it.id]; });
    state.items = visibles;
    state.modo = "supabase";
    return visibles;
  }

  /* Carga los metadatos locales y los cruza con los artefactos permitidos.
     Es el único camino que usa el portal: nada se muestra sin pasar por aquí. */
  function loadAuthorized(user, opciones) {
    return load().then(function () {
      return window.LapzoPerms.getAllowedArtifacts(user);
    }).then(function (arts) {
      return authorize(arts, opciones);
    });
  }

  function pendientes() { return state.pendientes.slice(); }
  function locales() { return state.locales.slice(); }
  function modo() { return state.modo; }

  return {
    load: load, all: all, meta: meta, source: source, byId: byId,
    facet: facet, query: query, sort: sort,
    recientes: recientes, destacados: destacados, grouped: grouped, fold: fold,
    authorize: authorize, loadAuthorized: loadAuthorized,
    pendientes: pendientes, locales: locales, modo: modo
  };
})();
