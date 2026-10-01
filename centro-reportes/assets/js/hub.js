/* ============================================================================
   CENTRO DE REPORTES · interfaz (JS)
   ----------------------------------------------------------------------------
   Todo lo que se ve se genera a partir del catálogo (assets/js/catalog.js).
   Para agregar un reporte no se toca este archivo: basta registrarlo en
   data/reports.js y data/reports.json.

   Índice
     1. Iconos
     2. Utilidades
     3. Rutas (navegación por hash)
     4. Componentes (tarjeta, grupo, controles, estado vacío)
     5. Vistas
     6. Sidebar y navegación
     7. Visor de reportes
     8. Arranque
   ============================================================================ */

(function () {
  "use strict";

  /* --- 1. Iconos ---------------------------------------------------------- */
  // SVG en línea: sin dependencias ni fuentes de iconos externas.
  var ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.5 2"/>',
    star: '<path d="m12 3.6 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.8l5.9-.9z"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><path d="M16.5 5.4a3.2 3.2 0 0 1 0 6"/><path d="M17.5 14.8c1.9.6 3.2 2.4 3.2 5.2"/>',
    tag: '<path d="M20.5 13.3 13.3 20.5a2 2 0 0 1-2.8 0l-7-7V3.5H13l7.5 7.5a1.7 1.7 0 0 1 0 2.3Z"/><circle cx="8.3" cy="8.3" r="1.4"/>',
    layers: '<path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    close: '<path d="m6 6 12 12"/><path d="M18 6 6 18"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14.5V20H4V6h5.5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m14 6-6 6 6 6"/>',
    plug: '<path d="M12 3v6"/><path d="M8.5 9h7v3a3.5 3.5 0 0 1-7 0Z"/><path d="M12 15.5V21"/>'
  };

  function icon(name, cls) {
    return '<svg class="' + (cls || "ic") + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || "") + "</svg>";
  }

  // Usuario y permisos del Portal Lapzo, resueltos por el guard antes de
  // pintar cualquier cosa. El Centro no decide permisos, solo los consume.
  var CTX = { user: null, esSuper: false };

  /* --- 2. Utilidades ------------------------------------------------------ */
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fechaCorta(iso) {
    if (!iso) return "Sin fecha";
    var p = String(iso).split("-");
    if (p.length !== 3) return String(iso);
    return Number(p[2]) + " " + MESES[Number(p[1]) - 1] + " " + p[0];
  }

  function inicial(texto) {
    var limpio = String(texto).replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g, "").trim();
    var partes = limpio.split(/\s+/);
    return (partes.length > 1 ? partes[0][0] + partes[1][0] : limpio.slice(0, 2)).toUpperCase();
  }

  function plural(n, s, p) { return n + " " + (n === 1 ? s : p); }
  function $(sel) { return document.querySelector(sel); }

  /* --- 3. Rutas ----------------------------------------------------------- */
  // Formato: #/vista?clave=valor&clave=valor
  function parseHash() {
    var raw = (location.hash || "#/inicio").replace(/^#\/?/, "");
    var parts = raw.split("?");
    var params = {};
    (parts[1] || "").split("&").filter(Boolean).forEach(function (kv) {
      var i = kv.indexOf("=");
      var k = decodeURIComponent(i === -1 ? kv : kv.slice(0, i));
      params[k] = decodeURIComponent(i === -1 ? "" : kv.slice(i + 1));
    });
    return { view: parts[0] || "inicio", params: params };
  }

  function href(view, params) {
    var qs = Object.keys(params || {})
      .filter(function (k) { return params[k] !== "" && params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");
    return "#/" + view + (qs ? "?" + qs : "");
  }

  function go(view, params) { location.hash = href(view, params); }

  /* --- 4. Componentes ----------------------------------------------------- */
  function cardHTML(r) {
    var tags = r.tags.slice(0, 3).map(function (t) {
      return '<span class="tag">' + esc(t) + "</span>";
    }).join("");

    return '' +
      '<article class="card" data-mod="' + esc(r.modulo) + '">' +
        '<div class="card-top">' +
          '<span class="dot"></span>' +
          '<span>' + esc(r.cliente) + "</span>" +
          '<span class="sep">/</span>' +
          "<span>" + esc(r.categoria) + "</span>" +
          (r.destacado ? '<span class="star" title="Destacado">' +
            icon("star", "ic") + "</span>" : "") +
        "</div>" +
        "<h3>" + esc(r.titulo) + "</h3>" +
        (r.descripcion ? '<p class="desc">' + esc(r.descripcion) + "</p>" : "") +
        (tags ? '<div class="tags">' + tags + "</div>" : "") +
        (r.nota ? '<p class="offline-note">' + esc(r.nota) + "</p>" : "") +
        '<div class="card-foot">' +
          '<button class="btn btn-primary" data-open="' + esc(r.id) + '">Ver reporte</button>' +
          '<a class="btn btn-ghost" href="' + esc(r.archivo) + '" target="_blank" rel="noopener" ' +
            'title="Abrir en pestaña nueva">' + icon("external", "ic") + "</a>" +
          '<span class="date">' + fechaCorta(r.fecha) + "</span>" +
        "</div>" +
      "</article>";
  }

  function cardsHTML(list) {
    if (!list.length) return emptyHTML();
    return '<div class="cards">' + list.map(cardHTML).join("") + "</div>";
  }

  function emptyHTML(titulo, texto) {
    return '<div class="empty"><h3>' +
      esc(titulo || "No encontramos reportes con esos criterios") + "</h3><p>" +
      esc(texto || "Prueba cambiando los filtros o la búsqueda.") + "</p></div>";
  }

  function groupHTML(g, field, modColor) {
    return '<a class="group" data-mod="' + esc(modColor ? g.value : "") + '" href="' +
      href("reportes", (function () { var o = {}; o[field] = g.value; return o; })()) + '">' +
      '<span class="avatar' + (modColor ? "" : " neutral") + '">' + esc(inicial(g.value)) + "</span>" +
      '<span class="g-body"><span class="g-name">' + esc(g.value) + "</span>" +
      '<span class="g-meta">' + plural(g.count, "reporte", "reportes") +
      " · último " + fechaCorta(g.ultima) + "</span></span>" +
      '<span class="arrow">' + icon("chevron", "ic") + "</span></a>";
  }

  // Barra de filtros: las opciones salen de los datos, no están escritas a mano.
  function controlsHTML(p) {
    function select(name, label, field, current) {
      var opts = window.Catalog.facet(field).map(function (o) {
        return '<option value="' + esc(o.value) + '"' +
          (current === o.value ? " selected" : "") + ">" +
          esc(o.value) + " (" + o.count + ")</option>";
      }).join("");
      return '<div class="field"><label for="f-' + name + '">' + label + "</label>" +
        '<select id="f-' + name + '" data-filter="' + name + '">' +
        '<option value="">Todos</option>' + opts + "</select></div>";
    }

    return '<div class="controls">' +
      '<div class="field" style="flex:1 1 240px;max-width:340px">' +
        '<label for="f-q">Buscar</label>' +
        '<input id="f-q" type="search" data-filter="q" style="max-width:none" ' +
          'placeholder="Título, empresa, módulo, tag…" value="' + esc(p.q || "") + '"></div>' +
      select("cliente", "Empresa", "cliente", p.cliente) +
      select("categoria", "Categoría", "categoria", p.categoria) +
      select("modulo", "Módulo", "modulo", p.modulo) +
      select("tipo", "Tipo", "tipo", p.tipo) +
      select("anio", "Año", "anio", p.anio) +
      '<div class="field"><label for="f-orden">Orden</label><select id="f-orden" data-filter="orden">' +
        ["recientes|Más recientes", "antiguos|Más antiguos", "az|A–Z", "za|Z–A",
         "cliente|Empresa", "categoria|Categoría"].map(function (o) {
          var v = o.split("|");
          return '<option value="' + v[0] + '"' +
            ((p.orden || "recientes") === v[0] ? " selected" : "") + ">" + v[1] + "</option>";
        }).join("") +
      "</select></div>" +
      '<label class="check"><input type="checkbox" data-filter="destacado"' +
        (p.destacado ? " checked" : "") + "> Sólo destacados</label>" +
      '<button class="btn btn-ghost reset" data-reset>Limpiar filtros</button>' +
    "</div>";
  }

  /* --- 5. Vistas ---------------------------------------------------------- */
  var VIEWS = {};

  // Aviso para superadmins: artefactos que existen en el catálogo local pero
  // que Supabase no devolvió, así que hoy nadie los ve. No es un error del
  // portal: falta registrarlos en public.artefactos.
  function avisoPendientesHTML() {
    if (!CTX.esSuper) return "";
    var p = window.Catalog.pendientes();
    if (!p.length) return "";
    return '<div class="sb-aviso"><b>' + p.length + " artefacto" + (p.length === 1 ? "" : "s") +
      " del catálogo local todavía no está" + (p.length === 1 ? "" : "n") +
      " registrado" + (p.length === 1 ? "" : "s") + " en Supabase</b>, así que no se muestra" +
      (p.length === 1 ? "" : "n") + " a nadie. Regístralos en <code>public.artefactos</code> " +
      "para publicarlos. Pendientes: " +
      esc(p.map(function (r) { return r.titulo; }).join(" · ")) + "</div>";
  }

  VIEWS.inicio = function () {
    var C = window.Catalog;
    var total = C.all().length;
    var recientes = C.recientes(6);
    var destacados = C.destacados();
    var clientes = C.grouped("cliente");
    var modulos = C.grouped("modulo");

    var html = '<section class="hero">' +
      "<h1>Centro de Reportes</h1>" +
      '<p class="lede">Consulta tus reportes, análisis y dashboards desde un solo lugar.</p>' +
      '<div class="searchbox">' + icon("search") +
        '<input id="hero-search" type="search" autocomplete="off" ' +
        'placeholder="Buscar reportes, empresas, módulos o categorías...">' +
        '<button class="clear" data-hero-go>Ver todos</button>' +
      "</div>" +
      '<div class="metrics">' +
        '<div class="metric"><div class="n">' + total + '</div><div class="l">Reportes en el catálogo</div></div>' +
        '<div class="metric"><div class="n">' + clientes.length + '</div><div class="l">Empresas</div></div>' +
        '<div class="metric"><div class="n">' + C.facet("categoria").length + '</div><div class="l">Categorías</div></div>' +
        '<div class="metric"><div class="n">' + modulos.length + '</div><div class="l">Módulos</div></div>' +
      "</div></section>";

    html += avisoPendientesHTML();

    html += '<section class="section"><div class="section-head"><h2>Reportes recientes</h2>' +
      '<a class="link-more" href="' + href("reportes", { orden: "recientes" }) + '">Ver todos</a>' +
      "</div>" + cardsHTML(recientes) + "</section>";

    // La sección de destacados sólo existe si hay destacados.
    if (destacados.length) {
      html += '<section class="section"><div class="section-head"><h2>Destacados</h2>' +
        '<span class="hint">' + plural(destacados.length, "reporte marcado", "reportes marcados") +
        " en el catálogo</span></div>" + cardsHTML(destacados) + "</section>";
    }

    html += '<section class="section"><div class="section-head"><h2>Explorar por empresa</h2>' +
      '<a class="link-more" href="' + href("clientes") + '">Ver empresas</a></div>' +
      '<div class="groups">' + clientes.map(function (g) {
        return groupHTML(g, "cliente", false);
      }).join("") + "</div></section>";

    html += '<section class="section"><div class="section-head"><h2>Explorar por módulo</h2>' +
      '<a class="link-more" href="' + href("modulos") + '">Ver módulos</a></div>' +
      '<div class="groups">' + modulos.map(function (g) {
        return groupHTML(g, "modulo", true);
      }).join("") + "</div></section>";

    return html;
  };

  VIEWS.reportes = function (p) {
    var list = window.Catalog.query(p);
    var activos = ["cliente", "categoria", "modulo", "tipo", "anio"]
      .filter(function (k) { return p[k]; })
      .map(function (k) { return p[k]; });
    if (p.destacado) activos.push("destacados");

    var titulo = "Todos los reportes";
    if (activos.length === 1 && !p.q) titulo = activos[0];

    return '<div class="view-head"><h1 style="font-size:1.7rem">' + esc(titulo) + "</h1>" +
      "<p>" + (p.q ? 'Resultados para "' + esc(p.q) + '". ' : "") +
      "Busca, filtra y ordena todo el catálogo." + "</p></div>" +
      controlsHTML(p) +
      '<div class="result-line">' + plural(list.length, "reporte", "reportes") +
      (activos.length ? " · filtros: " + esc(activos.join(", ")) : "") + "</div>" +
      cardsHTML(list);
  };

  VIEWS.recientes = function () {
    var list = window.Catalog.sort(window.Catalog.all(), "recientes");
    return '<div class="view-head"><h1 style="font-size:1.7rem">Recientes</h1>' +
      "<p>El catálogo completo ordenado por fecha, del más nuevo al más antiguo.</p></div>" +
      cardsHTML(list);
  };

  VIEWS.destacados = function () {
    var list = window.Catalog.destacados();
    if (!list.length) {
      return '<div class="view-head"><h1 style="font-size:1.7rem">Destacados</h1></div>' +
        emptyHTML("Todavía no hay reportes destacados",
          'Marca un reporte con "destacado": true en data/reports.js para que aparezca aquí.');
    }
    return '<div class="view-head"><h1 style="font-size:1.7rem">Destacados</h1>' +
      "<p>Los reportes que marcaste como prioritarios en el catálogo.</p></div>" +
      cardsHTML(list);
  };

  function grupoView(field, titulo, texto, modColor) {
    return function () {
      var grupos = window.Catalog.grouped(field);
      return '<div class="view-head"><h1 style="font-size:1.7rem">' + titulo + "</h1><p>" +
        texto + "</p></div>" +
        (grupos.length
          ? '<div class="groups">' + grupos.map(function (g) {
              return groupHTML(g, field, modColor);
            }).join("") + "</div>"
          : emptyHTML("El catálogo está vacío", "Registra tu primer reporte en data/reports.js."));
    };
  }

  VIEWS.clientes = grupoView("cliente", "Empresas",
    "Reportes agrupados por empresa, tal como las devuelve Supabase. Selecciona una para ver solo sus reportes.", false);

  VIEWS.categorias = grupoView("categoria", "Categorías",
    "Reportes agrupados por tema. Las categorías se generan a partir del catálogo.", false);

  VIEWS.modulos = grupoView("modulo", "Módulos",
    "Reportes agrupados por producto o módulo de Lapzo. El color acompaña al módulo en todo el portal.", true);

  VIEWS.acerca = function () {
    var C = window.Catalog;
    var m = C.meta();
    var conCdn = C.all().filter(function (r) { return r.requiere_internet; }).length;

    return '<div class="view-head"><h1 style="font-size:1.7rem">Acerca del Hub</h1>' +
      "<p>Cómo funciona el Centro de Reportes y cómo mantenerlo.</p></div>" +
      '<div class="prose">' +
        '<div class="panel">' +
          "<p><strong>" + C.all().length + " reportes</strong> · " +
          C.grouped("cliente").length + " clientes · " +
          C.facet("categoria").length + " categorías · " +
          C.grouped("modulo").length + " módulos<br>" +
          "Catálogo v" + esc(m.version_catalogo || "1.0.0") +
          " · metadatos: <code>" + esc(C.source()) + "</code>" +
          " · autorización: <code>Supabase</code>" +
          (CTX.user ? " · sesión: " + esc(CTX.user.email) : "") + "</p>" +
        "</div>" +

        "<h3>Cómo está armado</h3>" +
        "<p>Cada artefacto sigue siendo un archivo HTML independiente dentro de " +
        "<code>reportes/&lt;empresa&gt;/&lt;reporte&gt;/index.html</code>. El portal es una capa de " +
        "navegación encima: los abre en un visor aislado o en una pestaña nueva, sin tocar su " +
        "contenido, sus cálculos ni sus estilos.</p>" +

        "<h3>De dónde salen los permisos</h3>" +
        "<p>La lista de arriba es la que Supabase devolvió para tu cuenta: " +
        "<code>public.artefactos</code> de las empresas a las que tienes acceso, filtrado por RLS. " +
        "<code>data/reports.js</code> solo aporta categoría, módulo, tipo, tags y descripciones. " +
        "Un artefacto que esté en el archivo local pero no en Supabase no se muestra.</p>" +

        "<h3>Cómo agregar un reporte</h3>" +
        "<ol>" +
          "<li>Copia el HTML en <code>reportes/&lt;empresa&gt;/&lt;nombre-del-reporte&gt;/index.html</code>.</li>" +
          "<li>Regístralo en <code>public.artefactos</code> con su empresa y su <code>ruta</code>.</li>" +
          "<li>Agrega sus metadatos en <code>data/reports.js</code> y <code>data/reports.json</code>.</li>" +
          "<li>Recarga: contadores, filtros, empresas, categorías y módulos se actualizan solos.</li>" +
        "</ol>" +
        "<p>El detalle completo está en <code>README.md</code>.</p>" +

        "<h3>Conexión a internet</h3>" +
        "<p>" + conCdn + " de " + C.all().length + " reportes cargan librerías desde un CDN " +
        "(Chart.js, SheetJS, pdfmake, entre otras), así que necesitan conexión para funcionar. " +
        "El resto trae todo incluido y corre sin red.</p>" +

        "<h3>Si un reporte no se ve en el visor</h3>" +
        "<p>Algunos navegadores restringen los <code>iframe</code> cuando el portal se abre con " +
        "<code>file://</code>. En ese caso usa <em>Abrir en pestaña nueva</em>, que siempre funciona, " +
        "o sirve la carpeta por HTTP con <code>python -m http.server 8000</code>.</p>" +
      "</div>";
  };

  /* --- 6. Sidebar y navegación -------------------------------------------- */
  var NAV = [
    { group: null, items: [{ view: "inicio", label: "Inicio", ic: "home" }] },
    { group: "Explorar", items: [
      { view: "reportes", label: "Todos los reportes", ic: "grid", count: function () { return window.Catalog.all().length; } },
      { view: "recientes", label: "Recientes", ic: "clock" },
      { view: "destacados", label: "Destacados", ic: "star", count: function () { return window.Catalog.destacados().length; } }
    ] },
    { group: "Organizar", items: [
      { view: "clientes", label: "Empresas", ic: "users", count: function () { return window.Catalog.grouped("cliente").length; } },
      { view: "categorias", label: "Categorías", ic: "tag", count: function () { return window.Catalog.facet("categoria").length; } },
      { view: "modulos", label: "Módulos", ic: "layers", count: function () { return window.Catalog.grouped("modulo").length; } }
    ] },
    { group: "Sistema", items: [{ view: "acerca", label: "Acerca del Hub", ic: "info" }] }
  ];

  function renderNav(current) {
    $("#nav").innerHTML = NAV.map(function (g) {
      return (g.group ? '<div class="nav-group"><div class="nav-group-title">' +
          g.group + "</div>" : '<div class="nav-group" style="margin-top:8px">') +
        g.items.map(function (it) {
          var n = typeof it.count === "function" ? it.count() : null;
          return '<a class="nav-item" href="' + href(it.view) + '"' +
            (current === it.view ? ' aria-current="page"' : "") + ">" +
            icon(it.ic) + "<span>" + it.label + "</span>" +
            (n !== null ? '<span class="nav-count">' + n + "</span>" : "") + "</a>";
        }).join("") + "</div>";
    }).join("");
  }

  /* --- 7. Visor de reportes ----------------------------------------------- */
  // Los artefactos se cargan sólo cuando el usuario los pide: el Home nunca
  // monta iframes. Si el navegador bloquea el iframe, se ofrece la pestaña nueva.
  // El estado abierto/cerrado vive en data-viewer-open, distinto de data-open
  // (que identifica el reporte a abrir en los botones de las tarjetas).
  var viewer = { timer: null, lastFocus: null };

  function openViewer(id) {
    var r = window.Catalog.byId(id);
    if (!r || !r.archivo) return;

    viewer.lastFocus = document.activeElement;
    $("#viewer-title").textContent = r.titulo;
    $("#viewer-meta").textContent = [r.cliente, r.categoria, r.modulo, fechaCorta(r.fecha)].join(" · ");
    $("#viewer-open").href = r.archivo;
    $("#viewer-fallback-link").href = r.archivo;
    $("#viewer-fallback").setAttribute("data-show", "false");

    var frame = $("#viewer-frame");
    frame.setAttribute("src", r.archivo);

    // Si el marco no reporta carga en 4 s, se asume bloqueo y se muestra la salida.
    clearTimeout(viewer.timer);
    viewer.timer = setTimeout(function () {
      $("#viewer-fallback").setAttribute("data-show", "true");
    }, 4000);

    $("#viewer").setAttribute("data-viewer-open", "true");
    document.body.style.overflow = "hidden";
    $("#viewer-close").focus();
  }

  function closeViewer() {
    clearTimeout(viewer.timer);
    $("#viewer").setAttribute("data-viewer-open", "false");
    $("#viewer-frame").setAttribute("src", "about:blank");  // libera memoria del artefacto
    document.body.style.overflow = "";
    if (viewer.lastFocus) viewer.lastFocus.focus();
  }

  /* --- 8. Arranque -------------------------------------------------------- */
  function render() {
    var route = parseHash();
    var view = VIEWS[route.view] ? route.view : "inicio";
    var p = route.params;
    p.destacado = p.destacado === "1" || p.destacado === "true";

    renderNav(view);
    $("#view").innerHTML = VIEWS[view](p);
    $("#view").focus({ preventScroll: true });
    window.scrollTo(0, 0);
    document.body.setAttribute("data-menu", "closed");
    document.title = (view === "inicio" ? "" :
      $("#view").querySelector("h1").textContent + " · ") + "Centro de Reportes";

    var hero = $("#hero-search");
    if (hero) {
      hero.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && hero.value.trim()) go("reportes", { q: hero.value.trim() });
      });
      // Búsqueda instantánea: a partir de 2 caracteres pasa a la vista de resultados.
      hero.addEventListener("input", function () {
        if (hero.value.trim().length >= 2) {
          go("reportes", { q: hero.value.trim() });
        }
      });
    }
  }

  function wire() {
    window.addEventListener("hashchange", render);

    // Delegación de eventos: cubre todo lo que se dibuja dinámicamente.
    document.addEventListener("click", function (e) {
      var open = e.target.closest("[data-open]");
      if (open) { openViewer(open.getAttribute("data-open")); return; }
      if (e.target.closest("[data-viewer-close]")) { closeViewer(); return; }
      if (e.target.closest("[data-hero-go]")) { go("reportes", {}); return; }
      if (e.target.closest("[data-reset]")) { go("reportes", {}); return; }
      if (e.target.closest("[data-menu-toggle]")) {
        var open2 = document.body.getAttribute("data-menu") === "open";
        document.body.setAttribute("data-menu", open2 ? "closed" : "open");
        return;
      }
      if (e.target.closest(".backdrop")) document.body.setAttribute("data-menu", "closed");
    });

    // Filtros y orden: cualquier cambio se refleja en la URL, así el estado
    // de la vista se puede compartir o guardar como favorito.
    function applyFilter(el) {
      var route = parseHash();
      var p = route.params;
      var key = el.getAttribute("data-filter");
      p[key] = el.type === "checkbox" ? (el.checked ? "1" : "") : el.value;
      go("reportes", p);
    }

    document.addEventListener("change", function (e) {
      var el = e.target.closest("[data-filter]");
      if (el && el.tagName !== "INPUT") applyFilter(el);
      if (el && el.type === "checkbox") applyFilter(el);
    });

    var typeTimer = null;
    document.addEventListener("input", function (e) {
      var el = e.target.closest('input[data-filter="q"]');
      if (!el) return;
      clearTimeout(typeTimer);
      typeTimer = setTimeout(function () {
        var pos = el.value.length;
        applyFilter(el);
        var next = $('input[data-filter="q"]');
        if (next) { next.focus(); next.setSelectionRange(pos, pos); }
      }, 220);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if ($("#viewer").getAttribute("data-viewer-open") === "true") closeViewer();
        else document.body.setAttribute("data-menu", "closed");
      }
    });

    // El iframe cargó: se cancela el mensaje de respaldo.
    $("#viewer-frame").addEventListener("load", function () {
      if (this.getAttribute("src") === "about:blank") return;
      clearTimeout(viewer.timer);
      $("#viewer-fallback").setAttribute("data-show", "false");
    });
    $("#viewer-frame").addEventListener("error", function () {
      $("#viewer-fallback").setAttribute("data-show", "true");
    });
  }

  /* --- Arranque protegido -------------------------------------------------
     Nada se pinta hasta que el Portal Lapzo confirma:
       sesión válida + usuario activo + permiso del módulo centro_reportes.
     Después se cruza el catálogo local con los artefactos que Supabase
     autoriza para esta persona. */
  function arrancar(ctx) {
    CTX.user = ctx.user;
    CTX.esSuper = window.LapzoAuth.isSuperadmin(ctx.user);

    $("#view").innerHTML = '<div class="empty"><h3>Cargando tus reportes…</h3>' +
      "<p>Consultando los artefactos disponibles para tu cuenta.</p></div>";

    window.Catalog.loadAuthorized(ctx.user, {
      resolver: function (ruta) { return window.LapzoPaths.resolve(ruta); }
    }).then(function (items) {
      wire();
      if (!items.length) {
        render();
        $("#view").innerHTML = emptyHTML("Todavía no tienes reportes disponibles",
          CTX.esSuper
            ? "No hay artefactos activos registrados en Supabase para las empresas visibles."
            : "Pide a un administrador del portal que te asigne una empresa con reportes.");
        return;
      }
      render();
    }).catch(function (err) {
      console.error("[Centro] No se pudo construir el catálogo:", err);
      $("#view").innerHTML = emptyHTML("No fue posible consultar tus reportes",
        "Revisa tu conexión e intenta nuevamente.");
    });
  }

  window.LapzoGuard.protect({
    module: "centro_reportes",
    nombre: "el Centro de Reportes",
    userMenu: "#portalBar",
    onReady: arrancar
  });
})();
