"use strict";

/* ============================================================
   PARTE 3 — Shell, navegación y vista de producto
   ============================================================ */

const TITULOS = {
  solicitudes:{ t:"Solicitudes", s:"Bandeja de trabajo entre Account Executives y Activaciones" },
  carga:      { t:"Carga operativa", s:"Capacidad del sprint medida en slots de activación" },
  roadmap:    { t:"Roadmap", s:"Qué se está activando, en qué sprint y con quién" },
  procesos:   { t:"Proceso de activación", s:"Cómo entra y sale el trabajo del área" },
  ajustes:    { t:"Ajustes", s:"Equipo, componentes, criterio de complejidad y accesos" }
};

function render(){
  if(!vistaPermitida(S.vista)) S.vista = (ROLES[rolAct()]||ROLES.ae).vistas[0];
  renderNav(); renderRail(); renderTop();
  const v = S.vista;
  const html =
    v === "solicitudes" ? vistaSolicitudes() :
    v === "carga"       ? vistaCarga() :
    v === "roadmap"     ? vistaRoadmap() :
    v === "procesos"    ? vistaProcesos() :
    v === "producto"    ? vistaProducto() :
    vistaAjustes();
  document.getElementById("body").innerHTML = mensaje() + html + modalPreview();
}

function mensaje(){
  const out = [];
  if(S.dbError) out.push('<div class="note note-red"><div class="grow"><strong>'+esc(S.dbError)+'</strong></div>'+
    '<button class="btn btn-sm" data-act="recargar-hub">Reintentar</button></div>');
  if(S.msg) out.push('<div class="note note-'+esc(S.msg.tono)+'"><div class="grow">'+esc(S.msg.texto)+'</div><button class="btn btn-sm btn-ghost" data-act="cerrar-msg">Cerrar</button></div>');
  return out.join("");
}

function renderTop(){
  const T = TITULOS[S.vista];
  let titulo, sub;
  if(S.vista === "producto"){
    const p = prod(S.producto);
    titulo = p.nombre;
    sub = (p.vitally ? "En Vitally: "+p.vitally : "Sin stage propio en Vitally") +
          (p.siempre ? " · se activa en toda cuenta" : "");
  }else{
    titulo = T.t; sub = T.s;
  }
  document.getElementById("tbTitle").textContent = titulo;

  const pend = S.solicitudes.filter(s => est(s).activa && !ev(s).completo).length;
  document.getElementById("tbSub").innerHTML = esc(sub) +
    (pend && puedeOperar() ? ' · <b>'+pend+' sin diagnóstico completo</b>' : "");

  const st = document.getElementById("tbStatus");
  if(!S.capsResolved) st.innerHTML = '<span class="d off"></span>Conectando';
  else{
    /* La base es Supabase y es compartida siempre: lo único variable es si hay
       conectores en vivo para Vitally y Drive. */
    const partes = ["Portal Lapzo", S.mcp ? "Vitally y Drive en vivo" : "Captura manual"];
    st.innerHTML = '<span class="d'+(S.dbError?" off":"")+'"></span>'+esc(partes.join(" · "));
  }
}

function renderNav(){
  const rol = rolAct();
  const permitido = v => (ROLES[rol]||ROLES.ae).vistas.includes(v);
  const pend = S.solicitudes.filter(s=>s.estado==="nueva"||s.estado==="triage").length;
  const cap = capacidad();

  const item = (key,icon,label,badge) =>
    !permitido(key) ? "" :
    '<button type="button" class="navbtn" data-vista="'+key+'" aria-current="'+(S.vista===key)+'">'+
      icon+'<span class="grow">'+esc(label)+'</span>'+(badge?'<span class="badge">'+esc(String(badge))+'</span>':'')+
    '</button>';

  document.getElementById("navMain").innerHTML =
    item("solicitudes", IC.inbox, "Solicitudes", pend) +
    item("carga", IC.gauge, "Carga operativa", cap.libre < 0 ? "!" : 0) +
    item("roadmap", IC.map, "Roadmap", cap.enSprint.length) +
    item("procesos", IC.flow, "Proceso", 0);

  const nprod = document.getElementById("navProd");
  if(!permitido("producto")){ nprod.innerHTML = ""; }
  else{
    nprod.innerHTML = '<div class="navlabel">Productos</div>' +
      PRODUCTOS.map(p => {
        const activos = S.solicitudes.filter(s => est(s).activa && (s.productos||[]).includes(p.key)).length;
        const act = S.vista === "producto" && S.producto === p.key;
        return '<button type="button" class="navbtn" data-prod="'+p.key+'" aria-current="'+act+'">'+
          '<span class="pdot" style="background:'+p.color+'"></span>'+
          '<span class="grow">'+esc(p.nombre)+'</span>'+
          (activos ? '<span class="badge badge-soft">'+activos+'</span>' : '')+
        '</button>';
      }).join("");
  }

  document.getElementById("navFoot").innerHTML = item("ajustes", IC.sliders, "Ajustes", 0);
}

function renderRail(){
  const c = cfg(), cap = capacidad();
  const box = document.getElementById("sprintBox");
  if(rolAct() === "ae"){
    box.innerHTML = '<span class="k">Sprint en curso</span>'+
      '<span class="code">'+esc(c.sprint.codigo)+'</span>'+
      '<span class="sub">'+esc(rangoSprint(c.sprint))+'</span>';
  }else{
    box.innerHTML = '<span class="k">Sprint en curso</span>'+
      '<span class="code">'+esc(c.sprint.codigo)+'</span>'+
      '<span class="sub">'+esc(rangoSprint(c.sprint))+'</span>'+
      (cap.total
        ? '<span class="sub" style="color:var(--'+(cap.libre<0?"red":(cap.libre<=cap.total*0.15?"amber":"green"))+');font-weight:600">'+nf(cap.libre)+' de '+nf(cap.total)+' slots libres</span>'
        : '<span class="sub">Equipo sin configurar</span>');
  }

  const rol = ROLES[S.rol] || ROLES.ae;
  const act = ROLES[rolAct()] || rol;

  /* Identidad y regreso al portal. La ruta se resuelve con LapzoPaths para que
     funcione igual en la raíz de un dominio que en un subpath de GitHub Pages. */
  const pb = document.getElementById("portalBar");
  if(pb && S.usuario){
    const volver = window.LapzoPaths ? LapzoPaths.resolve("index.html#/inicio") : "../index.html#/inicio";
    pb.innerHTML =
      '<a class="pb-back" href="'+esc(volver)+'">← Portal Lapzo</a>'+
      '<div class="pb-who"><b>'+esc(S.usuario.nombre || S.usuario.email)+'</b>'+
      '<span>'+esc(rol.label)+'</span></div>'+
      '<button type="button" class="pb-out" data-act="salir">Cerrar sesión</button>';
  }

  document.getElementById("railRol").innerHTML =
    '<div class="rolbox">'+
      '<span class="k">Tu nivel en el Hub</span>'+
      '<span class="rolname">'+esc(rol.label)+'</span>'+
      '<span class="sub">'+esc(rol.desc)+'</span>'+
      (S.rol === "hcs"
        ? '<div class="verComo"><span class="lbl" style="padding:0">Ver como</span><div class="modeswitch">'+
            ["hcs","as","ae"].map(r=>'<button type="button" data-vercomo="'+r+'" aria-pressed="'+((S.verComo||S.rol)===r)+'">'+esc(ROLES[r].corto)+'</button>').join("")+
          '</div></div>'
        : '')+
      (S.verComo && S.verComo !== S.rol
        ? '<span class="sub" style="color:var(--amber);font-weight:600">Vista previa como '+esc(act.corto)+'</span>'
        : '');
}

/* ============================================================
   Vista de producto — Operación + Recursos
   ============================================================ */
function vistaProducto(){
  const pk = S.producto, p = prod(pk);
  const tabs = [
    { key:"operacion", label:"Operación" },
    { key:"recursos",  label:"Recursos" }
  ];
  return '<div class="tabs">'+tabs.map(t=>
      '<button type="button" class="tab" data-tabprod="'+t.key+'" aria-pressed="'+(S.tabProd===t.key)+'">'+esc(t.label)+'</button>').join("")+
    '</div>'+
    (S.tabProd === "recursos" ? prodRecursos(pk, p) : prodOperacion(pk, p));
}

/* ---- Operación ---- */
function prodOperacion(pk, p){
  const c = cfg();
  const activas = S.solicitudes.filter(s => est(s).activa && (s.productos||[]).includes(pk));
  const enSprintProd = activas.filter(s => s.sprint === c.sprint.codigo && est(s).enSprint);
  const catalogo = comps(pk);

  let slotsProd = 0, compsCurso = 0, compsListos = 0, compsTotal = 0;
  const filas = activas.map(s => {
    const e = ev(s);
    const mapa = (s.componentes||{})[pk] || {};
    const propios = catalogo.filter(cc => mapa[cc.id] && COMP_ESTADOS[mapa[cc.id]] && COMP_ESTADOS[mapa[cc.id]].cuenta);
    const listos = propios.filter(cc => mapa[cc.id] === "listo");
    const curso  = propios.filter(cc => mapa[cc.id] === "curso");
    compsTotal += propios.length; compsListos += listos.length; compsCurso += curso.length;
    if(s.sprint === c.sprint.codigo && est(s).enSprint) slotsProd += slots(s);
    const persona = (c.roster.find(x=>x.id===s.asignado)||{}).nombre;
    const dias = diasHasta(s.fechaEntrega);
    let faseActual = "";
    const enCurso = curso[0];
    if(enCurso) faseActual = enCurso.fase || "";
    else {
      const sig = propios.find(cc => mapa[cc.id] !== "listo");
      faseActual = sig ? (sig.fase || "") : "";
    }
    return { s, e, propios, listos, curso, persona, dias, faseActual,
      pct: propios.length ? Math.round(listos.length/propios.length*100) : 0 };
  }).sort((a,b) => {
    const da = a.dias == null ? 9999 : a.dias, db2 = b.dias == null ? 9999 : b.dias;
    return da - db2;
  });

  const pctGlobal = compsTotal ? Math.round(compsListos/compsTotal*100) : 0;
  const proximas = filas.filter(f => f.dias != null && f.dias >= 0 && f.dias <= 14).length;
  const vencidas = filas.filter(f => f.dias != null && f.dias < 0).length;

  if(!catalogo.length){
    return '<div class="note note-amber"><div class="grow"><strong>'+esc(p.nombre)+' no tiene componentes configurados.</strong> '+
      (puedeConfigurar()
        ? 'Defínelos en Ajustes → Componentes para poder medir progreso y complejidad de este producto.'
        : 'El HCS los define en Ajustes → Componentes.')+'</div>'+
      (puedeConfigurar()?'<button class="btn btn-sm" data-act="ir-componentes" data-id="'+esc(pk)+'">Configurar</button>':'')+'</div>'+
      tablaOperacion(filas, pk, catalogo, false);
  }

  return '<div class="kpis">'+
    kpi("Clientes activos", activas.length, enSprintProd.length+" en "+c.sprint.codigo, "", p.color)+
    kpi("Progreso de componentes", pctGlobal+"%", compsListos+" de "+compsTotal+" listos", pctGlobal>=70?"ok":(pctGlobal>=30?"":"warn"), p.color)+
    kpi("En activación ahora", compsCurso, "componentes en curso", "", p.color)+
    kpi("Slots del producto", nf(slotsProd), "en el sprint en curso", "", p.color)+
  '</div>'+
  (vencidas
    ? '<div class="note note-red"><div class="grow"><strong>'+vencidas+' entrega'+(vencidas===1?"":"s")+' con fecha vencida.</strong> Revisa el compromiso con el AE antes de que el cliente lo note.</div></div>'
    : (proximas ? '<div class="note note-amber"><div class="grow"><strong>'+proximas+' entrega'+(proximas===1?"":"s")+' en los próximos 14 días.</strong></div></div>' : ''))+
  '<div class="card">'+
    '<div class="card-head">'+
      '<div class="htxt"><h2>Operación de '+esc(p.nombre)+'</h2>'+
        '<span class="hint">Progreso de slot, componentes en activación, estrategia y día de entrega por cliente</span></div>'+
      '<div class="btnrow">'+
        (filas.length ? '<button class="btn btn-sm" data-act="csv-producto" data-id="'+esc(pk)+'">'+IC.dl+'Descargar CSV</button>' : '')+
      '</div>'+
    '</div>'+
    tablaOperacion(filas, pk, catalogo, true)+
  '</div>'+
  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h3>Componentes de '+esc(p.nombre)+'</h3>'+
      '<span class="hint">'+catalogo.length+' procesos clave del journey · la dificultad define el peso en el score de complejidad</span></div></div>'+
    '<div class="tw"><table><thead><tr><th>Fase / proceso clave</th><th>Dificultad</th><th>Responsable</th><th>Tiempo AS</th><th>Clientes</th><th>Listos</th></tr></thead><tbody>'+
      (function(){
        const fases = [];
        catalogo.forEach(cc => { const f = cc.fase||"Sin fase"; if(!fases.includes(f)) fases.push(f); });
        return fases.map(fa => {
          const enFase = catalogo.filter(cc => (cc.fase||"Sin fase") === fa);
          return '<tr class="faserow"><td colspan="6"><span class="fasename">'+esc(fa)+'</span>'+
            '<span class="s"> · '+enFase.length+' proceso'+(enFase.length===1?"":"s")+'</span></td></tr>'+
            enFase.map(cc => {
              const conEl = activas.filter(s => { const m=(s.componentes||{})[pk]||{}; return m[cc.id] && COMP_ESTADOS[m[cc.id]].cuenta; });
              const listos = conEl.filter(s => ((s.componentes||{})[pk]||{})[cc.id] === "listo").length;
              return '<tr><td><span class="t">'+esc(cc.nombre)+'</span>'+(cc.opcional?' <span class="tag">si aplica</span>':'')+'</td>'+
                '<td><span class="tag '+(cc.dificultad==="Alta"?"tag-red":(cc.dificultad==="Media"?"tag-amber":"tag-green"))+'">'+esc(cc.dificultad||"—")+'</span></td>'+
                '<td class="s">'+esc(cc.responsable||"—")+'</td>'+
                '<td class="s">'+esc(cc.tLapzo||"—")+'</td>'+
                '<td>'+conEl.length+'</td>'+
                '<td>'+(conEl.length?'<span class="tag '+(listos===conEl.length?"tag-green":(listos?"tag-amber":"tag"))+'">'+listos+' de '+conEl.length+'</span>':'<span class="s">—</span>')+'</td></tr>';
            }).join("");
        }).join("");
      })()+
    '</tbody></table></div>'+
  '</div>';
}

function tablaOperacion(filas, pk, catalogo, conComp){
  if(!filas.length) return '<div class="empty">Ningún cliente activo con este producto ahora mismo.</div>';
  return '<div class="tw"><table><thead><tr>'+
    '<th>Cliente</th><th>Progreso del slot</th>'+(conComp?'<th>Fase y componentes en activación</th>':'')+
    '<th>Ruta</th><th>Entrega</th><th>Activador</th><th>Estado</th>'+
  '</tr></thead><tbody>'+
  filas.map(f => {
    const s = f.s;
    const tonoDia = f.dias == null ? "" : (f.dias < 0 ? "tag-red" : (f.dias <= 14 ? "tag-amber" : "tag-green"));
    return '<tr>'+
      '<td><div class="cs"><span class="t">'+esc(s.cuenta)+'</span>'+
        '<span class="s">'+esc(s.tipo||"")+'</span></div></td>'+
      '<td style="min-width:150px">'+
        '<div class="cs"><span class="t">'+f.pct+'%</span>'+
        '<span class="track"><i style="width:'+f.pct+'%"></i></span>'+
        '<span class="s">'+f.listos.length+' de '+f.propios.length+' componentes · '+nf(slots(s))+' slot'+(slots(s)===1?"":"s")+'</span></div></td>'+
      (conComp
        ? '<td>'+(f.curso.length
            ? '<div class="cs"><span class="s"><b class="t">'+esc(f.faseActual||"")+'</b></span>'+
              '<div class="rtags">'+f.curso.map(cc=>'<span class="tag tag-violet">'+esc(cc.nombre)+'</span>').join("")+'</div></div>'
            : '<span class="s">'+(f.propios.length ? (f.pct===100?"todo listo":"nada en curso")+(f.faseActual?" · siguiente: "+esc(f.faseActual):"") : "sin componentes marcados")+'</span>')+'</td>'
        : '')+
      '<td><span class="s">'+esc(s.ruta && ruta(s.ruta) ? ruta(s.ruta).sub : "ruta por definir")+'</span></td>'+
      '<td>'+(s.fechaEntrega
        ? '<div class="cs"><span class="tag '+tonoDia+'">'+esc(fechaCorta(s.fechaEntrega))+'</span>'+
          '<span class="s">'+(f.dias < 0 ? Math.abs(f.dias)+" días tarde" : f.dias+" días")+'</span></div>'
        : '<span class="s">sin fecha</span>')+'</td>'+
      '<td><span class="s">'+esc(f.persona || "por asignar")+'</span></td>'+
      '<td><span class="tag '+est(s).tag+'">'+esc(est(s).label)+'</span></td>'+
    '</tr>';
  }).join("")+
  '</tbody></table></div>';
}

function csvProducto(pk){
  const c = cfg(), catalogo = comps(pk);
  const activas = S.solicitudes.filter(s => est(s).activa && (s.productos||[]).includes(pk));
  const headers = ["Cliente","Tipo de trabajo","Estado","Sprint","Activador","Ruta","Fecha de entrega","Dias restantes",
                   "Nivel","Score","Slots","Componentes marcados","Listos","En curso","Fase actual","Componentes en activacion"];
  const filas = activas.map(s => {
    const e = ev(s), mapa = (s.componentes||{})[pk] || {};
    const propios = catalogo.filter(cc => mapa[cc.id] && COMP_ESTADOS[mapa[cc.id]].cuenta);
    const listos = propios.filter(cc => mapa[cc.id]==="listo");
    const curso = propios.filter(cc => mapa[cc.id]==="curso");
    return [s.cuenta, s.tipo||"", est(s).label, s.sprint||"", (c.roster.find(x=>x.id===s.asignado)||{}).nombre||"",
      (s.ruta&&ruta(s.ruta))?ruta(s.ruta).sub:"", s.fechaEntrega||"", diasHasta(s.fechaEntrega)==null?"":diasHasta(s.fechaEntrega),
      e.nivel||"sin diagnostico", e.score, nf(slots(s)),
      propios.length, listos.length, curso.length,
      (curso[0]?curso[0].fase:""), curso.map(cc=>cc.nombre).join(" | ")];
  });
  descargar("operacion-"+pk+"-"+cfg().sprint.codigo+".csv", aCSV(headers, filas));
}

/* ---- Recursos con secciones editables y Drive ---- */
function prodRecursos(pk, p){
  const items = S.recursos[pk] || [];
  const secciones = cats(pk);
  const puede = puedeOperar();

  return '<div class="card">'+
    '<div class="card-head">'+
      '<div class="htxt"><h2>Kit de activación</h2>'+
        '<span class="hint">'+items.length+' recurso'+(items.length===1?"":"s")+' · '+secciones.length+' sección'+(secciones.length===1?"":"es")+
        (puede?" · puedes editar secciones y adjuntar desde Drive":" · vista de consulta")+'</span></div>'+
      (puede ? '<button class="btn btn-sm" data-act="nueva-seccion" data-id="'+esc(pk)+'">Nueva sección</button>' : '')+
    '</div>'+
    (secciones.length
      ? secciones.map((cc,i) => seccionRecursos(pk, cc, i, secciones.length, items, puede)).join("")
      : '<div class="empty">Este producto no tiene secciones. '+(puede?'Crea la primera con «Nueva sección».':'El equipo de Activaciones las define.')+'</div>')+
  '</div>'+
  (S.mcp
    ? '<div class="note"><div class="grow">Los documentos se adjuntan desde <strong>Google Drive</strong> con su nombre, tipo y fecha reales. «Ver aquí» abre el contenido dentro del hub; «Abrir» va al archivo original en Drive.</div></div>'
    : '<div class="note note-amber"><div class="grow">El conector de Google Drive no está disponible en Portal Lapzo. Puedes agregar recursos pegando su enlace.</div></div>');
}

function seccionRecursos(pk, cc, idx, total, items, puede){
  const mios = items.filter(x => x.cat === cc.id);
  const buscando = S.gd.cat === cc.id;
  return '<div class="rescat">'+
    '<div class="rescat-h">'+
      '<span class="ico" style="background:color-mix(in srgb,'+esc(cc.color||prod(pk).color)+' 15%,transparent);color:'+esc(cc.color||prod(pk).color)+'">'+IC.book+'</span>'+
      (puede
        ? '<input type="text" value="'+esc(cc.titulo)+'" data-act="sec-titulo" data-id="'+esc(pk)+'" data-sec="'+esc(cc.id)+'" class="inline-title">'+
          '<textarea data-act="sec-desc" data-id="'+esc(pk)+'" data-sec="'+esc(cc.id)+'" class="inline-desc" rows="2" placeholder="Para qué sirve esta sección">'+esc(cc.desc||"")+'</textarea>'+
          '<div class="btnrow" style="gap:6px">'+
            (idx>0?'<button class="btn btn-sm btn-ghost" data-act="sec-sube" data-id="'+esc(pk)+'" data-sec="'+esc(cc.id)+'" title="Subir">↑</button>':'')+
            (idx<total-1?'<button class="btn btn-sm btn-ghost" data-act="sec-baja" data-id="'+esc(pk)+'" data-sec="'+esc(cc.id)+'" title="Bajar">↓</button>':'')+
            '<button class="btn btn-sm btn-ghost" data-act="sec-borra" data-id="'+esc(pk)+'" data-sec="'+esc(cc.id)+'">Borrar sección</button>'+
          '</div>'
        : '<h4>'+esc(cc.titulo)+'</h4><p>'+esc(cc.desc||"")+'</p>')+
    '</div>'+
    '<div class="reslist">'+
      (mios.length
        ? mios.map(x => itemRecurso(x, puede)).join("")
        : '<div class="s" style="padding:2px 0">Sin recursos en esta sección.</div>')+
      (puede ? bloqueAdjuntar(pk, cc, buscando) : '')+
    '</div>'+
  '</div>';
}

function itemRecurso(x, puede){
  const leible = x.driveId && esLeible(x.mime);
  return '<div class="resitem">'+
    '<span class="tag">'+esc(etiquetaMime(x.mime))+'</span>'+
    '<span class="grow">'+
      '<span class="rt">'+esc(x.titulo)+'</span>'+
      '<span class="ru">'+[x.tamano, x.modificado?("actualizado "+fechaCorta(x.modificado)):null, x.driveId?"Drive":"liga externa"].filter(Boolean).map(esc).join(" · ")+'</span>'+
    '</span>'+
    (leible ? '<button class="btn btn-sm btn-outline" data-act="ver-doc" data-id="'+esc(x.id)+'">'+IC.eye+'Ver aquí</button>' : '')+
    '<a class="btn btn-sm" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Abrir</a>'+
    (puede ? '<button class="btn btn-sm btn-ghost" data-act="res-del" data-id="'+esc(x.id)+'">Quitar</button>' : '')+
  '</div>';
}

function bloqueAdjuntar(pk, cc, buscando){
  return '<div class="adjuntar">'+
    '<div class="adjrow">'+
      '<label class="field" style="flex:1"><span class="lb">Buscar documento en Drive</span>'+
        '<input type="text" placeholder="Nombre del documento…" data-act="gd-input" data-sec="'+esc(cc.id)+'" value="'+esc(buscando?S.gd.q:"")+'" autocomplete="off"></label>'+
      '<button class="btn btn-sm btn-ghost" data-act="liga-manual" data-id="'+esc(pk)+'" data-sec="'+esc(cc.id)+'">Pegar liga</button>'+
    '</div>'+
    (buscando ? resultadosDrive(pk, cc) : '')+
  '</div>';
}

function resultadosDrive(pk, cc){
  const g = S.gd;
  if(g.estado === "idle") return "";
  if(g.estado === "cargando") return '<div class="vt"><span class="s"><span class="spin"></span> Buscando «'+esc(g.q)+'» en Drive…</span></div>';
  if(g.estado === "error") return '<div class="note note-amber" style="margin-top:8px"><div class="grow">'+esc(g.err.texto)+'</div></div>';
  if(!g.res.length) return '<div class="vt"><span class="s">Drive no tiene archivos cuyo título contenga «'+esc(g.q)+'».</span></div>';
  return '<div class="gdlist">'+g.res.map(f =>
    '<button type="button" class="gditem" data-act="gd-pick" data-id="'+esc(pk)+'" data-sec="'+esc(cc.id)+'" data-fid="'+esc(f.id)+'">'+
      '<span class="tag">'+esc(etiquetaMime(f.mimeType))+'</span>'+
      '<span class="grow"><span class="rt">'+esc(f.title)+'</span>'+
        '<span class="ru">'+[pesoArchivo(f.fileSize), f.modifiedTime?("mod. "+fechaCorta(f.modifiedTime)):null, f.owner].filter(Boolean).map(esc).join(" · ")+'</span></span>'+
      '<span class="s">Adjuntar</span>'+
    '</button>').join("")+'</div>';
}

/* ---- Modal de vista de documento ---- */
function modalPreview(){
  const p = S.preview;
  if(!p) return "";
  return '<div class="modal" data-act="cerrar-preview">'+
    '<div class="modalbox" data-stop="1">'+
      '<div class="modalhead">'+
        '<div class="htxt"><h3>'+esc(p.titulo)+'</h3>'+
          '<span class="hint">Contenido leído desde Google Drive · vista de lectura en texto</span></div>'+
        '<div class="btnrow">'+
          (p.url?'<a class="btn btn-sm" href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">Abrir en Drive</a>':'')+
          (p.texto ? '<button class="btn btn-sm" data-act="dl-doc">'+IC.dl+'Descargar texto</button>' : '')+
          '<button class="btn btn-sm btn-ghost" data-act="cerrar-preview">Cerrar</button>'+
        '</div>'+
      '</div>'+
      '<div class="modalbody">'+
        (p.estado === "cargando" ? '<div class="empty"><span class="spin"></span> Leyendo el documento…</div>' :
         p.estado === "error" ? '<div class="note note-amber"><div class="grow">'+esc(p.err.texto)+'</div></div>' :
         p.texto ? '<pre class="doctext">'+esc(p.texto)+'</pre>' :
         '<div class="note note-amber"><div class="grow">'+esc((p.err&&p.err.texto)||"Sin contenido.")+'</div></div>')+
      '</div>'+
    '</div>'+
  '</div>';
}

function kpi(k, v, u, tono, color){
  return '<div class="kpi '+(tono||"")+'">'+
    '<span class="k">'+(color?'<span class="pdot" style="background:'+color+'"></span>':'')+esc(k)+'</span>'+
    '<span class="v">'+esc(String(v))+'</span>'+
    '<span class="u">'+esc(u)+'</span></div>';
}
