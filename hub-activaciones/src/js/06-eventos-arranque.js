"use strict";

/* ============================================================
   PARTE 6 — Eventos y arranque
   ============================================================ */

function tipoDeUrl(u){
  const s = String(u).toLowerCase();
  if(s.indexOf("docs.google.com/spreadsheets") >= 0) return "application/vnd.google-apps.spreadsheet";
  if(s.indexOf("docs.google.com/presentation") >= 0) return "application/vnd.google-apps.presentation";
  if(s.indexOf("docs.google.com/forms") >= 0) return "application/vnd.google-apps.form";
  if(s.indexOf("docs.google.com/document") >= 0) return "application/vnd.google-apps.document";
  if(s.indexOf(".pdf") >= 0) return "application/pdf";
  return "liga";
}
function itemPorId(id){
  const keys = Object.keys(S.recursos);
  for(let i=0;i<keys.length;i++){
    const found = (S.recursos[keys[i]]||[]).find(x=>x.id===id);
    if(found) return { item:found, pk:keys[i] };
  }
  return null;
}
function irA(vista){ S.vista = vista; S.msg = null; render(); window.scrollTo({top:0,behavior:"smooth"}); }

/* ---- Clicks ---- */
document.addEventListener("click", ev => {
  if(ev.target.closest("#temaBtn")){ toggleTema(); return; }

  const vc = ev.target.closest("[data-vercomo]");
  if(vc){ S.verComo = vc.dataset.vercomo === S.rol ? null : vc.dataset.vercomo; S.abierta = null; render(); return; }

  const nav = ev.target.closest("[data-vista]");
  if(nav){
    const v = nav.dataset.vista;
    if(v === "producto"){ S.vista = "producto"; S.tabProd = "recursos"; }
    else S.vista = v;
    S.msg = null; render(); window.scrollTo({top:0,behavior:"smooth"}); return;
  }

  const pnav = ev.target.closest("[data-prod]");
  if(pnav){ S.producto = pnav.dataset.prod; S.vista = "producto"; S.msg = null; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }

  const tp = ev.target.closest("[data-tabprod]");
  if(tp){ S.tabProd = tp.dataset.tabprod; render(); return; }

  const ta = ev.target.closest("[data-tabaj]");
  if(ta){ S.tabAjustes = ta.dataset.tabaj; render(); return; }

  const fil = ev.target.closest("[data-filtro]");
  if(fil){ S.filtro = fil.dataset.filtro; render(); return; }

  /* Cierre del modal solo al pulsar el fondo o el botón */
  const cerrarPrev = ev.target.closest('[data-act="cerrar-preview"]');
  if(cerrarPrev && !ev.target.closest("[data-stop]")){ S.preview = null; render(); return; }
  if(cerrarPrev){ S.preview = null; render(); return; }

  /* Elegir cuenta de Vitally */
  const pick = ev.target.closest('[data-act="vt-pick"]');
  if(pick){
    const info = S.vt.res[Number(pick.dataset.i)];
    if(info){
      S.borrador.cuenta = info._nombre;
      S.borrador.vitallyId = info._id;
      S.borrador.cuentaInfo = info;
      S.vt = { q:info._nombre, estado:"idle", res:[], err:null, cache:null };
      S.msg = { tono:"green", texto:"Cuenta «"+info._nombre+"» adjuntada con su información de Vitally." };
      render();
    }
    return;
  }

  /* Adjuntar archivo de Drive */
  const gp = ev.target.closest('[data-act="gd-pick"]');
  if(gp){
    const f = S.gd.res.find(x=>x.id === gp.dataset.fid);
    if(f){
      const pk = gp.dataset.id, catKey = gp.dataset.sec;
      const items = (S.recursos[pk]||[]).slice();
      items.push({ id:uid(), cat:catKey, titulo:f.title, url:f.viewUrl,
        driveId:f.id, mime:f.mimeType, tamano:pesoArchivo(f.fileSize), modificado:f.modifiedTime });
      S.gd = { q:"", estado:"idle", res:[], err:null, cat:null };
      guardarRecursos(pk, items);
      S.msg = { tono:"green", texto:"«"+f.title+"» adjuntado desde Drive." };
      render();
    }
    return;
  }

  const btn = ev.target.closest("[data-act]");
  if(!btn) return;
  const act = btn.dataset.act, id = btn.dataset.id, pk = btn.dataset.pk;

  if(act === "cerrar-msg"){ S.msg = null; render(); return; }
  if(act === "vt-retry"){ buscarCuenta(S.vt.q); return; }
  if(act === "abrir"){ S.abierta = (S.abierta === id ? null : id); render(); return; }
  if(act === "cancelar"){ cancelarSolicitud(id); return; }
  if(act === "recargar-hub"){ recargarHub(); return; }
  if(act === "salir"){
    if(window.LapzoAuth) LapzoAuth.signOut().then(()=>{
      location.href = window.LapzoPaths ? LapzoPaths.resolve("index.html#/login") : "../index.html#/login";
    });
    return;
  }
  if(act === "refrescar-cuenta"){ refrescarCuenta(id); return; }
  if(act === "ir-componentes"){ S.vista = "ajustes"; S.tabAjustes = "componentes"; render(); window.scrollTo({top:0,behavior:"smooth"}); return; }

  /* Semáforo */
  if(act === "sema"){
    const s = S.solicitudes.find(x=>x.id===id); if(!s) return;
    const diag = { contexto:{}, porModulo:{}, flags:{}, ...(s.diagnostico||{}) };
    diag.porModulo = { ...diag.porModulo };
    const actualEs = (diag.porModulo[pk]||{}).semaforo === btn.dataset.v;
    diag.porModulo[pk] = { ...(diag.porModulo[pk]||{}), semaforo: actualEs ? "" : btn.dataset.v };
    guardarSolicitud(id, { diagnostico:diag }); return;
  }

  /* Estado de un componente */
  if(act === "comp"){
    const s = S.solicitudes.find(x=>x.id===id); if(!s) return;
    const comp = { ...(s.componentes||{}) };
    comp[pk] = { ...(comp[pk]||{}) };
    const v = btn.dataset.v;
    if(!v) delete comp[pk][btn.dataset.c]; else comp[pk][btn.dataset.c] = v;
    guardarSolicitud(id, { componentes:comp }); return;
  }
  if(act === "ruta" || act === "usar-ruta"){
    guardarSolicitud(id, { ruta: btn.dataset.r }); return;
  }
  if(act === "comp-fase"){
    const so = S.solicitudes.find(x=>x.id===id); if(!so) return;
    const fa = btn.dataset.fase;
    const lista = comps(pk).filter(cc => (cc.fase||"Sin fase") === fa);
    const comp = { ...(so.componentes||{}) };
    const mapa = { ...(comp[pk]||{}) };
    const noOpc = lista.filter(cc=>!cc.opcional);
    const todos = noOpc.length && noOpc.every(cc => mapa[cc.id] && COMP_ESTADOS[mapa[cc.id]].cuenta);
    lista.forEach(cc => {
      if(todos) delete mapa[cc.id];
      else if(!mapa[cc.id] && !cc.opcional) mapa[cc.id] = "pendiente";
    });
    comp[pk] = mapa;
    guardarSolicitud(id, { componentes:comp }); return;
  }
  if(act === "comp-todos"){
    const s = S.solicitudes.find(x=>x.id===id); if(!s) return;
    const lista = comps(pk);
    const comp = { ...(s.componentes||{}) };
    const mapa = { ...(comp[pk]||{}) };
    const noOpc = lista.filter(cc=>!cc.opcional);
    const todosMarcados = noOpc.length && noOpc.every(cc => mapa[cc.id] && COMP_ESTADOS[mapa[cc.id]].cuenta);
    lista.forEach(cc => {
      if(todosMarcados) delete mapa[cc.id];
      else if(!mapa[cc.id] && !cc.opcional) mapa[cc.id] = "pendiente";
    });
    comp[pk] = mapa;
    guardarSolicitud(id, { componentes:comp }); return;
  }

  /* Recursos y secciones */
  if(act === "res-del"){
    const f = itemPorId(id);
    if(f) guardarRecursos(f.pk, (S.recursos[f.pk]||[]).filter(x=>x.id!==id));
    return;
  }
  if(act === "ver-doc"){
    const f = itemPorId(id);
    if(f) verDocumento(f.item);
    return;
  }
  if(act === "dl-doc"){
    if(S.preview && S.preview.texto){
      const nom = String(S.preview.titulo||"documento").replace(/[^\wÀ-ÿ .-]/g,"_").slice(0,80);
      descargar(nom+".txt", S.preview.texto);
    }
    return;
  }
  if(act === "nueva-seccion"){
    const lista = cats(id).slice();
    lista.push({ id:uid(), titulo:"Nueva sección", desc:"", color:prod(id).color });
    guardarCategorias(id, lista); return;
  }
  if(act === "sec-borra"){
    const lista = cats(id).filter(x=>x.id!==btn.dataset.sec);
    guardarCategorias(id, lista);
    const items = (S.recursos[id]||[]).filter(x=>x.cat!==btn.dataset.sec);
    guardarRecursos(id, items); return;
  }
  if(act === "sec-sube" || act === "sec-baja"){
    const lista = cats(id).slice();
    const i = lista.findIndex(x=>x.id===btn.dataset.sec);
    const j = act === "sec-sube" ? i-1 : i+1;
    if(i < 0 || j < 0 || j >= lista.length) return;
    const t = lista[i]; lista[i] = lista[j]; lista[j] = t;
    guardarCategorias(id, lista); return;
  }
  if(act === "liga-manual"){
    const url = prompt("Pega la liga del recurso:");
    if(!url) return;
    const titulo = prompt("Título del recurso:") || url;
    const items = (S.recursos[id]||[]).slice();
    items.push({ id:uid(), cat:btn.dataset.sec, titulo, url, driveId:null, mime:tipoDeUrl(url) });
    guardarRecursos(id, items); return;
  }

  /* Componentes del catálogo */
  if(act === "comp-del"){
    const productos = { ...(cat().productos||{}) };
    productos[pk] = (productos[pk]||[]).filter(x=>x.id!==btn.dataset.c);
    guardarCatalogo(productos); return;
  }

  /* Niveles del Hub (hub_usuario_rol). Quitar el acceso no borra el renglón:
     lo deja inactivo, así queda el registro de quién lo tuvo. */
  if(act === "quitar-nivel-hub"){ guardarNivelHub(id, { activo:false }); return; }
  if(act === "reactivar-nivel-hub"){ guardarNivelHub(id, { activo:true }); return; }
  if(act === "del-persona"){ guardarConfig({ roster: cfg().roster.filter(p=>p.id!==id) }); return; }

  if(act === "meter-sprint"){ guardarSolicitud(id, { estado:"en_sprint", sprint:cfg().sprint.codigo }); S.simular = null; return; }
  if(act === "cerrar-sprint"){ cerrarSprint(); return; }
  if(act === "csv-producto"){ csvProducto(id); return; }
  if(act === "csv-carga"){ csvCarga(); return; }
  if(act === "csv-roadmap"){ csvRoadmap(); return; }
});

document.addEventListener("keydown", ev => {
  if(ev.key === "Escape" && S.preview){ S.preview = null; render(); return; }
  const p = ev.target.closest && ev.target.closest('[data-act="vt-pick"]');
  if(p && (ev.key === "Enter" || ev.key === " ")){ ev.preventDefault(); p.click(); }
});

/* ---- Cambios en selects, checkboxes y números ---- */
document.addEventListener("change", ev => {
  const el = ev.target.closest("[data-act]");
  if(!el) return;
  const act = el.dataset.act, id = el.dataset.id, pk = el.dataset.pk;

  if(act === "ctx"){
    const s = S.solicitudes.find(x=>x.id===id); if(!s) return;
    const diag = { contexto:{}, porModulo:{}, flags:{}, ...(s.diagnostico||{}) };
    diag.contexto = { ...diag.contexto };
    if(el.value === "") delete diag.contexto[el.dataset.f]; else diag.contexto[el.dataset.f] = Number(el.value);
    guardarSolicitud(id, { diagnostico:diag }); return;
  }
  if(act === "flag"){
    const s = S.solicitudes.find(x=>x.id===id); if(!s) return;
    const diag = { contexto:{}, porModulo:{}, flags:{}, ...(s.diagnostico||{}) };
    diag.flags = { ...diag.flags };
    if(el.checked) diag.flags[el.dataset.f] = true; else delete diag.flags[el.dataset.f];
    guardarSolicitud(id, { diagnostico:diag }); return;
  }
  if(act === "crit"){
    const so = S.solicitudes.find(x=>x.id===id); if(!so) return;
    const cr = { ...(so.criterios||{}) };
    if(el.checked) cr[el.dataset.c] = true; else delete cr[el.dataset.c];
    guardarSolicitud(id, { criterios:cr }); return;
  }
  if(act === "estado"){ guardarSolicitud(id, { estado: el.value }); return; }
  if(act === "sprint"){ guardarSolicitud(id, { sprint: el.value || null }); return; }
  if(act === "asignar"){ guardarSolicitud(id, { asignado: el.value || null }); return; }
  if(act === "fentrega"){ guardarSolicitud(id, { fechaEntrega: el.value || null }); return; }
  if(act === "simular"){ S.simular = el.value || null; render(); return; }
  if(act === "set-slots"){
    guardarConfig({ roster: cfg().roster.map(p => p.id===id ? { ...p, slots:Number(el.value)||cfg().slotsDefault } : p) });
    return;
  }
  if(act === "set-nivel"){ guardarNivelHub(id, { nivel:el.value, activo:true }); return; }
  if(act === "peso"){ guardarPesos({ [el.dataset.f]: Number(el.value) }); return; }
  if(act === "nivel-max" || act === "nivel-slots"){
    const i = Number(el.dataset.i), lista = niveles().map(n=>({ ...n }));
    if(!lista[i]) return;
    if(act === "nivel-max") lista[i].max = Number(el.value) || lista[i].max;
    else lista[i].slots = Number(el.value) || lista[i].slots;
    guardarNiveles(lista); return;
  }
  if(act === "comp-nombre" || act === "comp-peso"){
    const productos = { ...(cat().productos||{}) };
    productos[pk] = (productos[pk]||[]).map(c => c.id===el.dataset.c
      ? { ...c, [act === "comp-nombre" ? "nombre" : "peso"]: act === "comp-nombre" ? el.value : (Number(el.value)||1) }
      : c);
    guardarCatalogo(productos); return;
  }
  if(act === "sec-titulo" || act === "sec-desc"){
    const lista = cats(id).map(c => c.id===el.dataset.sec
      ? { ...c, [act === "sec-titulo" ? "titulo" : "desc"]: el.value } : c);
    guardarCategorias(id, lista); return;
  }
});

/* ---- Búsquedas con retardo ---- */
let vtTimer = null, gdTimer = null;
document.addEventListener("input", ev => {
  const el = ev.target;
  if(!el.dataset) return;
  if(el.dataset.act === "vt-input"){
    S.borrador.cuenta = el.value;
    S.borrador.vitallyId = null;
    S.borrador.cuentaInfo = null;
    clearTimeout(vtTimer);
    const q = el.value;
    vtTimer = setTimeout(()=>buscarCuenta(q), 500);
  }
  if(el.dataset.act === "gd-input"){
    clearTimeout(gdTimer);
    const q = el.value, sec = el.dataset.sec;
    gdTimer = setTimeout(()=>buscarDrive(q, sec), 500);
  }
});

/* ---- Formularios ---- */
document.addEventListener("submit", ev => {
  const form = ev.target.closest("[data-act]");
  if(!form) return;
  ev.preventDefault();
  const act = form.dataset.act, fd = new FormData(form);

  if(act === "crear"){
    const productos = fd.getAll("productos");
    if(!productos.length){ S.msg = { tono:"amber", texto:"Elige al menos un producto a activar: sin producto no se puede diagnosticar ni costear." }; render(); return; }
    const info = S.borrador.cuentaInfo || null;
    crearSolicitud({
      cuenta:String(fd.get("cuenta")||"").trim(),
      ae:String(fd.get("ae")||"").trim(),
      tipo:fd.get("tipo"),
      fechaCliente:fd.get("fechaCliente") || null,
      productos,
      contexto:String(fd.get("contexto")||"").trim(),
      vitallyId:S.borrador.vitallyId || null,
      cuentaInfo:info
    });
    S.borrador = {}; S.vt = { q:"", estado:"idle", res:[], err:null, cache:null };
    return;
  }
  if(act === "comp-add"){
    const pk = form.dataset.pk;
    const productos = { ...(cat().productos||{}) };
    productos[pk] = (productos[pk]||[]).concat([{
      id:uid(), nombre:String(fd.get("nombre")||"").trim(), peso:Number(fd.get("peso"))||1
    }]);
    guardarCatalogo(productos);
    return;
  }
  if(act === "add-persona"){
    const c = cfg();
    guardarConfig({ roster: c.roster.concat([{
      id:uid(), nombre:String(fd.get("nombre")||"").trim(),
      rol:String(fd.get("rol")||"").trim() || "Activation Specialist",
      slots:Number(fd.get("slots")) || c.slotsDefault
    }]) });
    return;
  }
  if(act === "add-nivel-hub"){
    const userId = String(fd.get("user_id")||"");
    if(!userId) return;
    guardarNivelHub(userId, { nivel:fd.get("nivel") || "ae", activo:true });
    return;
  }
});

/* ============================================================
   Cerrar sprint
   ------------------------------------------------------------
   Toca varias solicitudes y luego la configuración. No hay una RPC
   transaccional para esto, así que se hace en secuencia controlada: si algo
   falla se dice cuántas quedaron, no se muestra éxito a medias, y al terminar
   se relee todo desde Supabase para que la pantalla refleje la base.
   ============================================================ */
async function cerrarSprint(){
  const c = cfg(), sig = sprintSiguiente(c.sprint);
  const arrastrar = S.solicitudes.filter(s => s.sprint === c.sprint.codigo && est(s).enSprint);
  if(!confirm("¿Cerrar "+c.sprint.codigo+" y abrir "+sig.codigo+" ("+rangoSprint(sig)+")?\n\n"+
     arrastrar.length+" cuenta"+(arrastrar.length===1?"":"s")+" abierta"+(arrastrar.length===1?"":"s")+
     " se arrastrarán con su costo.")) return;

  S.msg = { tono:"violet", texto:"Cerrando sprint…" }; render();
  const fallos = [];
  for(const s of arrastrar){
    try{
      await HUB.updateRequest(s.id, { sprint: sig.codigo });
      HUB.addAuditEvent(s.id, "sprint_actualizado", null, null, { de:c.sprint.codigo, a:sig.codigo });
    }catch(e){ console.error("[HUB] no se pudo arrastrar", s.id, e); fallos.push(s.id); }
  }
  let configOk = true;
  try{ await HUB.saveConfig({ ...(S.config||{}), sprint: sig }); }
  catch(e){ configOk = false; console.error("[HUB] no se pudo abrir el sprint nuevo:", e); }

  await recargarHub({ silencioso:true });

  if(!configOk){
    S.msg = { tono:"red", texto:"Se arrastraron las cuentas pero no se pudo abrir "+sig.codigo+
      ". El sprint en curso sigue siendo "+c.sprint.codigo+"." };
  }else if(fallos.length){
    S.msg = { tono:"amber", texto:"Sprint "+sig.codigo+" abierto, pero "+fallos.length+" de "+
      arrastrar.length+" cuenta"+(arrastrar.length===1?"":"s")+" no se pudieron arrastrar. Revísalas en el roadmap." };
  }else{
    S.msg = { tono:"green", texto:"Sprint "+sig.codigo+" abierto ("+rangoSprint(sig)+
      "). Las cuentas abiertas se arrastraron con su costo." };
  }
  render();
}

/* ============================================================
   Arranque
   ============================================================ */
initTema();
pintarTema();

/* Relee los datos sin volver a validar la sesión. Se usa al reintentar, al
   volver a la pestaña y después de operaciones con varias escrituras. */
async function recargarHub(opts){
  const silencioso = opts && opts.silencioso;
  if(!silencioso){ S.dbError = null; S.msg = { tono:"violet", texto:"Actualizando…" }; render(); }
  try{
    const d = await HUB.reloadData();
    aplicarDatos(d);
    if(puedeConfigurar()){ try{ S.roles = await HUB.loadHubRoles(); }catch(e){} }
    if(!silencioso) S.msg = null;
    render();
  }catch(e){
    S.dbError = "No pudimos cargar el Hub de Activaciones.";
    if(!silencioso) S.msg = null;
    console.error("[HUB] recarga fallida:", e);
    render();
  }
}

/* Traduce lo que devuelve Supabase a las estructuras que ya consumen los
   motores. Los defaults del JavaScript (PESOS_DEF, NIVELES_DEF) siguen siendo
   el punto de partida visual; cuando la base tiene su equivalente, manda la
   base. Un catálogo vacío es válido: el HCS lo llena desde el Hub. */
function aplicarDatos(d){
  S.config = d.config || null;
  S.catalogo = { productos: (d.catalogos && d.catalogos.productos) || {} };
  S.pesos = (d.catalogos && d.catalogos.pesos) || null;
  S.niveles = (d.catalogos && d.catalogos.niveles) || null;
  S.categorias = (d.catalogos && d.catalogos.categorias) || {};
  S.solicitudes = d.solicitudes || [];
  S.recursos = d.recursos || {};
}

(async function boot(){
  try{
    const d = await HUB.loadHub();          // sesión + módulo + nivel + datos
    S.usuario = d.user;
    S.rol = d.nivel;
    S.rolDetectado = d.nivel;
    S.capsResolved = true;
    aplicarDatos(d);
    if(S.rol === "ae") S.vista = "solicitudes";
    else if(!vistaPermitida(S.vista)) S.vista = "solicitudes";

    if(puedeConfigurar()){
      try{ S.roles = await HUB.loadHubRoles(); }
      catch(e){ console.error("[HUB] no se pudieron leer los niveles del Hub:", e); }
    }

    render();                               // un solo render con todo listo
    LapzoGuard.closeGate();                 // recién ahora se muestra el Hub

    /* Al volver a la pestaña se releen los datos: es lo que hace que el
       trabajo de otra persona aparezca sin tener que recargar a mano. */
    document.addEventListener("visibilitychange", () => {
      if(document.visibilityState === "visible" && !document.hidden) recargarHub({ silencioso:true });
    });
  }catch(e){
    /* El guard ya dejó en pantalla el motivo (sin sesión, sin permiso de
       módulo o usuario inactivo) y no se renderiza nada protegido. */
    if(e && /sin sesión|permiso|inactivo|offline/i.test(String(e.message||e))) return;
    console.error("[HUB] arranque fallido:", e);
    S.capsResolved = true;
    S.dbError = "No pudimos cargar el Hub de Activaciones.";
    LapzoGuard.closeGate();
    render();
  }
})();
