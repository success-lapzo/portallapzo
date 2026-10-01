"use strict";

/* ============================================================
   PARTE 2 — Estado, roles, persistencia e integraciones
   ============================================================ */

const ROLES = {
  ae:  { label:"Account Executive", corto:"AE",  desc:"Levanta solicitudes y consulta el roadmap de sus clientes.",
         vistas:["solicitudes","roadmap"] },
  as:  { label:"Activation Specialist", corto:"AS", desc:"Ve todo y opera: diagnostica, asigna, avanza componentes y cura recursos. No configura.",
         vistas:["solicitudes","carga","roadmap","procesos","producto","ajustes"] },
  hcs: { label:"Head of Customer Success", corto:"HCS", desc:"Todo lo del AS más la configuración: componentes, pesos, equipo y accesos.",
         vistas:["solicitudes","carga","roadmap","procesos","producto","ajustes"] }
};

const S = {
  /* `mcp` queda como gancho para un puente seguro a Vitally o Drive si algún
     día Portal Lapzo lo ofrece; hoy es null y la app cae a captura manual,
     que es el comportamiento que ya tenía. Las descargas son nativas del
     navegador, así que no hay capacidad que resolver. */
  mcp:null, capsResolved:false,
  usuario:null,                 // usuario del portal, para la cabecera
  rol:"ae", rolDetectado:"ae", verComo:null,
  config:null, catalogo:null, pesos:null, niveles:null, categorias:null,
  roles:null, solicitudes:[], recursos:{},
  vista:"solicitudes", producto:"plat", tabProd:"operacion", tabAjustes:"equipo",
  filtro:"abiertas", abierta:null, borrador:{}, simular:null,
  vt:{ q:"", estado:"idle", res:[], err:null, cache:null },
  gd:{ q:"", estado:"idle", res:[], err:null, cat:null },
  preview:null,
  refrescando:null,
  msg:null, dbError:null
};

function read(k,d){ try{ return localStorage.getItem(k) || d; }catch(e){ return d; } }
function write(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

const esc = s => String(s==null?"":s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Math.random().toString(36).slice(2,9);
const nf = n => (n==null ? "—" : (Number.isInteger(n) ? String(n) : Number(n).toFixed(1)));
const money = n => (n==null||n==="") ? null : "$"+Number(n).toLocaleString("es-MX",{maximumFractionDigits:0});

/* ---- Fechas y sprints ---- */
function lunes(d){ const x = new Date(d); const dw = (x.getDay()+6)%7; x.setDate(x.getDate()-dw); x.setHours(0,0,0,0); return x; }
function iso(d){ return new Date(d).toISOString().slice(0,10); }
function semanaISO(d){
  const x = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dn = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate()+4-dn);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(),0,1));
  return { year:x.getUTCFullYear(), week:Math.ceil(((x-y0)/86400000+1)/7) };
}
function codigoSprint(d){ const w = semanaISO(d); return "S-"+w.year+"-"+String(w.week).padStart(2,"0"); }
function sprintDe(d){ const i = lunes(d); const f = new Date(i); f.setDate(f.getDate()+13); return { codigo:codigoSprint(i), inicio:iso(i), fin:iso(f) }; }
function sprintSiguiente(sp){ const i = new Date(sp.inicio+"T00:00:00"); i.setDate(i.getDate()+14); return sprintDe(i); }
function fechaCorta(s){
  if(!s) return "—";
  const d = new Date(String(s).slice(0,10)+"T00:00:00");
  if(isNaN(d)) return String(s);
  return d.toLocaleDateString("es-MX",{ day:"numeric", month:"short" });
}
function diasHasta(s){
  if(!s) return null;
  const d = new Date(String(s).slice(0,10)+"T00:00:00");
  if(isNaN(d)) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((d - hoy)/86400000);
}
const rangoSprint = sp => sp ? fechaCorta(sp.inicio)+" – "+fechaCorta(sp.fin) : "sin definir";

/* ---- Accesores ---- */
function cfg(){
  const c = S.config || {};
  return {
    roster: Array.isArray(c.roster) ? c.roster : [],
    sprint: c.sprint || sprintDe(new Date()),
    slotsDefault: Number(c.slotsDefault) || 4
  };
}
function cat(){ return S.catalogo || { productos:{} }; }
function pesos(){ return { ...PESOS_DEF, ...(S.pesos || {}) }; }
function niveles(){ return (S.niveles && S.niveles.length) ? S.niveles : NIVELES_DEF; }
function cats(pk){
  const map = S.categorias || {};
  const l = map[pk];
  return (Array.isArray(l) && l.length) ? l : (Array.isArray(map._default) ? map._default : []);
}
function comps(pk){ return (cat().productos || {})[pk] || []; }
const rolAct = () => S.verComo || S.rol;
const puedeOperar = () => rolAct() === "as" || rolAct() === "hcs";
const puedeConfigurar = () => rolAct() === "hcs";
const vistaPermitida = v => (ROLES[rolAct()] || ROLES.ae).vistas.includes(v);

function ev(s){ return evaluar(s, cat(), pesos(), niveles()); }
function slots(s){ return slotsDe(s, cat(), pesos(), niveles()); }

/* ---- Capacidad ---- */
function capacidad(){
  const c = cfg();
  const enSprint = S.solicitudes.filter(s => s.sprint === c.sprint.codigo && est(s).enSprint);
  const porPersona = c.roster.map(p => {
    const mias = enSprint.filter(s => s.asignado === p.id);
    return { ...p, slots:Number(p.slots)||c.slotsDefault, usados:mias.reduce((a,s)=>a+slots(s),0), cuentas:mias.length };
  });
  const sinAsignar = enSprint.filter(s => !s.asignado || !c.roster.some(p=>p.id===s.asignado));
  const total = porPersona.reduce((a,p)=>a+p.slots,0);
  const usado = porPersona.reduce((a,p)=>a+p.usados,0) + sinAsignar.reduce((a,s)=>a+slots(s),0);
  return { total, usado, libre:Math.round((total-usado)*10)/10, porPersona, sinAsignar, enSprint, sprint:c.sprint };
}
function tonoCap(libre,total){
  if(!total) return "";
  if(libre < 0) return "crit";
  if(libre <= total*0.15) return "warn";
  return "ok";
}

/* ============================================================
   Persistencia — Supabase a través de HUB (archivo 00)
   ------------------------------------------------------------
   Regla de oro: primero guarda, después actualiza S, después
   renderiza. Si Supabase rechaza la operación, la pantalla no
   se queda diciendo que se guardó algo que no se guardó.

   Las funciones conservan su firma original para no tocar las
   vistas ni los manejadores de eventos.
   ============================================================ */

function avisoError(e, ctx){
  S.msg = { tono:"red", texto: HUB.humano(e, ctx) };
  render();
}
function avisoOk(texto){
  S.msg = { tono:"green", texto };
  render();
}

/* Marca de guardado en curso, para no disparar dos veces la misma escritura
   ni dejar la interfaz muda mientras Supabase responde. */
let GUARDANDO = 0;
function guardando(v){
  GUARDANDO = Math.max(0, GUARDANDO + (v ? 1 : -1));
  const el = document.getElementById("tbStatus");
  if(el && GUARDANDO) el.innerHTML = '<span class="d"></span>Guardando…';
  else if(el) renderTop();
}

async function guardarConfig(patch){
  const base = S.config || { roster:[], sprint:sprintDe(new Date()), slotsDefault:4 };
  const nueva = { ...base, ...patch };
  guardando(true);
  try{
    await HUB.saveConfig(nueva);
    S.config = nueva;
    render();
  }catch(e){ avisoError(e, "No se pudo guardar la configuración"); }
  finally{ guardando(false); }
}

/* Los manejadores existentes pasan el mapa completo de productos. Se compara
   con lo que ya había y se escribe solo la fila del producto que cambió. */
async function guardarCatalogo(productos){
  const antes = (cat().productos) || {};
  const cambiados = Object.keys(productos).filter(k =>
    JSON.stringify(productos[k]||[]) !== JSON.stringify(antes[k]||[]));
  if(!cambiados.length){ S.catalogo = { productos }; render(); return; }
  guardando(true);
  try{
    for(const pk of cambiados){
      await HUB.saveComponents(pk, productos[pk] || [], (prod(pk)||{}).nombre || pk);
    }
    S.catalogo = { productos };
    render();
  }catch(e){ avisoError(e, "No se pudo guardar el catálogo de componentes"); }
  finally{ guardando(false); }
}

async function guardarPesos(patch){
  const nuevos = { ...pesos(), ...patch };
  guardando(true);
  try{
    await HUB.saveWeights(nuevos, niveles());
    S.pesos = nuevos;
    render();
  }catch(e){ avisoError(e, "No se pudieron guardar los pesos"); }
  finally{ guardando(false); }
}

async function guardarNiveles(lista){
  guardando(true);
  try{
    await HUB.saveWeights(pesos(), lista);
    S.niveles = lista;
    render();
  }catch(e){ avisoError(e, "No se pudieron guardar los niveles"); }
  finally{ guardando(false); }
}

async function guardarCategorias(pk, lista){
  guardando(true);
  try{
    await HUB.saveCategories(pk, lista);
    S.categorias = { ...(S.categorias || {}), [pk]:lista };
    render();
  }catch(e){ avisoError(e, "No se pudieron guardar las secciones"); }
  finally{ guardando(false); }
}

/* Nivel operativo de una persona dentro del Hub (hub_usuario_rol). */
async function guardarNivelHub(userId, patch){
  guardando(true);
  try{
    await HUB.updateHubRole(userId, patch);
    S.roles = await HUB.loadHubRoles();
    render();
  }catch(e){ avisoError(e, "No se pudo actualizar el nivel en el Hub"); }
  finally{ guardando(false); }
}

async function guardarSolicitud(id, patch){
  const i = S.solicitudes.findIndex(s=>s.id===id);
  if(i < 0) return;
  const anterior = S.solicitudes[i];
  guardando(true);
  try{
    await HUB.updateRequest(id, patch);
    S.solicitudes[i] = { ...anterior, ...patch };
    render();
    auditarPatch(id, anterior, patch);
  }catch(e){ avisoError(e, "No pudimos guardar la solicitud"); }
  finally{ guardando(false); }
}

/* Qué merece quedar en la bitácora central. Un filtro o un hover no; un cambio
   de estado, de responsable, de sprint, de fecha, de ruta o de diagnóstico sí. */
function auditarPatch(id, anterior, patch){
  if("estado" in patch && patch.estado !== anterior.estado){
    const accion = patch.estado === "cancelada" ? "solicitud_cancelada"
      : patch.estado === "entregada" ? "solicitud_entregada" : "estado_actualizado";
    HUB.addAuditEvent(id, accion, anterior.estado, patch.estado, null);
  }
  if("asignado" in patch && patch.asignado !== anterior.asignado)
    HUB.addAuditEvent(id, "responsable_asignado", null, null, { asignado:patch.asignado });
  if("sprint" in patch && patch.sprint !== anterior.sprint)
    HUB.addAuditEvent(id, "sprint_actualizado", null, null, { de:anterior.sprint, a:patch.sprint });
  if("fechaEntrega" in patch && patch.fechaEntrega !== anterior.fechaEntrega)
    HUB.addAuditEvent(id, "fecha_entrega_actualizada", null, null, { fecha:patch.fechaEntrega });
  if("ruta" in patch && patch.ruta !== anterior.ruta)
    HUB.addAuditEvent(id, "ruta_actualizada", null, null, { ruta:patch.ruta });
  if("diagnostico" in patch || "componentes" in patch || "criterios" in patch)
    HUB.addAuditEvent(id, "diagnostico_actualizado", null, null, null);
}

/* Crear: escribe primero. El aviso de "registrada" aparece cuando Supabase ya
   devolvió la fila, con el folio y la fecha que asignó la base. */
async function crearSolicitud(data){
  guardando(true);
  try{
    const sol = await HUB.createRequest(data);
    if(!sol) throw new Error("sin fila de vuelta");
    S.solicitudes = [sol, ...S.solicitudes];
    avisoOk("Solicitud "+sol.id+" registrada. Activaciones la toma en el siguiente triage.");
  }catch(e){ avisoError(e, "No pudimos guardar la solicitud"); }
  finally{ guardando(false); }
}

/* La tabla no permite DELETE: cancelar es un cambio de estado. */
async function cancelarSolicitud(id){
  const s = S.solicitudes.find(x=>x.id===id);
  if(!s) return;
  if(!confirm("¿Cancelar la solicitud "+id+" de «"+(s.cuenta||"sin cuenta")+"»?\n\nDeja de contar para la capacidad y queda registrada como cancelada.")) return;
  guardando(true);
  try{
    await HUB.cancelRequest(id, s.estado);
    const i = S.solicitudes.findIndex(x=>x.id===id);
    if(i >= 0) S.solicitudes[i] = { ...s, estado:"cancelada" };
    if(S.abierta === id) S.abierta = null;
    avisoOk("Solicitud "+id+" cancelada.");
  }catch(e){ avisoError(e, "No pudimos cancelar la solicitud"); }
  finally{ guardando(false); }
}

/* Recursos: una fila por recurso. Los manejadores siguen pasando el array
   completo del producto, así que aquí se traduce a alta o baja individual. */
async function guardarRecursos(pk, items){
  const antes = S.recursos[pk] || [];
  const idsAntes = new Set(antes.map(x=>x.id));
  const idsAhora = new Set(items.map(x=>x.id));
  const nuevos = items.filter(x => !idsAntes.has(x.id));
  const quitados = antes.filter(x => !idsAhora.has(x.id));
  guardando(true);
  try{
    const creados = [];
    for(const it of nuevos){
      const r = await HUB.createResource(pk, it);
      if(r) creados.push(r);
    }
    for(const it of quitados) await HUB.deleteResource(it.id);
    const conservados = items.filter(x => idsAntes.has(x.id));
    S.recursos = { ...S.recursos, [pk]: conservados.concat(creados) };
    render();
  }catch(e){ avisoError(e, "No se pudo guardar el recurso"); }
  finally{ guardando(false); }
}

/* El nivel operativo (AE / AS / HCS) lo resuelve la base con
   hub_nivel_actual(); ver HUB.loadHub() en el archivo 00. Ya no se deduce
   probando escrituras contra rutas protegidas. */

/* ============================================================
   Vitally
   ============================================================ */
const VT_SERVER = "Vitaly MCP";
const GD_SERVER = "Google Drive";

function mensajeMcp(e, servidor){
  const code = (e && e.code) || "upstream_error";
  const s = servidor || "el conector";
  switch(code){
    case "needs_reauth":         return { texto:"La conexión con "+s+" expiró. Pide a un administrador que la reconecte.", reintentar:false };
    case "server_not_connected": return { texto:"El conector de "+s+" no está disponible en Portal Lapzo. Puedes continuar capturando la información manualmente.", reintentar:false };
    case "selection_required":   return { texto:"Tienes más de un conector llamado "+s+". Elige uno cuando el sistema te lo pida y vuelve a intentar.", reintentar:false };
    case "server_not_found":     return { texto:"El conector de "+s+" ya no existe en tu cuenta.", reintentar:false };
    case "server_unavailable":   return { texto:s+" no respondió.", reintentar:true };
    case "blocked_by_policy":    return { texto:"La política de tu organización bloquea esta consulta a "+s+".", reintentar:false };
    case "approval_required":    return { texto:"Esta consulta requiere aprobación por llamada, que aún no se puede dar desde una página. Consúltalo directamente en "+s+".", reintentar:false };
    case "not_in_manifest":      return { texto:"Esta página no tiene permiso para esa consulta de "+s+".", reintentar:false };
    case "not_granted":
    case "capability_disabled":  return { texto:"El conector de "+s+" no está disponible en Portal Lapzo.", reintentar:false };
    case "tool_error":           return { texto:s+" rechazó la consulta: "+((e&&e.message)||"sin detalle")+".", reintentar:false };
    case "bad_request":          return { texto:"La consulta a "+s+" salió mal formada. Reporta este error.", reintentar:false };
    case "cancelled":            return { texto:"Consulta cancelada.", reintentar:true };
    case "rate_limited":         return { texto:"Demasiadas consultas a "+s+". Espera unos segundos.", reintentar:true };
    default:                     return { texto:"No se pudo consultar "+s+" ahora mismo.", reintentar:true };
  }
}

function mapCuenta(row){
  const p = {};
  (row.properties||[]).forEach(x => { p[x.property] = x.value; });
  const info = { _id:row.id, _url:row.vitallyUrl || null, _nombre:p.name || row.name || "(sin nombre)", _leidoEn:new Date().toISOString() };
  VT_CAMPOS.forEach(c => { info[c.key] = p[c.prop]; });
  return info;
}
const VT_INPUT_PROPS = ["name"].concat(VT_CAMPOS.map(c=>c.prop));

async function llamarVitally(q){
  return S.mcp.callTool(VT_SERVER, "search_accounts", {
    query:{
      properties: VT_INPUT_PROPS,
      where:{ filters:{ primary:{ join:"AND", filterItems:[ { filter:{ property:"name", operator:"contains", value:q } } ] } } }
    },
    pagination:{ pageSize:8 }
  }, { cache:{ staleTime:60000 } });
}

let vtReintento = 0;
async function buscarCuenta(q){
  if(!q || q.trim().length < 2){ S.vt = { q, estado:"idle", res:[], err:null, cache:null }; render(); return; }
  if(!S.mcp){
    S.vt = { q, estado:"error", res:[], err:{ texto:"El conector de Vitally no está disponible en Portal Lapzo. Puedes continuar capturando la cuenta manualmente.", reintentar:false }, cache:null };
    render(); return;
  }
  S.vt = { ...S.vt, q, estado:"cargando", err:null }; render();
  try{
    const r = await llamarVitally(q.trim());
    const pay = r && r.payload;
    const rows = (pay && pay.result && Array.isArray(pay.result.results)) ? pay.result.results : [];
    vtReintento = 0;
    S.vt = { q, estado:"listo", res:rows.map(mapCuenta), err:null, cache:(r&&r.cache)?r.cache.storedAt:null };
  }catch(e){
    const m = mensajeMcp(e, "Vitally");
    if(m.reintentar && e && e.retryable && vtReintento < 1){
      vtReintento++;
      setTimeout(()=>buscarCuenta(q), Math.min(e.retryAfterMs || 1200, 60000) + Math.random()*400);
      S.vt = { ...S.vt, estado:"cargando", err:null };
    }else{
      vtReintento = 0;
      S.vt = { q, estado:"error", res:[], err:m, cache:null };
    }
  }
  render();
}

/* Refrescar la información de cuenta de una solicitud ya creada */
async function refrescarCuenta(id){
  const s = S.solicitudes.find(x=>x.id===id);
  if(!s || !S.mcp) return;
  S.refrescando = id; render();
  try{
    const r = await llamarVitally(String(s.cuenta||"").trim());
    const pay = r && r.payload;
    const rows = (pay && pay.result && Array.isArray(pay.result.results)) ? pay.result.results : [];
    const match = rows.find(x => x.id === s.vitallyId) || rows[0];
    if(match){
      S.refrescando = null;
      guardarSolicitud(id, { cuentaInfo: mapCuenta(match), vitallyId: match.id });
      S.msg = { tono:"green", texto:"Información de cuenta actualizada desde Vitally." };
    }else{
      S.refrescando = null;
      S.msg = { tono:"amber", texto:"Vitally no devolvió ninguna cuenta que coincida con «"+s.cuenta+"»." };
    }
  }catch(e){
    S.refrescando = null;
    S.msg = { tono:"red", texto: mensajeMcp(e, "Vitally").texto };
  }
  render();
}

/* Prellenar el diagnóstico con lo que Vitally ya sabe */
function contextoDesdeCuenta(info){
  const c = {};
  const seg = String((info||{}).tamanoSeg||"").toLowerCase();
  const n = Number((info||{}).tamanoNum);
  if(n > 1000 || seg.indexOf("enterprise") >= 0) c.admins = 1;
  return c;
}

/* ============================================================
   Google Drive
   ============================================================ */
async function buscarDrive(q, catKey){
  if(!q || q.trim().length < 2){ S.gd = { q, estado:"idle", res:[], err:null, cat:catKey }; render(); return; }
  if(!S.mcp){
    S.gd = { q, estado:"error", res:[], err:{ texto:"El conector de Google Drive no está disponible. Puedes agregar el recurso pegando su enlace." }, cat:catKey };
    render(); return;
  }
  S.gd = { q, estado:"cargando", res:[], err:null, cat:catKey }; render();
  const term = q.trim().replace(/'/g, "\\'");
  try{
    const r = await S.mcp.callTool(GD_SERVER, "search_files", {
      query:"title contains '"+term+"'",
      pageSize:8,
      excludeContentSnippets:true
    }, { cache:{ staleTime:120000 } });
    const pay = r && r.payload;
    const files = (pay && Array.isArray(pay.files)) ? pay.files : [];
    S.gd = { q, estado:"listo", res:files, err:null, cat:catKey };
  }catch(e){
    S.gd = { q, estado:"error", res:[], err: mensajeMcp(e, "Google Drive"), cat:catKey };
  }
  render();
}

const MIME_LABEL = {
  "application/vnd.google-apps.document":"Doc",
  "application/vnd.google-apps.spreadsheet":"Sheet",
  "application/vnd.google-apps.presentation":"Slides",
  "application/vnd.google-apps.form":"Form",
  "application/vnd.google-apps.folder":"Carpeta",
  "application/pdf":"PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"Word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"Excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":"PPT",
  "image/png":"PNG", "image/jpeg":"JPG"
};
const LEIBLES = Object.keys(MIME_LABEL).filter(m => m !== "application/vnd.google-apps.folder" && m !== "application/vnd.google-apps.form");
const esLeible = m => LEIBLES.includes(m);
function etiquetaMime(m){ return MIME_LABEL[m] || "Liga"; }
function pesoArchivo(b){
  const n = Number(b);
  if(!(n > 0)) return null;
  if(n < 1024) return n+" B";
  if(n < 1048576) return Math.round(n/1024)+" KB";
  return (n/1048576).toFixed(1)+" MB";
}

/* Leer el contenido de un documento de Drive y mostrarlo dentro del hub */
async function verDocumento(item){
  if(!item.driveId){
    S.msg = { tono:"amber", texto:"Este recurso es una liga externa: solo se puede abrir en su origen." };
    render(); return;
  }
  if(!S.mcp){
    S.msg = { tono:"amber", texto:"El conector de Google Drive no está disponible. Abre el recurso en su enlace original." };
    render(); return;
  }
  S.preview = { id:item.id, titulo:item.titulo, estado:"cargando", texto:null, err:null, url:item.url };
  render();
  try{
    const r = await S.mcp.callTool(GD_SERVER, "read_file_content", { fileId:item.driveId }, { cache:{ staleTime:300000 } });
    const pay = r && r.payload;
    const txt = (pay && typeof pay.fileContent === "string") ? pay.fileContent : null;
    S.preview = { id:item.id, titulo:item.titulo, estado:"listo", texto:txt, err: txt ? null : { texto:"Drive no devolvió texto legible para este archivo." }, url:item.url };
  }catch(e){
    S.preview = { id:item.id, titulo:item.titulo, estado:"error", texto:null, err: mensajeMcp(e, "Google Drive"), url:item.url };
  }
  render();
}

/* ============================================================
   Descarga de CSV
   ============================================================ */
function csvCelda(v){
  const s = String(v==null?"":v);
  return /[",\n;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function aCSV(headers, filas){
  return [headers.map(csvCelda).join(","), ...filas.map(f=>f.map(csvCelda).join(","))].join("\r\n");
}
/* Descarga nativa del navegador. No hace falta ninguna capacidad externa. */
async function descargar(nombre, contenido){
  try{
    const blob = new Blob(["\ufeff"+contenido], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    S.msg = { tono:"green", texto:"Archivo «"+nombre+"» listo." };
  }catch(e){
    console.error("[HUB] descarga fallida:", e);
    S.msg = { tono:"red", texto:"No se pudo generar el archivo." };
  }
  render();
}

/* ============================================================
   Tema
   ============================================================ */
function temaEfectivo(){
  const t = document.documentElement.getAttribute("data-theme");
  if(t) return t;
  try{ return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }catch(e){ return "light"; }
}
function initTema(){ const t = read("lapzo.tema",""); if(t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); }
function toggleTema(){
  const next = temaEfectivo() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  write("lapzo.tema", next);
  pintarTema();
}
function pintarTema(){
  const b = document.getElementById("temaBtn");
  if(b) b.innerHTML = temaEfectivo() === "dark" ? IC.sun : IC.moon;
}
