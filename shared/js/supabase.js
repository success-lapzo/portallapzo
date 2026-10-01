/* ============================================================================
   PORTAL LAPZO · cliente Supabase compartido
   ----------------------------------------------------------------------------
   Una sola instancia para todo el portal. Todos los módulos hablan con
   LapzoSB.* y nunca con el SDK directamente, para que la sesión, la clave de
   almacenamiento y el manejo de errores sean idénticos en todas las pantallas.

   Dos modos, misma interfaz:
     "sdk"  → @supabase/supabase-js desde CDN (lo normal)
     "rest" → llamadas fetch a la API REST/Auth (si el CDN está bloqueado)

   La autorización NUNCA se decide aquí. Este archivo solo consulta; quien
   decide es Supabase con RLS.
   ============================================================================ */

window.LapzoSB = (function () {
  "use strict";

  var CFG = window.LAPZO_CONFIG;
  var URL_BASE = CFG.SUPABASE_URL.replace(/\/+$/, "");
  var KEY = CFG.SUPABASE_PUBLISHABLE_KEY;

  var S = {
    mode: null,
    client: null,
    session: null,
    ready: null,
    listeners: []
  };

  /* --- Carga del SDK ------------------------------------------------------ */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
  }

  function init() {
    if (S.ready) return S.ready;
    S.ready = (function () {
      var have = window.supabase && typeof window.supabase.createClient === "function";
      var p = have ? Promise.resolve() : loadScript(CFG.SUPABASE_JS_CDN).catch(function (e) {
        console.warn("[LapzoSB] SDK no disponible, se usará la API REST.", e);
      });
      return p.then(function () {
        if (window.supabase && typeof window.supabase.createClient === "function") {
          S.client = window.supabase.createClient(URL_BASE, KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              storageKey: CFG.AUTH_STORAGE_KEY
            }
          });
          S.mode = "sdk";
          S.client.auth.onAuthStateChange(function (event, session) {
            S.session = session || null;
            S.listeners.forEach(function (fn) {
              try { fn(event, session); } catch (e) { console.error(e); }
            });
          });
        } else {
          S.mode = "rest";
        }
        return S.mode;
      });
    })();
    return S.ready;
  }

  /* --- Sesión en modo REST ----------------------------------------------- */
  function storeRead() {
    try {
      var raw = localStorage.getItem(CFG.AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function storeWrite(session) {
    try {
      if (session) localStorage.setItem(CFG.AUTH_STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(CFG.AUTH_STORAGE_KEY);
    } catch (e) { /* sin almacenamiento: la sesión vivirá solo en memoria */ }
  }

  function emit(event, session) {
    S.listeners.forEach(function (fn) {
      try { fn(event, session); } catch (e) { console.error(e); }
    });
  }

  function authFetch(grantType, body) {
    return fetch(URL_BASE + "/auth/v1/token?grant_type=" + grantType, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var msg = data.error_description || data.msg || data.error ||
            data.message || ("Error de autenticación (" + res.status + ")");
          var err = new Error(msg); err.status = res.status; throw err;
        }
        return data;
      });
    });
  }

  function normalizeSession(data, prev) {
    var now = Math.floor(Date.now() / 1000);
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || (prev && prev.refresh_token) || null,
      expires_at: data.expires_at || (now + (data.expires_in || 3600)),
      token_type: data.token_type || "bearer",
      expires_in: data.expires_in || 3600,
      user: data.user || (prev && prev.user) || null
    };
  }

  /* --- Sesión (interfaz común) ------------------------------------------- */
  function getSession() {
    return init().then(function () {
      if (S.mode === "sdk") {
        return S.client.auth.getSession().then(function (r) {
          S.session = (r.data && r.data.session) || null;
          return S.session;
        });
      }
      var stored = storeRead();
      if (!stored || !stored.refresh_token) { S.session = null; return null; }
      var now = Math.floor(Date.now() / 1000);
      if (stored.expires_at && stored.expires_at - 60 > now) {
        S.session = stored;
        return stored;
      }
      return authFetch("refresh_token", { refresh_token: stored.refresh_token })
        .then(function (data) {
          var s = normalizeSession(data, stored);
          storeWrite(s); S.session = s;
          emit("TOKEN_REFRESHED", s);
          return s;
        })
        .catch(function () { storeWrite(null); S.session = null; return null; });
    });
  }

  function signIn(email, password) {
    return init().then(function () {
      if (S.mode === "sdk") {
        return S.client.auth.signInWithPassword({ email: email, password: password })
          .then(function (r) {
            if (r.error) throw new Error(r.error.message);
            S.session = r.data.session;
            return r.data.session;
          });
      }
      return authFetch("password", { email: email, password: password })
        .then(function (data) {
          var s = normalizeSession(data, null);
          storeWrite(s); S.session = s;
          emit("SIGNED_IN", s);
          return s;
        });
    });
  }

  function signOut() {
    return init().then(function () {
      if (S.mode === "sdk") {
        return S.client.auth.signOut().then(function () { S.session = null; });
      }
      var tok = S.session && S.session.access_token;
      var done = function () { storeWrite(null); S.session = null; emit("SIGNED_OUT", null); };
      if (!tok) { done(); return Promise.resolve(); }
      return fetch(URL_BASE + "/auth/v1/logout", {
        method: "POST",
        headers: { apikey: KEY, Authorization: "Bearer " + tok }
      }).catch(function () { /* la sesión local se limpia igual */ }).then(done);
    });
  }

  function onAuthChange(fn) {
    S.listeners.push(fn);
    return function () {
      S.listeners = S.listeners.filter(function (f) { return f !== fn; });
    };
  }

  /* --- Consultas --------------------------------------------------------- */
  function token() {
    return (S.session && S.session.access_token) || KEY;
  }

  function restRequest(method, path, opts) {
    opts = opts || {};
    var qs = opts.query ? "?" + opts.query : "";
    var headers = Object.assign({
      apikey: KEY,
      Authorization: "Bearer " + token(),
      "Content-Type": "application/json"
    }, opts.headers || {});
    return fetch(URL_BASE + "/rest/v1/" + path + qs, {
      method: method,
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (txt) {
          var detail = txt;
          try { var j = JSON.parse(txt); detail = j.message || j.hint || j.details || txt; } catch (e) {}
          var err = new Error(detail || ("Error " + res.status + " en " + path));
          err.status = res.status;
          throw err;
        });
      }
      if (res.status === 204) return null;
      return res.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }

  /* select("empresas", { columns:"id,slug", eq:{activo:true}, order:"orden" }) */
  function select(table, opts) {
    opts = opts || {};
    return init().then(function () {
      if (S.mode === "sdk") {
        var q = S.client.from(table).select(opts.columns || "*");
        Object.keys(opts.eq || {}).forEach(function (k) { q = q.eq(k, opts.eq[k]); });
        if (opts.inList) q = q.in(opts.inList.column, opts.inList.values);
        if (opts.order) q = q.order(opts.order, { ascending: opts.ascending !== false });
        if (opts.limit) q = q.limit(opts.limit);
        return q.then(function (r) {
          if (r.error) throw new Error(r.error.message);
          return r.data || [];
        });
      }
      var parts = ["select=" + encodeURIComponent(opts.columns || "*")];
      Object.keys(opts.eq || {}).forEach(function (k) {
        parts.push(encodeURIComponent(k) + "=eq." + encodeURIComponent(opts.eq[k]));
      });
      if (opts.inList) {
        parts.push(encodeURIComponent(opts.inList.column) + "=in.(" +
          opts.inList.values.map(function (v) { return encodeURIComponent(v); }).join(",") + ")");
      }
      if (opts.order) parts.push("order=" + encodeURIComponent(opts.order) + "." + (opts.ascending === false ? "desc" : "asc"));
      if (opts.limit) parts.push("limit=" + opts.limit);
      return restRequest("GET", table, { query: parts.join("&") }).then(function (r) { return r || []; });
    });
  }

  /* insert(tabla, filas) → true.
     insert(tabla, filas, {devolver:true}) → las filas insertadas, para cuando
     hace falta el id que generó Postgres (por ejemplo un recurso del Hub). */
  function insert(table, rows, opts) {
    var devolver = !!(opts && opts.devolver);
    return init().then(function () {
      if (S.mode === "sdk") {
        var q = S.client.from(table).insert(rows);
        if (devolver) q = q.select();
        return q.then(function (r) {
          if (r.error) throw new Error(r.error.message);
          return devolver ? (r.data || []) : true;
        });
      }
      return restRequest("POST", table, {
        body: rows,
        headers: { Prefer: devolver ? "return=representation" : "return=minimal" }
      }).then(function (r) { return devolver ? (r || []) : true; });
    });
  }

  /* update("usuario_modulo", {activo:false}, {user_id:"…", modulo_id:"…"}) */
  function update(table, patch, match) {
    return init().then(function () {
      if (S.mode === "sdk") {
        var q = S.client.from(table).update(patch);
        Object.keys(match || {}).forEach(function (k) { q = q.eq(k, match[k]); });
        return q.then(function (r) {
          if (r.error) throw new Error(r.error.message);
          return true;
        });
      }
      var parts = Object.keys(match || {}).map(function (k) {
        return encodeURIComponent(k) + "=eq." + encodeURIComponent(match[k]);
      });
      return restRequest("PATCH", table, {
        body: patch,
        query: parts.join("&"),
        headers: { Prefer: "return=minimal" }
      }).then(function () { return true; });
    });
  }

  /* remove("hub_recursos", {id:"…"}) — borrado por igualdad. Se agregó para el
     Hub de Activaciones, que sí tiene DELETE permitido en sus recursos. Las
     tablas que no lo permiten seguirán devolviendo permission denied por RLS. */
  function remove(table, match) {
    return init().then(function () {
      if (S.mode === "sdk") {
        var q = S.client.from(table).delete();
        Object.keys(match || {}).forEach(function (k) { q = q.eq(k, match[k]); });
        return q.then(function (r) {
          if (r.error) throw new Error(r.error.message);
          return true;
        });
      }
      var parts = Object.keys(match || {}).map(function (k) {
        return encodeURIComponent(k) + "=eq." + encodeURIComponent(match[k]);
      });
      return restRequest("DELETE", table, {
        query: parts.join("&"),
        headers: { Prefer: "return=minimal" }
      }).then(function () { return true; });
    });
  }

  /* upsert("hub_configuracion", [fila], "clave") */
  function upsert(table, rows, onConflict) {
    return init().then(function () {
      if (S.mode === "sdk") {
        return S.client.from(table)
          .upsert(rows, onConflict ? { onConflict: onConflict } : undefined)
          .then(function (r) {
            if (r.error) throw new Error(r.error.message);
            return true;
          });
      }
      return restRequest("POST", table, {
        body: rows,
        query: onConflict ? "on_conflict=" + encodeURIComponent(onConflict) : undefined,
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
      }).then(function () { return true; });
    });
  }

  function rpc(fn, args) {
    return init().then(function () {
      if (S.mode === "sdk") {
        return S.client.rpc(fn, args || {}).then(function (r) {
          if (r.error) throw new Error(r.error.message);
          return r.data;
        });
      }
      return restRequest("POST", "rpc/" + fn, { body: args || {} });
    });
  }

  return {
    init: init,
    mode: function () { return S.mode; },
    client: function () { return S.client; },
    session: function () { return S.session; },
    getSession: getSession,
    signIn: signIn,
    signOut: signOut,
    onAuthChange: onAuthChange,
    select: select,
    insert: insert,
    update: update,
    upsert: upsert,
    remove: remove,
    rpc: rpc
  };
})();
