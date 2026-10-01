/* ============================================================================
   PORTAL LAPZO · sesión y usuario del portal
   ----------------------------------------------------------------------------
   Responde dos preguntas y nada más:
     1. ¿Hay sesión válida de Supabase Auth?
     2. ¿Ese usuario existe y está activo en public.usuarios_portal?

   Los permisos por módulo, empresa y artefacto viven en permissions.js.
   ============================================================================ */

window.LapzoAuth = (function () {
  "use strict";

  var cache = { user: null, at: 0 };

  function ttl() {
    return (window.LAPZO_CONFIG.PERMISSION_CACHE_TTL || 30) * 1000;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function signIn(email, password) {
    var mail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return Promise.reject(new Error("El correo no tiene un formato válido."));
    }
    if (!password) return Promise.reject(new Error("Escribe tu contraseña."));
    cache = { user: null, at: 0 };
    return window.LapzoSB.signIn(mail, password);
  }

  function signOut() {
    cache = { user: null, at: 0 };
    return window.LapzoSB.signOut();
  }

  function getSession() {
    return window.LapzoSB.getSession();
  }

  /* Lee el renglón del usuario en usuarios_portal. Con RLS cada persona solo
     puede ver el suyo, así que no hace falta filtrar nada aquí.
     Devuelve null si no hay sesión, y {existe:false} si la sesión es válida
     pero la persona no está dada de alta en el portal. */
  function getPortalUser(force) {
    if (!force && cache.user && (Date.now() - cache.at) < ttl()) {
      return Promise.resolve(cache.user);
    }
    return getSession().then(function (session) {
      if (!session || !session.user) return null;
      var authUser = session.user;
      return window.LapzoSB.select("usuarios_portal", {
        columns: "user_id,email,nombre,rol_global,activo",
        eq: { user_id: authUser.id },
        limit: 1
      }).then(function (rows) {
        var row = (rows || [])[0];
        var user;
        if (!row) {
          user = {
            user_id: authUser.id,
            email: authUser.email || "",
            nombre: "",
            rol_global: null,
            activo: false,
            existe: false
          };
        } else {
          user = {
            user_id: row.user_id,
            email: row.email || authUser.email || "",
            nombre: row.nombre || (row.email || authUser.email || "").split("@")[0],
            rol_global: String(row.rol_global || "usuario").toLowerCase(),
            activo: row.activo === true || String(row.activo).toLowerCase() === "true",
            existe: true
          };
        }
        cache = { user: user, at: Date.now() };
        return user;
      });
    });
  }

  function isSuperadmin(user) {
    return !!(user && user.existe && user.activo && user.rol_global === "superadmin");
  }

  function primerNombre(user) {
    if (!user) return "";
    var n = (user.nombre || user.email || "").trim();
    return n.split(/[\s@.]+/)[0].replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function invalidate() { cache = { user: null, at: 0 }; }

  return {
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    getPortalUser: getPortalUser,
    isSuperadmin: isSuperadmin,
    primerNombre: primerNombre,
    normalizeEmail: normalizeEmail,
    invalidate: invalidate,
    onAuthChange: function (fn) { return window.LapzoSB.onAuthChange(fn); }
  };
})();
