/* ============================================================================
   PORTAL LAPZO · pantalla de login e inicio
   ----------------------------------------------------------------------------
   Rutas: #/login, #/inicio, #/admin
   Las tarjetas de módulos salen de Supabase (permissions.js). No hay ninguna
   lista de módulos escrita a mano: si mañana aparece un módulo nuevo en
   modulos_portal, aparece aquí sin tocar código.
   ============================================================================ */

(function () {
  "use strict";

  var G = window.LapzoGuard;
  var esc = G.escapeHtml;
  var CTX = { user: null, modulos: [] };

  function $(id) { return document.getElementById(id); }

  /* --- Iconos ------------------------------------------------------------- */
  var ICON = {
    reportes: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    tablero: '<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
    documento: '<path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z"/><path d="M14 3v4.5h4.5"/>',
    modulo: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    admin: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><path d="M17.5 8.5v6"/><path d="M20.5 11.5h-6"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICON[name] || ICON.modulo) + "</svg>";
  }

  /* --- Rutas -------------------------------------------------------------- */
  function route() {
    var raw = (location.hash || "").replace(/^#\/?/, "");
    var parts = raw.split("?");
    var params = {};
    (parts[1] || "").split("&").filter(Boolean).forEach(function (kv) {
      var i = kv.indexOf("=");
      params[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] =
        decodeURIComponent(i < 0 ? "" : kv.slice(i + 1));
    });
    return { view: parts[0] || "", params: params };
  }

  function show(which) {
    ["viewBoot", "viewLogin", "viewApp"].forEach(function (id) {
      $(id).classList.toggle("hidden", id !== which);
    });
  }

  function notice(tipo, texto) {
    $("loginNotice").innerHTML = texto
      ? '<div class="notice notice-' + tipo + '">' + esc(texto) + "</div>" : "";
  }

  /* --- Login -------------------------------------------------------------- */
  function pendingReturnUrl() {
    return G.safeReturnUrl(route().params.returnUrl);
  }

  function showLogin(msgTipo, msgTexto) {
    show("viewLogin");
    document.title = "Iniciar sesión · Portal Lapzo";
    notice(msgTipo, msgTexto);
    var p = $("password");
    if (p) p.value = "";
    setTimeout(function () { var e = $("email"); if (e && !e.value) e.focus(); }, 40);
  }

  function doLogin() {
    var btn = $("btnLogin");
    var email = $("email").value;
    var password = $("password").value;
    notice();

    if (navigator.onLine === false) {
      notice("warn", "No hay conexión. El Portal Lapzo necesita conectarse para validar tu sesión y permisos.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Iniciando sesión…";

    window.LapzoAuth.signIn(email, password)
      .then(function () { return window.LapzoAuth.getPortalUser(true); })
      .then(function (user) {
        if (!user || !user.existe) {
          return window.LapzoAuth.signOut().then(function () {
            throw new Error("Tu usuario no tiene acceso al Portal Lapzo.");
          });
        }
        if (!user.activo) {
          return window.LapzoAuth.signOut().then(function () {
            throw new Error("Tu usuario está inactivo. Pide a un administrador que lo reactive.");
          });
        }
        var back = pendingReturnUrl();
        if (back) { location.href = back; return; }
        location.hash = "#/inicio";
        boot();
      })
      .catch(function (err) {
        var msg = err.message || String(err);
        if (/invalid login credentials/i.test(msg)) {
          msg = "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
        } else if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          msg = "No pudimos contactar a Supabase. Revisa tu conexión e intenta de nuevo.";
        } else if (/email|password|formato/i.test(msg) === false && !/acceso|inactivo/i.test(msg)) {
          console.error("[Portal] Error de login:", err);
          msg = "No pudimos iniciar sesión. Intenta nuevamente.";
        }
        notice("err", msg);
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = "Iniciar sesión";
      });
  }

  /* --- Cabecera ----------------------------------------------------------- */
  function paintHeader(user) {
    $("whoName").textContent = user.nombre || user.email;
    $("whoEmail").textContent = user.email;
    $("whoBadge").classList.toggle("hidden", !window.LapzoAuth.isSuperadmin(user));
  }

  /* --- Inicio ------------------------------------------------------------- */
  function moduleHref(mod) {
    // La ruta viene de modulos_portal.ruta y se resuelve contra la base del
    // portal, así funciona igual en la raíz del dominio y en un subpath.
    var ruta = (mod.ruta || "").trim();
    if (!ruta) ruta = mod.slug.replace(/_/g, "-") + "/index.html";
    if (/^https?:\/\//i.test(ruta)) return ruta;
    return window.LapzoPaths.resolve(ruta);
  }

  // El rol dentro del módulo solo se muestra si dice algo: "usuario" y el
  // acceso global de un superadmin no aportan nada en la tarjeta.
  function etiquetaRol(mod) {
    var r = String(mod.rol_modulo || "").toLowerCase();
    if (!r || r === "usuario" || r === "superadmin") return "Disponible";
    return r.charAt(0).toUpperCase() + r.slice(1);
  }

  function moduleCard(mod) {
    return '<a class="module-card" style="--mod:' + esc(mod.color) + '" href="' +
      esc(moduleHref(mod)) + '">' +
      '<span class="ico">' + icon(mod.icono) + "</span>" +
      "<h3>" + esc(mod.nombre) + "</h3>" +
      "<p>" + esc(mod.descripcion || "Módulo del Portal Lapzo.") + "</p>" +
      '<span class="go"><span>' + esc(etiquetaRol(mod)) +
      '</span><span class="btn btn-primary btn-sm">Abrir</span></span></a>';
  }

  function adminCard() {
    return '<a class="module-card" style="--mod:#f3538e" href="#/admin">' +
      '<span class="ico">' + icon("admin") + "</span>" +
      "<h3>Administrar accesos</h3>" +
      "<p>Consulta usuarios del portal y ajusta sus módulos y empresas.</p>" +
      '<span class="go"><span>Solo superadmin</span>' +
      '<span class="btn btn-primary btn-sm">Abrir</span></span></a>';
  }

  function renderHome() {
    var user = CTX.user;
    var esSuper = window.LapzoAuth.isSuperadmin(user);
    $("topSub").textContent = "Módulos internos";
    document.title = "Portal Lapzo";

    $("appView").innerHTML =
      '<div class="view-head"><h1>Hola, ' + esc(window.LapzoAuth.primerNombre(user)) + "</h1>" +
      "<p>Selecciona un módulo.</p></div>" +
      '<div class="skeleton"><div class="sk"></div><div class="sk"></div></div>';

    window.LapzoPerms.getAllowedModules(user).then(function (mods) {
      CTX.modulos = mods;
      var cards = mods.map(moduleCard).join("");
      if (esSuper) cards += adminCard();
      $("appView").innerHTML =
        '<div class="view-head"><h1>Hola, ' + esc(window.LapzoAuth.primerNombre(user)) + "</h1>" +
        "<p>Selecciona un módulo.</p></div>" +
        (mods.length || esSuper
          ? '<div class="modules">' + cards + "</div>"
          : '<div class="empty"><h3>Todavía no tienes módulos asignados</h3>' +
            "<p>Pide a un administrador del portal que te asigne acceso.</p></div>");
    }).catch(function (err) {
      console.error("[Portal] No se pudieron consultar los módulos:", err);
      $("appView").innerHTML =
        '<div class="view-head"><h1>Hola, ' + esc(window.LapzoAuth.primerNombre(user)) + "</h1></div>" +
        '<div class="notice notice-err">No fue posible consultar tus permisos. Intenta nuevamente.</div>';
    });
  }

  /* --- Administración ----------------------------------------------------- */
  function renderAdmin() {
    if (!window.LapzoAuth.isSuperadmin(CTX.user)) {
      $("appView").innerHTML =
        '<div class="view-head"><h1>Acceso denegado</h1>' +
        "<p>Esta pantalla es solo para superadministradores del portal.</p></div>" +
        '<p style="margin-top:20px"><a class="btn btn-primary" href="#/inicio">Volver al inicio</a></p>';
      return;
    }
    $("topSub").textContent = "Administrar accesos";
    document.title = "Administrar accesos · Portal Lapzo";
    window.LapzoAdmin.render($("appView"), CTX.user);
  }

  /* --- Arranque ----------------------------------------------------------- */
  function renderRoute() {
    var r = route();
    if (r.view === "admin") renderAdmin();
    else renderHome();
  }

  function boot() {
    show("viewBoot");
    var r = route();

    if (navigator.onLine === false) {
      show("viewLogin");
      notice("warn", "No hay conexión. El Portal Lapzo necesita conectarse para validar tu sesión y permisos.");
      return;
    }

    window.LapzoAuth.getSession().then(function (session) {
      if (!session) { showLogin(); return; }
      return window.LapzoAuth.getPortalUser().then(function (user) {
        if (!user || !user.existe) {
          return window.LapzoAuth.signOut().then(function () {
            showLogin("err", "Tu usuario no tiene acceso al Portal Lapzo.");
          });
        }
        if (!user.activo) {
          return window.LapzoAuth.signOut().then(function () {
            showLogin("err", "Tu usuario está inactivo. Pide a un administrador que lo reactive.");
          });
        }
        CTX.user = user;
        paintHeader(user);
        show("viewApp");
        if (!r.view || r.view === "login") {
          if (location.hash.indexOf("#/admin") !== 0) location.hash = "#/inicio";
        }
        renderRoute();
      });
    }).catch(function (err) {
      console.error("[Portal] Error al restaurar la sesión:", err);
      showLogin("err", "No fue posible consultar tus permisos. Intenta nuevamente.");
    });
  }

  /* --- Eventos ------------------------------------------------------------ */
  $("btnLogin").addEventListener("click", doLogin);
  ["email", "password"].forEach(function (id) {
    $(id).addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
  });

  $("btnLogout").addEventListener("click", function () {
    window.LapzoAuth.signOut().then(function () {
      window.LapzoPerms.invalidate();
      CTX.user = null;
      location.hash = "#/login";
      showLogin("info", "Sesión cerrada.");
    });
  });

  window.addEventListener("hashchange", function () {
    if (!CTX.user) { boot(); return; }
    renderRoute();
  });

  // Si la sesión se cierra o expira en otra pestaña, esta vuelve al login.
  window.LapzoAuth.onAuthChange(function (event) {
    if (event === "SIGNED_OUT" && CTX.user) {
      CTX.user = null;
      window.LapzoPerms.invalidate();
      showLogin("info", "Tu sesión se cerró.");
    }
  });

  boot();
})();
