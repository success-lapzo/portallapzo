/* ============================================================================
   PORTAL LAPZO · administrar accesos (solo superadmin)
   ----------------------------------------------------------------------------
   Trabaja sobre usuarios_portal, usuario_modulo y usuario_empresa. Nunca
   consulta auth.users ni crea cuentas: eso se hace en Supabase Authentication.

   Al quitar un acceso se marca activo = false en lugar de borrar el renglón,
   para conservar la trazabilidad de quién tuvo qué.
   ============================================================================ */

window.LapzoAdmin = (function () {
  "use strict";

  var esc = window.LapzoGuard.escapeHtml;

  var D = {
    usuarios: [],
    modulos: [],
    empresas: [],
    asignModulo: {},    // user_id → { modulo_id: {rol, activo} }
    asignEmpresa: {},   // user_id → { empresa_id: {rol, activo} }
    abierto: null,
    filtro: ""
  };

  function activo(r) {
    return r.activo === true || String(r.activo).toLowerCase() === "true";
  }

  function inicial(txt) {
    var limpio = String(txt || "?").replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g, "").trim();
    var p = limpio.split(/\s+/);
    return (p.length > 1 ? p[0][0] + p[1][0] : limpio.slice(0, 2)).toUpperCase();
  }

  function esSuper(u) {
    return String(u.rol_global || "").toLowerCase() === "superadmin";
  }

  /* --- Carga -------------------------------------------------------------- */
  function cargar() {
    return Promise.all([
      window.LapzoSB.select("usuarios_portal", {
        columns: "user_id,email,nombre,rol_global,activo"
      }),
      window.LapzoSB.select("modulos_portal", {
        columns: "id,slug,nombre,activo,orden", eq: { activo: true }
      }),
      window.LapzoSB.select("empresas", {
        columns: "id,slug,nombre,activo,orden", eq: { activo: true }
      }),
      window.LapzoSB.select("usuario_modulo", { columns: "user_id,modulo_id,rol_modulo,activo" }),
      window.LapzoSB.select("usuario_empresa", { columns: "user_id,empresa_id,rol_empresa,activo" })
    ]).then(function (r) {
      var orden = function (a, b) {
        var oa = a.orden == null ? 9999 : Number(a.orden);
        var ob = b.orden == null ? 9999 : Number(b.orden);
        return oa - ob || String(a.nombre).localeCompare(String(b.nombre), "es");
      };
      D.usuarios = (r[0] || []).sort(function (a, b) {
        return String(a.nombre || a.email || "").localeCompare(String(b.nombre || b.email || ""), "es");
      });
      D.modulos = (r[1] || []).filter(activo).sort(orden);
      D.empresas = (r[2] || []).filter(activo).sort(orden);

      D.asignModulo = {};
      (r[3] || []).forEach(function (a) {
        (D.asignModulo[a.user_id] = D.asignModulo[a.user_id] || {})[a.modulo_id] =
          { rol: a.rol_modulo || "usuario", activo: activo(a) };
      });
      D.asignEmpresa = {};
      (r[4] || []).forEach(function (a) {
        (D.asignEmpresa[a.user_id] = D.asignEmpresa[a.user_id] || {})[a.empresa_id] =
          { rol: String(a.rol_empresa || "usuario").toLowerCase(), activo: activo(a) };
      });
    });
  }

  /* --- Pintado ------------------------------------------------------------ */
  function resumenModulos(u) {
    if (esSuper(u)) return '<span class="pill pill-glob">Acceso global</span>';
    var mine = D.asignModulo[u.user_id] || {};
    var nombres = D.modulos
      .filter(function (m) { return mine[m.id] && mine[m.id].activo; })
      .map(function (m) { return '<span class="pill">' + esc(m.nombre) + "</span>"; });
    return nombres.length ? nombres.join("") : '<span class="pill">Sin módulos</span>';
  }

  function resumenEmpresas(u) {
    if (esSuper(u)) return "";
    var mine = D.asignEmpresa[u.user_id] || {};
    return D.empresas
      .filter(function (e) { return mine[e.id] && mine[e.id].activo; })
      .map(function (e) {
        var rol = mine[e.id].rol;
        return '<span class="pill">' + esc(e.nombre) + " · " +
          esc(rol.charAt(0).toUpperCase() + rol.slice(1)) + "</span>";
      }).join("");
  }

  function editorHTML(u) {
    var mods = D.asignModulo[u.user_id] || {};
    var emps = D.asignEmpresa[u.user_id] || {};

    if (esSuper(u)) {
      return '<div class="user-edit"><div class="notice notice-info" style="margin-top:0">' +
        "Este usuario es superadministrador: tiene acceso global a los módulos y empresas que " +
        "las políticas de Supabase le permitan, sin necesidad de asignaciones individuales. " +
        "Para darle permisos explícitos, primero cambia su rol_global a <b>usuario</b> en Supabase." +
        "</div></div>";
    }

    var tieneCentro = !!(D.modulos.filter(function (m) {
      return m.slug === "centro_reportes" && mods[m.id] && mods[m.id].activo;
    })[0]);

    var checksMod = D.modulos.map(function (m) {
      var on = mods[m.id] && mods[m.id].activo;
      return '<label class="check"><input type="checkbox" data-mod="' + esc(m.id) +
        '" data-slug="' + esc(m.slug) + '"' + (on ? " checked" : "") + "> " + esc(m.nombre) + "</label>";
    }).join("");

    var checksEmp = D.empresas.map(function (e) {
      var a = emps[e.id];
      var on = a && a.activo;
      var rol = (a && a.rol) || "usuario";
      return '<div class="emp-line"><label class="check" style="padding:0">' +
        '<input type="checkbox" data-emp="' + esc(e.id) + '"' + (on ? " checked" : "") +
        (tieneCentro ? "" : " disabled") + "> " + esc(e.nombre) + "</label>" +
        '<select data-emp-rol="' + esc(e.id) + '"' + (on && tieneCentro ? "" : " disabled") + ">" +
        ["admin", "usuario", "lector"].map(function (r) {
          return '<option value="' + r + '"' + (rol === r ? " selected" : "") + ">" +
            r.charAt(0).toUpperCase() + r.slice(1) + "</option>";
        }).join("") + "</select></div>";
    }).join("");

    return '<div class="user-edit"><div class="cols">' +
      "<div><h4>Módulos</h4>" + (checksMod || "<p>No hay módulos activos.</p>") + "</div>" +
      "<div><h4>Empresas</h4>" + (checksEmp || "<p>No hay empresas activas.</p>") +
      '<p class="hint-line" data-dep-warn' + (tieneCentro ? ' style="display:none"' : "") +
      ">Las empresas dependen del Centro de Reportes. " +
      "Activa ese módulo para poder asignarle empresas.</p>" +
      "</div></div>" +
      '<div class="edit-actions">' +
      '<button class="btn btn-primary btn-sm" data-save="' + esc(u.user_id) + '">Guardar cambios</button>' +
      '<button class="btn btn-ghost btn-sm" data-cancel>Cancelar</button>' +
      '<span class="msg" data-msg></span></div></div>';
  }

  function usuarioHTML(u) {
    var abierto = D.abierto === u.user_id;
    var rol = esSuper(u) ? "Superadmin" : "Usuario";
    return '<div class="user-row">' +
      '<button class="user-main" data-open="' + esc(u.user_id) + '">' +
      '<span class="avatar">' + esc(inicial(u.nombre || u.email)) + "</span>" +
      '<span class="user-id"><b>' + esc(u.nombre || u.email) + "</b>" +
      "<span>" + esc(u.email || "—") + "</span></span>" +
      '<span class="user-tags"><span class="pill">' + rol + "</span>" +
      (activo(u) ? "" : '<span class="pill pill-off">Inactivo</span>') +
      resumenModulos(u) + resumenEmpresas(u) + "</span></button>" +
      (abierto ? editorHTML(u) : "") + "</div>";
  }

  function listaHTML() {
    var f = D.filtro.trim().toLowerCase();
    var visibles = D.usuarios.filter(function (u) {
      if (!f) return true;
      return (String(u.nombre || "") + " " + String(u.email || "") + " " +
        String(u.rol_global || "")).toLowerCase().indexOf(f) !== -1;
    });
    if (!visibles.length) {
      return '<div class="empty"><h3>Sin resultados</h3>' +
        "<p>No encontramos usuarios con ese nombre o correo.</p></div>";
    }
    return '<div class="users">' + visibles.map(usuarioHTML).join("") + "</div>";
  }

  function pintar(host) {
    host.innerHTML =
      '<div class="view-head admin-head">' +
      '<div class="grow"><h1>Administrar accesos</h1>' +
      "<p>Usuarios registrados en el portal y los permisos que tienen hoy.</p></div>" +
      '<div class="search"><input id="admQ" type="search" placeholder="Buscar usuario…" value="' +
      esc(D.filtro) + '"></div>' +
      '<a class="btn btn-ghost btn-sm" href="#/inicio">Volver al inicio</a></div>' +
      '<div id="admList">' + listaHTML() + "</div>" +
      '<p class="hint-line">Para dar de alta a alguien nuevo: primero crea o invita al usuario ' +
      "desde Supabase Authentication y agrégalo a <b>usuarios_portal</b>. Después podrás asignarle " +
      "permisos aquí.</p>";

    var q = document.getElementById("admQ");
    q.addEventListener("input", function () {
      D.filtro = q.value;
      document.getElementById("admList").innerHTML = listaHTML();
    });
  }

  /* --- Guardado ----------------------------------------------------------- */
  // Crea el renglón si no existe y lo actualiza si ya existía: nunca duplica.
  function upsertAsignacion(tabla, match, patch, existe) {
    if (existe) return window.LapzoSB.update(tabla, patch, match);
    return window.LapzoSB.insert(tabla, [Object.assign({}, match, patch)]);
  }

  function guardar(userId, row) {
    var msg = row.querySelector("[data-msg]");
    var btn = row.querySelector("[data-save]");
    var mods = D.asignModulo[userId] || {};
    var emps = D.asignEmpresa[userId] || {};
    var tareas = [];

    row.querySelectorAll("[data-mod]").forEach(function (cb) {
      var id = cb.getAttribute("data-mod");
      var quiere = cb.checked;
      var actual = mods[id];
      if (actual && actual.activo === quiere) return;
      tareas.push({
        etiqueta: "módulo",
        run: function () {
          return upsertAsignacion("usuario_modulo",
            { user_id: userId, modulo_id: id },
            { activo: quiere, rol_modulo: (actual && actual.rol) || "usuario" },
            !!actual);
        },
        apply: function () { mods[id] = { rol: (actual && actual.rol) || "usuario", activo: quiere }; }
      });
    });

    row.querySelectorAll("[data-emp]").forEach(function (cb) {
      var id = cb.getAttribute("data-emp");
      var sel = row.querySelector('[data-emp-rol="' + id + '"]');
      var quiere = cb.checked;
      var rol = sel ? sel.value : "usuario";
      var actual = emps[id];
      if (actual && actual.activo === quiere && actual.rol === rol) return;
      tareas.push({
        etiqueta: "empresa",
        run: function () {
          return upsertAsignacion("usuario_empresa",
            { user_id: userId, empresa_id: id },
            { activo: quiere, rol_empresa: rol },
            !!actual);
        },
        apply: function () { emps[id] = { rol: rol, activo: quiere }; }
      });
    });

    if (!tareas.length) {
      msg.className = "msg";
      msg.textContent = "No hay cambios por guardar.";
      return;
    }

    btn.disabled = true;
    msg.className = "msg";
    msg.textContent = "Guardando…";

    var fallos = [];
    var seq = tareas.reduce(function (p, t) {
      return p.then(function () {
        return t.run().then(t.apply).catch(function (err) {
          console.error("[LapzoAdmin] Falló un cambio de " + t.etiqueta + ":", err);
          fallos.push(t.etiqueta);
        });
      });
    }, Promise.resolve());

    seq.then(function () {
      D.asignModulo[userId] = mods;
      D.asignEmpresa[userId] = emps;
      btn.disabled = false;
      window.LapzoPerms.invalidate();
      if (!fallos.length) {
        msg.className = "msg ok";
        msg.textContent = "Permisos actualizados correctamente.";
      } else if (fallos.length === tareas.length) {
        msg.className = "msg err";
        msg.textContent = "No fue posible actualizar los permisos.";
      } else {
        msg.className = "msg err";
        msg.textContent = "No se realizaron todos los cambios: fallaron " +
          fallos.length + " de " + tareas.length + ". Revisa e intenta otra vez.";
      }
      // Refresca los resúmenes de la fila sin cerrar el editor.
      var lista = document.getElementById("admList");
      var abiertoMsg = msg.textContent, abiertaClase = msg.className;
      lista.innerHTML = listaHTML();
      var nuevo = lista.querySelector('[data-save="' + userId + '"]');
      if (nuevo) {
        var m = nuevo.parentNode.querySelector("[data-msg]");
        m.className = abiertaClase;
        m.textContent = abiertoMsg;
      }
    });
  }

  /* --- Eventos ------------------------------------------------------------ */
  function wire(host) {
    host.addEventListener("click", function (e) {
      var open = e.target.closest("[data-open]");
      if (open) {
        var id = open.getAttribute("data-open");
        D.abierto = D.abierto === id ? null : id;
        document.getElementById("admList").innerHTML = listaHTML();
        return;
      }
      if (e.target.closest("[data-cancel]")) {
        D.abierto = null;
        document.getElementById("admList").innerHTML = listaHTML();
        return;
      }
      var save = e.target.closest("[data-save]");
      if (save) guardar(save.getAttribute("data-save"), save.closest(".user-row"));
    });

    // El selector de rol solo tiene sentido si la empresa está marcada, y las
    // empresas solo si el usuario tiene el Centro de Reportes.
    host.addEventListener("change", function (e) {
      var cbEmp = e.target.closest("[data-emp]");
      if (cbEmp) {
        var sel = e.target.closest(".user-edit")
          .querySelector('[data-emp-rol="' + cbEmp.getAttribute("data-emp") + '"]');
        if (sel) sel.disabled = !cbEmp.checked;
        return;
      }
      var cbMod = e.target.closest('[data-slug="centro_reportes"]');
      if (cbMod) {
        var edit = e.target.closest(".user-edit");
        edit.querySelectorAll("[data-emp]").forEach(function (c) {
          c.disabled = !cbMod.checked;
          if (!cbMod.checked) c.checked = false;
          var s = edit.querySelector('[data-emp-rol="' + c.getAttribute("data-emp") + '"]');
          if (s) s.disabled = !c.checked;
        });
        var warn = edit.querySelector("[data-dep-warn]");
        if (warn) warn.style.display = cbMod.checked ? "none" : "";
      }
    });
  }

  function render(host, user) {
    host.innerHTML =
      '<div class="view-head"><h1>Administrar accesos</h1><p>Cargando usuarios…</p></div>' +
      '<div class="skeleton"><div class="sk"></div><div class="sk"></div></div>';
    cargar().then(function () {
      pintar(host);
      if (!host.getAttribute("data-wired")) {
        wire(host);
        host.setAttribute("data-wired", "1");
      }
    }).catch(function (err) {
      console.error("[LapzoAdmin] No se pudieron cargar los usuarios:", err);
      host.innerHTML =
        '<div class="view-head"><h1>Administrar accesos</h1></div>' +
        '<div class="notice notice-err">No fue posible consultar los usuarios del portal. ' +
        "Intenta nuevamente.</div>" +
        '<p style="margin-top:18px"><a class="btn btn-ghost" href="#/inicio">Volver al inicio</a></p>';
    });
  }

  return { render: render };
})();
