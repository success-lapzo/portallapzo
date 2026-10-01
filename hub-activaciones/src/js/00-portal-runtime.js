"use strict";
/* ============================================================
   PARTE 0 — Runtime del Hub dentro de Portal Lapzo
   ------------------------------------------------------------
   Sustituye por completo al shim del entorno de Claude. Este es
   el ÚNICO archivo del Hub que habla con Supabase:

        01..05 (catálogos, vistas, motor)
                    │
        02 estado / 06 eventos
                    │
                   HUB          ← este archivo
                    │
        shared/js (LapzoSB, LapzoAuth, LapzoPerms, LapzoGuard)
                    │
                 Supabase

   Se apoya en la capa compartida del portal, así que no hay un
   segundo cliente, ni una segunda configuración, ni un segundo
   login. La sesión es la misma que la del portal.

   La seguridad real la aplica RLS. Lo que se calcula aquí
   (nivel del Hub, capacidades de UI) sirve para la interfaz.
   ============================================================ */

window.HUB = (function () {

  var CONFIG_CLAVE = "general";
  var PESOS_CLAVE = "motor_complejidad";
  var MODULO = "hub_activaciones";

  var ST = {
    user: null,          // {user_id, email, nombre, rol_global}
    nivel: "ae",         // ae | as | hcs — viene de hub_nivel_actual()
    folios: {},          // folio → uuid de hub_solicitudes
    recursoDb: {}        // id de item → uuid de hub_recursos
  };

  function sb() { return window.LapzoSB; }

  /* ---------- utilidades ---------- */
  function activo(v) { return v === true || String(v).toLowerCase() === "true"; }

  // Traduce un error de Supabase a algo legible, sin stack ni jerga.
  function humano(err, contexto) {
    var m = String((err && err.message) || err || "");
    console.error("[HUB] " + contexto + ":", err);
    if (/permission denied|row-level security|violates/i.test(m)) {
      return contexto + ": tu nivel de acceso no permite esta operación.";
    }
    if (/failed to fetch|networkerror|load failed/i.test(m) || navigator.onLine === false) {
      return "No hay conexión con Portal Lapzo. Reintenta cuando recuperes conexión.";
    }
    if (/jwt|expired/i.test(m)) {
      return "Tu sesión expiró. Vuelve a entrar desde Portal Lapzo.";
    }
    return contexto + ". No se realizaron los cambios.";
  }

  /* ---------- sesión, acceso y nivel ---------- */
  function usuario() { return ST.user; }
  function nivel() { return ST.nivel; }

  /* Nivel operativo del Hub. Sale de la base, no de la interfaz ni de la URL:
     hub_nivel_actual() ya resuelve superadmin → hcs. Si la función no
     estuviera disponible, se cae a hub_usuario_rol y, en último caso, a `ae`,
     que es el nivel sin privilegios. */
  function cargarNivel() {
    return sb().rpc("hub_nivel_actual", {}).then(function (r) {
      var v = Array.isArray(r) ? r[0] : r;
      if (typeof v === "object" && v !== null) v = v.hub_nivel_actual || v.nivel;
      v = String(v || "").toLowerCase();
      if (v === "ae" || v === "as" || v === "hcs") return v;
      throw new Error("nivel no reconocido: " + v);
    }).catch(function (err) {
      console.error("[HUB] hub_nivel_actual() no respondió, se consulta hub_usuario_rol:", err);
      return sb().select("hub_usuario_rol", {
        columns: "nivel,activo",
        eq: { user_id: ST.user.user_id, activo: true },
        limit: 1
      }).then(function (rows) {
        var n = rows[0] && String(rows[0].nivel || "").toLowerCase();
        return (n === "as" || n === "hcs" || n === "ae") ? n : "ae";
      }).catch(function () { return "ae"; });
    });
  }

  /* ---------- configuración ---------- */
  function loadConfig() {
    return sb().select("hub_configuracion", {
      columns: "clave,valor,updated_at",
      eq: { clave: CONFIG_CLAVE },
      limit: 1
    }).then(function (rows) {
      return (rows[0] && rows[0].valor) || null;
    });
  }

  function saveConfig(config) {
    return sb().upsert("hub_configuracion", [{
      clave: CONFIG_CLAVE,
      valor: config,
      actualizado_por: ST.user ? ST.user.user_id : null
    }], "clave");
  }

  /* ---------- catálogos ----------
     Una sola tabla con tres tipos. Se leen todos de un tirón y se reparten:
       componente → S.catalogo.productos[clave] = valor.items
       peso       → S.pesos y S.niveles
       categoria  → S.categorias[clave] = valor.secciones               */
  function loadCatalogs() {
    return sb().select("hub_catalogos", {
      columns: "id,tipo,clave,nombre,valor,activo,orden",
      eq: { activo: true },
      order: "orden"
    }).then(function (rows) {
      var out = { productos: {}, nombres: {}, pesos: null, niveles: null, categorias: {} };
      (rows || []).filter(function (r) { return activo(r.activo); }).forEach(function (r) {
        var v = r.valor || {};
        if (r.tipo === "componente") {
          out.productos[r.clave] = Array.isArray(v.items) ? v.items : [];
          if (r.nombre) out.nombres[r.clave] = r.nombre;
        } else if (r.tipo === "peso" && r.clave === PESOS_CLAVE) {
          out.pesos = {
            cuenta: v.cuenta, semaforo: v.semaforo,
            componente: v.componente, flags: v.flags
          };
          if (Array.isArray(v.niveles) && v.niveles.length) out.niveles = v.niveles;
        } else if (r.tipo === "categoria") {
          out.categorias[r.clave] = Array.isArray(v.secciones) ? v.secciones : [];
        }
      });
      return out;
    });
  }

  // Una fila por producto, no un documento con todo el catálogo.
  function saveComponents(productoKey, items, nombreVisible) {
    return sb().upsert("hub_catalogos", [{
      tipo: "componente",
      clave: productoKey,
      nombre: nombreVisible || productoKey,
      valor: { items: items },
      activo: true
    }], "tipo,clave");
  }

  function saveWeights(pesos, niveles) {
    return sb().upsert("hub_catalogos", [{
      tipo: "peso",
      clave: PESOS_CLAVE,
      nombre: "Motor de complejidad",
      valor: {
        cuenta: pesos.cuenta, semaforo: pesos.semaforo,
        componente: pesos.componente, flags: pesos.flags,
        niveles: niveles
      },
      activo: true
    }], "tipo,clave");
  }

  function saveCategories(productoKey, secciones) {
    return sb().upsert("hub_catalogos", [{
      tipo: "categoria",
      clave: productoKey,
      nombre: "Secciones de " + productoKey,
      valor: { secciones: secciones },
      activo: true
    }], "tipo,clave");
  }

  /* ---------- solicitudes ----------
     La aplicación trabaja con el folio (SOL-XXXXXXX) como `s.id`, que es lo
     que ya usan cientos de referencias. El UUID real de la fila se guarda
     aparte, en `s.__dbId` y en un mapa folio → uuid, porque la bitácora
     central y los UPDATE lo necesitan. El UUID nunca se muestra. */
  var COLS = {
    cuenta: "cuenta", ae: "ae", tipo: "tipo", contexto: "contexto",
    fechaCliente: "fecha_cliente", productos: "productos",
    vitallyId: "vitally_id", cuentaInfo: "cuenta_info",
    estado: "estado", sprint: "sprint", asignado: "asignado",
    ruta: "ruta", fechaEntrega: "fecha_entrega",
    diagnostico: "diagnostico", componentes: "componentes",
    criterios: "criterios", bitacora: "bitacora"
  };

  function deFila(row) {
    ST.folios[row.folio] = row.id;
    return {
      id: row.folio,
      __dbId: row.id,
      cuenta: row.cuenta, ae: row.ae, tipo: row.tipo, contexto: row.contexto,
      fechaCliente: row.fecha_cliente, productos: row.productos || [],
      vitallyId: row.vitally_id, cuentaInfo: row.cuenta_info,
      estado: row.estado, sprint: row.sprint, asignado: row.asignado,
      ruta: row.ruta, fechaEntrega: row.fecha_entrega,
      diagnostico: row.diagnostico || { contexto: {}, porModulo: {}, flags: {} },
      componentes: row.componentes || {},
      criterios: row.criterios || {},
      bitacora: Array.isArray(row.bitacora) ? row.bitacora : [],
      creadoEn: row.created_at
    };
  }

  function loadRequests() {
    return sb().select("hub_solicitudes", {
      columns: "id,folio,creado_por,ae_user_id,ae,cuenta,vitally_id,cuenta_info,tipo," +
        "contexto,fecha_cliente,productos,estado,sprint,asignado,ruta,fecha_entrega," +
        "diagnostico,componentes,criterios,bitacora,created_at,updated_at",
      order: "created_at",
      ascending: false
    }).then(function (rows) {
      ST.folios = {};
      return (rows || []).map(deFila);
    });
  }

  function nuevoFolio() {
    return "SOL-" + Math.random().toString(36).slice(2, 9).toUpperCase();
  }

  /* Primero escribe, después confirma. Devuelve la solicitud ya reconstruida
     desde la fila que guardó Postgres, así `creadoEn` es el created_at real. */
  function createRequest(data) {
    var fila = {
      folio: nuevoFolio(),
      creado_por: ST.user.user_id,
      ae_user_id: ST.nivel === "ae" ? ST.user.user_id : null,
      ae: data.ae || null,
      cuenta: data.cuenta || null,
      vitally_id: data.vitallyId || null,
      cuenta_info: data.cuentaInfo || null,
      tipo: data.tipo || null,
      contexto: data.contexto || null,
      fecha_cliente: data.fechaCliente || null,
      productos: data.productos || [],
      estado: "nueva",
      diagnostico: { contexto: {}, porModulo: {}, flags: {} },
      componentes: {}, criterios: {}, bitacora: []
    };
    return sb().insert("hub_solicitudes", [fila], { devolver: true })
      .then(function (rows) {
        var row = (rows && rows[0]) || null;
        if (!row) {
          // Sin representación de vuelta: se recupera por folio.
          return sb().select("hub_solicitudes", {
            columns: "*", eq: { folio: fila.folio }, limit: 1
          }).then(function (r) { return r[0] ? deFila(r[0]) : null; });
        }
        return deFila(row);
      })
      .then(function (sol) {
        if (sol) {
          addAuditEvent(sol.id, "solicitud_creada", null, "nueva",
            { cuenta: sol.cuenta, productos: sol.productos });
        }
        return sol;
      });
  }

  /* Solo las columnas afectadas. No se reescribe la fila completa. */
  function updateRequest(folio, patch) {
    var uuid = ST.folios[folio];
    if (!uuid) return Promise.reject(new Error("no encontré la solicitud " + folio));
    var cambios = {};
    Object.keys(patch || {}).forEach(function (k) {
      if (COLS[k]) cambios[COLS[k]] = patch[k];
    });
    if (!Object.keys(cambios).length) return Promise.resolve(true);
    return sb().update("hub_solicitudes", cambios, { id: uuid }).then(function () { return true; });
  }

  // No hay DELETE: cancelar es un cambio de estado, deliberadamente.
  function cancelRequest(folio, estadoAnterior) {
    return updateRequest(folio, { estado: "cancelada" }).then(function () {
      return addAuditEvent(folio, "solicitud_cancelada", estadoAnterior, "cancelada", null);
    });
  }

  /* ---------- recursos ----------
     Una fila por recurso. El id que ve la aplicación es el UUID de la fila,
     así que borrar es directo y no hay que reescribir el array del producto. */
  function loadResources() {
    return sb().select("hub_recursos", {
      columns: "id,producto,titulo,descripcion,tipo,url,metadata,activo,orden",
      eq: { activo: true },
      order: "orden"
    }).then(function (rows) {
      var map = {};
      (rows || []).filter(function (r) { return activo(r.activo); }).forEach(function (r) {
        var m = r.metadata || {};
        (map[r.producto] = map[r.producto] || []).push({
          id: r.id, titulo: r.titulo, url: r.url,
          cat: m.cat || null, driveId: m.driveId || null,
          mime: m.mime || r.tipo || null,
          tamano: m.tamano || null, modificado: m.modificado || null
        });
      });
      return map;
    });
  }

  function createResource(producto, item) {
    var fila = {
      producto: producto,
      titulo: item.titulo || "(sin título)",
      descripcion: item.descripcion || null,
      tipo: item.mime || null,
      url: item.url || null,
      metadata: {
        cat: item.cat || null, driveId: item.driveId || null,
        mime: item.mime || null, tamano: item.tamano || null,
        modificado: item.modificado || null
      },
      activo: true,
      creado_por: ST.user ? ST.user.user_id : null
    };
    return sb().insert("hub_recursos", [fila], { devolver: true }).then(function (rows) {
      var r = (rows && rows[0]) || null;
      return r ? { id: r.id, titulo: r.titulo, url: r.url, cat: (r.metadata || {}).cat,
                   driveId: (r.metadata || {}).driveId, mime: (r.metadata || {}).mime,
                   tamano: (r.metadata || {}).tamano, modificado: (r.metadata || {}).modificado }
               : null;
    });
  }

  function deleteResource(id) {
    return sb().remove("hub_recursos", { id: id }).then(function () { return true; });
  }

  /* ---------- roles del Hub ----------
     El Hub solo administra el nivel operativo. Las cuentas y el acceso al
     portal se administran en Portal Lapzo → Administrar accesos. */
  function loadHubRoles() {
    return Promise.all([
      sb().select("hub_usuario_rol", { columns: "user_id,nivel,activo,updated_at" }),
      sb().select("usuarios_portal", { columns: "user_id,email,nombre,activo" })
        .catch(function (err) {
          console.error("[HUB] no se pudo leer usuarios_portal:", err);
          return [];
        })
    ]).then(function (r) {
      var porId = {};
      (r[1] || []).forEach(function (u) { porId[u.user_id] = u; });
      var personas = (r[0] || []).map(function (x) {
        var u = porId[x.user_id] || {};
        return {
          id: x.user_id,
          nombre: u.nombre || u.email || "Usuario del portal",
          email: u.email || "",
          nivel: String(x.nivel || "ae").toLowerCase(),
          activo: activo(x.activo)
        };
      });
      // Personas del portal que todavía no tienen nivel en el Hub.
      var conRol = {};
      personas.forEach(function (p) { conRol[p.id] = true; });
      var candidatos = (r[1] || []).filter(function (u) {
        return !conRol[u.user_id] && activo(u.activo);
      }).map(function (u) {
        return { id: u.user_id, nombre: u.nombre || u.email, email: u.email || "" };
      });
      return { personas: personas, candidatos: candidatos };
    });
  }

  function updateHubRole(userId, patch) {
    var fila = { user_id: userId };
    if (patch.nivel) fila.nivel = patch.nivel;
    if (patch.activo !== undefined) fila.activo = !!patch.activo;
    return sb().upsert("hub_usuario_rol", [fila], "user_id").then(function () { return true; });
  }

  /* ---------- bitácora ----------
     hub_bitacora es la fuente oficial de auditoría y usa el UUID real de la
     solicitud. La bitácora embebida en la fila se conserva por compatibilidad
     con las vistas del Hub, pero no es la trazabilidad. */
  function addAuditEvent(folio, accion, estadoAnterior, estadoNuevo, detalle) {
    if (!ST.user) return Promise.resolve(false);
    var fila = {
      solicitud_id: folio ? (ST.folios[folio] || null) : null,
      user_id: ST.user.user_id,
      accion: accion,
      estado_anterior: estadoAnterior || null,
      estado_nuevo: estadoNuevo || null,
      detalle: detalle || null
    };
    return sb().insert("hub_bitacora", [fila]).then(function () { return true; })
      .catch(function (err) {
        // Que falle la auditoría no debe tumbar la acción principal.
        console.error("[HUB] no se pudo registrar en bitácora:", err);
        return false;
      });
  }

  /* ---------- arranque ----------
     1. sesión y usuario del portal + permiso del módulo  (guard compartido)
     2. nivel operativo del Hub
     3. configuración, catálogos, solicitudes y recursos en paralelo
     Devuelve todo junto; quien reconstruye S y renderiza es el archivo 06. */
  function loadHub() {
    return window.LapzoGuard.requireModule(MODULO, {
      nombre: "el Hub de Activaciones",
      mensaje: "Cargando Hub de Activaciones…"
    }).then(function (ctx) {
      ST.user = ctx.user;
      return cargarNivel();
    }).then(function (n) {
      ST.nivel = n;
      return Promise.all([loadConfig(), loadCatalogs(), loadRequests(), loadResources()]);
    }).then(function (r) {
      return {
        user: ST.user, nivel: ST.nivel,
        config: r[0], catalogos: r[1], solicitudes: r[2], recursos: r[3]
      };
    });
  }

  /* Relee solo los datos, sin volver a validar la sesión. Se usa al recuperar
     el foco de la pestaña y después de operaciones con varias escrituras. */
  function reloadData() {
    return Promise.all([loadConfig(), loadCatalogs(), loadRequests(), loadResources()])
      .then(function (r) {
        return { config: r[0], catalogos: r[1], solicitudes: r[2], recursos: r[3] };
      });
  }

  function folioUuid(folio) { return ST.folios[folio] || null; }

  return {
    loadHub: loadHub, reloadData: reloadData,
    usuario: usuario, nivel: nivel, folioUuid: folioUuid, humano: humano,
    loadConfig: loadConfig, saveConfig: saveConfig,
    loadCatalogs: loadCatalogs, saveComponents: saveComponents,
    saveWeights: saveWeights, saveCategories: saveCategories,
    loadRequests: loadRequests, createRequest: createRequest,
    updateRequest: updateRequest, cancelRequest: cancelRequest,
    loadResources: loadResources, createResource: createResource,
    deleteResource: deleteResource,
    loadHubRoles: loadHubRoles, updateHubRole: updateHubRole,
    addAuditEvent: addAuditEvent
  };
})();
