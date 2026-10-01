/* ============================================================================
   PORTAL LAPZO · guard de páginas
   ----------------------------------------------------------------------------
   Cada página protegida llama a LapzoGuard.protect() y no pinta nada propio
   hasta que el guard confirma sesión y permiso. El orden es siempre el mismo:

     1. bloquear la vista con "Cargando tus accesos…"
     2. inicializar Supabase
     3. restaurar sesión  → si no hay, ir al login con returnUrl interna
     4. validar usuarios_portal (existe y activo)
     5. validar el módulo pedido
     6. recién entonces liberar la página

   Así nadie ve, ni por un instante, un módulo al que no tiene acceso. Llegar
   por URL directa no sirve de nada: la comprobación no depende de haber pasado
   por el inicio.

   Los estilos de este archivo van embebidos y con prefijo lapzo-g- para no
   tocar el CSS del Centro de Reportes ni del Tablero Unificado.
   ============================================================================ */

window.LapzoGuard = (function () {
  "use strict";

  var CSS = [
    '.lapzo-g-gate{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;',
    'background:#f7f5fc;font-family:"Poppins","Segoe UI",system-ui,sans-serif;color:#1d1633;padding:24px}',
    '.lapzo-g-box{max-width:420px;text-align:center}',
    '.lapzo-g-mark{width:40px;height:40px;border-radius:11px;background:#8b55fe;color:#fff;',
    'display:grid;place-items:center;font-weight:700;font-size:18px;margin:0 auto 18px}',
    '.lapzo-g-box h1{font-size:1.15rem;margin:0 0 8px;font-weight:600}',
    '.lapzo-g-box p{margin:0 0 18px;font-size:14px;line-height:1.55;color:#6c6683}',
    '.lapzo-g-spin{width:26px;height:26px;border:2.5px solid #e0d7f5;border-top-color:#8b55fe;',
    'border-radius:50%;margin:0 auto 16px;animation:lapzo-g-rot .8s linear infinite}',
    '@keyframes lapzo-g-rot{to{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion:reduce){.lapzo-g-spin{animation-duration:2s}}',
    '.lapzo-g-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;',
    'background:#8b55fe;color:#fff;font-size:13.5px;font-weight:500;text-decoration:none;border:0;cursor:pointer}',
    '.lapzo-g-btn.ghost{background:#fff;color:#453d5e;border:1px solid #d6cee9}',
    '.lapzo-g-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}',
    /* Barra de retorno al portal */
    '.lapzo-g-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;',
    'font-family:"Poppins","Segoe UI",system-ui,sans-serif;font-size:12.5px;color:#453d5e}',
    '.lapzo-g-bar a.lapzo-g-back{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;',
    'border:1px solid #d6cee9;border-radius:8px;background:#fff;color:#453d5e;text-decoration:none;white-space:nowrap}',
    '.lapzo-g-bar a.lapzo-g-back:hover{border-color:#8b55fe;color:#1d1633}',
    '.lapzo-g-who{display:flex;flex-direction:column;line-height:1.25;min-width:0}',
    '.lapzo-g-who b{font-weight:600;font-size:12.5px;color:#1d1633;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.lapzo-g-who span{font-size:11px;color:#6c6683;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.lapzo-g-badge{font-size:10px;font-weight:600;color:#59239f;background:#f1eaff;',
    'border-radius:999px;padding:2px 8px;white-space:nowrap}',
    '.lapzo-g-out{margin-left:auto;border:0;background:none;color:#6c6683;font-size:12px;',
    'cursor:pointer;text-decoration:underline;padding:4px}',
    '.lapzo-g-out:hover{color:#1d1633}',
    /* Variante para sidebars oscuros (Tablero Unificado) */
    '.lapzo-g-bar--dark{color:rgba(255,255,255,.7)}',
    '.lapzo-g-bar--dark a.lapzo-g-back{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16);color:#fff}',
    '.lapzo-g-bar--dark a.lapzo-g-back:hover{background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.3);color:#fff}',
    '.lapzo-g-bar--dark .lapzo-g-who b{color:#fff}',
    '.lapzo-g-bar--dark .lapzo-g-who span{color:rgba(255,255,255,.5)}',
    '.lapzo-g-bar--dark .lapzo-g-badge{color:#e6dcff;background:rgba(255,255,255,.12)}',
    '.lapzo-g-bar--dark .lapzo-g-out{color:rgba(255,255,255,.6)}',
    '.lapzo-g-bar--dark .lapzo-g-out:hover{color:#fff}'
  ].join("");

  var injected = false;
  function injectCSS() {
    if (injected) return;
    var st = document.createElement("style");
    st.setAttribute("data-lapzo-guard", "1");
    st.textContent = CSS;
    document.head.appendChild(st);
    injected = true;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* --- Pantallas del guard ----------------------------------------------- */
  var gateEl = null;

  function gate(html) {
    injectCSS();
    if (!gateEl) {
      gateEl = document.createElement("div");
      gateEl.className = "lapzo-g-gate";
      gateEl.setAttribute("role", "status");
      (document.body || document.documentElement).appendChild(gateEl);
    }
    gateEl.innerHTML = '<div class="lapzo-g-box">' + html + "</div>";
    return gateEl;
  }

  function gateLoading(texto) {
    return gate('<div class="lapzo-g-spin"></div><p>' + esc(texto || "Cargando tus accesos…") + "</p>");
  }

  function closeGate() {
    if (gateEl && gateEl.parentNode) gateEl.parentNode.removeChild(gateEl);
    gateEl = null;
  }

  function portalHref(hash) {
    return window.LapzoPaths.resolve("index.html" + (hash || ""));
  }

  function renderAccessDenied(mensaje, opciones) {
    opciones = opciones || {};
    var acciones = '<a class="lapzo-g-btn" href="' + portalHref("#/inicio") + '">Volver al inicio</a>';
    if (opciones.logout) {
      acciones += '<button class="lapzo-g-btn ghost" data-lapzo-signout>Cerrar sesión</button>';
    }
    var el = gate(
      '<div class="lapzo-g-mark">L</div>' +
      "<h1>" + esc(opciones.titulo || "Acceso denegado") + "</h1>" +
      "<p>" + esc(mensaje) + "</p>" +
      '<div class="lapzo-g-actions">' + acciones + "</div>"
    );
    var btn = el.querySelector("[data-lapzo-signout]");
    if (btn) {
      btn.addEventListener("click", function () {
        window.LapzoAuth.signOut().then(function () { location.href = portalHref("#/login"); });
      });
    }
    return el;
  }

  /* --- returnUrl segura --------------------------------------------------- */
  // Solo se acepta un destino dentro del portal. Nunca una URL externa.
  function currentReturnUrl() {
    var rel = window.LapzoPaths.relative(location.href);
    return rel || "";
  }

  function goToLogin() {
    var ret = currentReturnUrl();
    location.replace(portalHref("#/login" + (ret ? "?returnUrl=" + encodeURIComponent(ret) : "")));
  }

  function safeReturnUrl(raw) {
    if (!raw) return null;
    var candidate = String(raw);
    if (/^[a-z]+:/i.test(candidate) || candidate.indexOf("//") === 0) {
      if (!window.LapzoPaths.isInternal(candidate)) return null;
      return candidate;
    }
    if (candidate.charAt(0) === "/") return null;      // rutas absolutas rompen el subpath
    var abs = window.LapzoPaths.resolve(candidate);
    return window.LapzoPaths.isInternal(abs) ? abs : null;
  }

  /* --- Barra de retorno al portal ---------------------------------------- */
  function renderUserMenu(target, user, opciones) {
    injectCSS();
    opciones = opciones || {};
    var host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return null;
    var badge = window.LapzoAuth.isSuperadmin(user)
      ? '<span class="lapzo-g-badge">Superadmin</span>' : "";
    host.classList.add("lapzo-g-bar");
    if (opciones.variant === "dark") host.classList.add("lapzo-g-bar--dark");
    // `sinRegreso` para módulos que ya ofrecen su propio botón de vuelta al
    // portal y no necesitan dos: el Tablero Unificado, por ejemplo.
    var back = opciones.sinRegreso ? "" :
      '<a class="lapzo-g-back" href="' + portalHref("#/inicio") + '">← ' +
      esc(opciones.etiqueta || "Portal Lapzo") + "</a>";
    host.innerHTML = back +
      '<span class="lapzo-g-who"><b>' + esc(user.nombre || user.email) + "</b>" +
      '<span>' + esc(user.email) + "</span></span>" + badge +
      '<button class="lapzo-g-out" data-lapzo-signout>Cerrar sesión</button>';
    host.querySelector("[data-lapzo-signout]").addEventListener("click", function () {
      window.LapzoAuth.signOut().then(function () { location.href = portalHref("#/login"); });
    });
    return host;
  }

  /* --- Guards ------------------------------------------------------------- */
  function offline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  }

  /* requireAuth(): sesión + usuarios_portal activo. Resuelve con el usuario,
     o rechaza tras haber pintado ya la pantalla correspondiente. */
  function requireAuth(opciones) {
    opciones = opciones || {};
    gateLoading(opciones.mensaje);

    if (offline()) {
      renderAccessDenied(
        "El Portal Lapzo necesita conectarse para validar tu sesión y tus permisos. " +
        "Vuelve a intentarlo cuando tengas señal.",
        { titulo: "No hay conexión" });
      return Promise.reject(new Error("offline"));
    }

    return window.LapzoAuth.getSession().then(function (session) {
      if (!session) {
        if (opciones.redirectToLogin === false) {
          renderAccessDenied("Inicia sesión en el Portal Lapzo para continuar.",
            { titulo: "Sesión requerida" });
          throw new Error("sin sesión");
        }
        goToLogin();
        throw new Error("sin sesión");
      }
      return window.LapzoAuth.getPortalUser().then(function (user) {
        if (!user || !user.existe) {
          return window.LapzoAuth.signOut().then(function () {
            renderAccessDenied("Tu usuario no tiene acceso al Portal Lapzo.",
              { titulo: "Sin acceso" });
            throw new Error("usuario no registrado");
          });
        }
        if (!user.activo) {
          return window.LapzoAuth.signOut().then(function () {
            renderAccessDenied("Tu usuario está inactivo. Pide a un administrador que lo reactive.",
              { titulo: "Usuario inactivo" });
            throw new Error("usuario inactivo");
          });
        }
        // Si la sesión se cierra en otra pestaña o módulo, esta también sale.
        window.LapzoAuth.onAuthChange(function (event) {
          if (event === "SIGNED_OUT") location.replace(portalHref("#/login"));
        });
        return user;
      });
    }).catch(function (err) {
      if (/sin sesión|inactivo|no registrado|offline/.test(err.message)) throw err;
      console.error("[LapzoGuard] Falló la validación de sesión:", err);
      renderAccessDenied("No fue posible consultar tus permisos. Intenta nuevamente.",
        { titulo: "Algo salió mal", logout: true });
      throw err;
    });
  }

  /* requireModule(slug): requireAuth + permiso del módulo. */
  function requireModule(slug, opciones) {
    opciones = opciones || {};
    return requireAuth(opciones).then(function (user) {
      return window.LapzoPerms.getAllowedModules(user).then(function (mods) {
        var mod = mods.filter(function (m) { return m.slug === slug; })[0];
        if (!mod) {
          // "abrir" y no "acceder a": los nombres llegan con artículo
          // ("el Tablero Unificado") y así la frase queda bien escrita.
          renderAccessDenied(
            "No tienes permiso para abrir " + (opciones.nombre || "este módulo") + ".",
            { titulo: "Acceso denegado" });
          throw new Error("sin permiso de módulo: " + slug);
        }
        return { user: user, modulo: mod, modulos: mods };
      }).catch(function (err) {
        if (/sin permiso de módulo/.test(err.message)) throw err;
        console.error("[LapzoGuard] Falló la consulta de módulos:", err);
        renderAccessDenied("No fue posible consultar tus permisos. Intenta nuevamente.",
          { titulo: "Algo salió mal", logout: true });
        throw err;
      });
    });
  }

  /* requireCompany(slug): para artefactos de una empresa concreta. Se ofrece
     para que los artefactos que hablan con Supabase puedan validarse solos. */
  function requireCompany(slug, opciones) {
    opciones = opciones || {};
    return requireAuth(opciones).then(function (user) {
      return window.LapzoPerms.getAllowedCompanies(user).then(function (emps) {
        var emp = emps.filter(function (e) { return e.slug === slug; })[0];
        if (!emp) {
          renderAccessDenied("No tienes permiso para consultar la información de " +
            (opciones.nombre || slug) + ".", { titulo: "Acceso denegado" });
          throw new Error("sin permiso de empresa: " + slug);
        }
        return { user: user, empresa: emp };
      });
    });
  }

  /* protect(): envoltura cómoda. Libera la página solo si todo salió bien. */
  function protect(opciones) {
    opciones = opciones || {};
    var p = opciones.module
      ? requireModule(opciones.module, opciones)
      : requireAuth(opciones).then(function (user) { return { user: user }; });

    return p.then(function (ctx) {
      if (opciones.userMenu) {
        renderUserMenu(opciones.userMenu, ctx.user, opciones);
      }
      closeGate();
      if (typeof opciones.onReady === "function") opciones.onReady(ctx);
      return ctx;
    }).catch(function (err) {
      if (typeof opciones.onDenied === "function") opciones.onDenied(err);
      return null;   // la pantalla ya quedó pintada por el guard
    });
  }

  return {
    protect: protect,
    requireAuth: requireAuth,
    requireModule: requireModule,
    requireCompany: requireCompany,
    renderUserMenu: renderUserMenu,
    renderAccessDenied: renderAccessDenied,
    gateLoading: gateLoading,
    closeGate: closeGate,
    portalHref: portalHref,
    safeReturnUrl: safeReturnUrl,
    escapeHtml: esc
  };
})();
