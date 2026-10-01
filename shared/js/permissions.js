/* ============================================================================
   PORTAL LAPZO · permisos
   ----------------------------------------------------------------------------
   Jerarquía, tal como está definida en Supabase:

     Supabase Auth → usuarios_portal → rol_global
                                     → usuario_modulo  → modulos_portal
                                     → usuario_empresa → empresas → artefactos

   Reglas que se aplican aquí:
     · superadmin ve todo lo que RLS le devuelva, sin necesitar filas en
       usuario_modulo ni usuario_empresa;
     · un usuario normal ve la intersección de lo que RLS devuelve con sus
       asignaciones activas;
     · nada inactivo se muestra (usuario, módulo, empresa o artefacto);
     · se respeta el campo "orden".

   El frontend no inventa permisos: si Supabase no devuelve algo, no existe
   para el portal. Ocultar una tarjeta no es la seguridad; la seguridad es RLS.
   ============================================================================ */

window.LapzoPerms = (function () {
  "use strict";

  var cache = {};

  function ttl() {
    return (window.LAPZO_CONFIG.PERMISSION_CACHE_TTL || 30) * 1000;
  }

  // Cachea muy brevemente dentro de la misma carga de página. Nunca en
  // localStorage: si un superadmin cambia permisos, el siguiente reload manda.
  function memo(key, fn) {
    var hit = cache[key];
    if (hit && (Date.now() - hit.at) < ttl()) return hit.p;
    var p = fn().catch(function (err) { delete cache[key]; throw err; });
    cache[key] = { p: p, at: Date.now() };
    return p;
  }

  function invalidate() { cache = {}; }

  function activo(row) {
    return row.activo === true || String(row.activo).toLowerCase() === "true";
  }

  function porOrden(a, b) {
    var oa = a.orden === null || a.orden === undefined ? 9999 : Number(a.orden);
    var ob = b.orden === null || b.orden === undefined ? 9999 : Number(b.orden);
    return oa - ob || String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  }

  /* --- Módulos ----------------------------------------------------------- */
  function getAllowedModules(user) {
    return memo("mod:" + (user && user.user_id), function () {
      if (!user || !user.existe || !user.activo) return Promise.resolve([]);

      var pModulos = window.LapzoSB.select("modulos_portal", {
        columns: "id,slug,nombre,descripcion,ruta,activo,orden",
        eq: { activo: true }
      });

      if (window.LapzoAuth.isSuperadmin(user)) {
        return pModulos.then(function (mods) {
          return (mods || []).filter(activo).sort(porOrden).map(function (m) {
            return decorate(m, "superadmin");
          });
        });
      }

      var pAsign = window.LapzoSB.select("usuario_modulo", {
        columns: "modulo_id,rol_modulo,activo",
        eq: { user_id: user.user_id, activo: true }
      });

      return Promise.all([pModulos, pAsign]).then(function (r) {
        var mods = (r[0] || []).filter(activo);
        var asign = (r[1] || []).filter(activo);
        var rolPorModulo = {};
        asign.forEach(function (a) { rolPorModulo[a.modulo_id] = a.rol_modulo || "usuario"; });
        return mods
          .filter(function (m) { return Object.prototype.hasOwnProperty.call(rolPorModulo, m.id); })
          .sort(porOrden)
          .map(function (m) { return decorate(m, rolPorModulo[m.id]); });
      });
    });
  }

  function decorate(m, rol) {
    var ui = (window.LAPZO_CONFIG.MODULE_UI || {})[m.slug] || {};
    return {
      id: m.id,
      slug: m.slug,
      nombre: m.nombre || m.slug,
      descripcion: m.descripcion || "",
      ruta: m.ruta || "",
      orden: m.orden,
      rol_modulo: rol || "usuario",
      icono: ui.icono || "modulo",
      color: ui.color || "#8b55fe"
    };
  }

  function hasModule(user, slug) {
    return getAllowedModules(user).then(function (mods) {
      return mods.some(function (m) { return m.slug === slug; });
    });
  }

  /* --- Empresas ---------------------------------------------------------- */
  /* Se consulta empresas normalmente y RLS participa. Para usuarios normales
     se cruza además con usuario_empresa, que es donde vive el rol por empresa
     (admin / usuario / lector) y que el portal necesita conocer de todas
     formas para la interfaz. Si ese cruce falla, se registra el detalle y se
     usa lo que RLS devolvió, sin ampliar nunca el resultado. */
  function getAllowedCompanies(user) {
    return memo("emp:" + (user && user.user_id), function () {
      if (!user || !user.existe || !user.activo) return Promise.resolve([]);

      var pEmpresas = window.LapzoSB.select("empresas", {
        columns: "id,slug,nombre,descripcion,activo,orden",
        eq: { activo: true }
      });

      if (window.LapzoAuth.isSuperadmin(user)) {
        return pEmpresas.then(function (emps) {
          return (emps || []).filter(activo).sort(porOrden).map(function (e) {
            return Object.assign({}, e, { rol_empresa: "admin" });
          });
        });
      }

      var pAsign = window.LapzoSB.select("usuario_empresa", {
        columns: "empresa_id,rol_empresa,activo",
        eq: { user_id: user.user_id, activo: true }
      }).catch(function (err) {
        console.error("[LapzoPerms] No se pudo leer usuario_empresa:", err);
        return null;
      });

      return Promise.all([pEmpresas, pAsign]).then(function (r) {
        var emps = (r[0] || []).filter(activo).sort(porOrden);
        var asign = r[1];
        if (asign === null) {
          return emps.map(function (e) { return Object.assign({}, e, { rol_empresa: "lector" }); });
        }
        var rolPorEmpresa = {};
        asign.filter(activo).forEach(function (a) {
          rolPorEmpresa[a.empresa_id] = String(a.rol_empresa || "usuario").toLowerCase();
        });
        return emps
          .filter(function (e) { return Object.prototype.hasOwnProperty.call(rolPorEmpresa, e.id); })
          .map(function (e) { return Object.assign({}, e, { rol_empresa: rolPorEmpresa[e.id] }); });
      });
    });
  }

  function hasCompany(user, slug) {
    return getAllowedCompanies(user).then(function (emps) {
      return emps.some(function (e) { return e.slug === slug; });
    });
  }

  /* --- Artefactos -------------------------------------------------------- */
  /* Hoy el permiso se otorga por empresa: si puedes ver la empresa, puedes ver
     sus artefactos activos. El día que exista usuario_artefacto, el filtro
     extra se agrega aquí y nada más cambia. */
  function getAllowedArtifacts(user) {
    return memo("art:" + (user && user.user_id), function () {
      return getAllowedCompanies(user).then(function (emps) {
        if (!emps.length) return [];
        var porId = {};
        emps.forEach(function (e) { porId[e.id] = e; });
        return window.LapzoSB.select("artefactos", {
          columns: "id,empresa_id,slug,nombre,descripcion,ruta,activo,orden",
          eq: { activo: true }
        }).then(function (arts) {
          return (arts || [])
            .filter(activo)
            .filter(function (a) { return Object.prototype.hasOwnProperty.call(porId, a.empresa_id); })
            .sort(porOrden)
            .map(function (a) {
              var e = porId[a.empresa_id];
              return {
                id: a.id,
                slug: a.slug,
                nombre: a.nombre || a.slug,
                descripcion: a.descripcion || "",
                ruta: a.ruta || "",
                orden: a.orden,
                empresa_id: a.empresa_id,
                empresa_slug: e.slug,
                empresa_nombre: e.nombre,
                rol_empresa: e.rol_empresa
              };
            });
        });
      });
    });
  }

  return {
    getAllowedModules: getAllowedModules,
    hasModule: hasModule,
    getAllowedCompanies: getAllowedCompanies,
    hasCompany: hasCompany,
    getAllowedArtifacts: getAllowedArtifacts,
    invalidate: invalidate
  };
})();
