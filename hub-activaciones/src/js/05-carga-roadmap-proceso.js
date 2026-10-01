"use strict";

/* ============================================================
   PARTE 5 — Carga, roadmap, proceso y ajustes
   ============================================================ */

const VITALLY_BASE = "https://lernit.vitally.io";
const FORM_CSAT = "https://docs.google.com/forms/d/1lR8sZQnsjJ_FTYo0HsYd_Gff_UyhFH7jSOnOyl_aZw0/edit";

const PROCESO = [
  { t:"Solicitud del AE", quien:"Account Executive",
    d:"El AE abre el ticket en cuanto el cliente pide la activación. Sin ticket no entra trabajo a activaciones: es la única puerta.",
    entrada:"Contrato firmado y producto contratado en Vitally",
    salida:"Ticket con cuenta, productos, tipo de trabajo y fecha comprometida",
    tools:[["Levantar solicitud","#solicitudes"],["Cuenta en Vitally",VITALLY_BASE]] },
  { t:"Información de cuenta y diagnóstico", quien:"Activation Specialist",
    d:"Dos insumos distintos: lo que Vitally ya sabe de la cuenta (TIER, licencias, stage, health) y lo que solo sale del kick-off (madurez de RH, sponsor, semáforo por módulo, bloqueos).",
    entrada:"Ticket nuevo y sesión de kick-off con el cliente",
    salida:"Información de cuenta adjunta y diagnóstico levantado",
    tools:[["Bandeja de triage","#solicitudes"],["Recursos de diagnóstico","#producto"]] },
  { t:"Alcance y costo en slots", quien:"Activation Specialist",
    d:"Se marcan los componentes que se van a activar por producto. El alcance más la preparación y los bloqueos dan el score, y el score da el costo en slots.",
    entrada:"Diagnóstico completo",
    salida:"Nivel de complejidad y slots que consume la cuenta",
    tools:[["Componentes por producto","#ajustes"]] },
  { t:"Asignación a sprint", quien:"Head of Customer Success",
    d:"Se asigna contra los slots libres del sprint, nunca contra la urgencia del pedido. Si no cabe, se responde en qué sprint cabe.",
    entrada:"Solicitud costeada",
    salida:"Sprint, activador y día de entrega comprometido",
    tools:[["Control de carga","#carga"]] },
  { t:"Kick off y plan de implementación", quien:"Activador + AE",
    d:"Arranca el reloj de activación. El AE presenta y se retira; activaciones toma la conducción operativa con la estrategia elegida.",
    entrada:"Sprint asignado y agenda confirmada",
    salida:"Plan de implementación acordado y fecha objetivo de lanzamiento",
    tools:[["Modelos guía por producto","#producto"]] },
  { t:"Activación de componentes", quien:"Activador",
    d:"Cada componente avanza de pendiente a en curso a listo. Ese avance es el progreso del slot y se refleja en el dashboard del producto.",
    entrada:"Plan de implementación",
    salida:"Componentes listos y stage del producto actualizado en Vitally",
    tools:[["Dashboard de operación","#producto"],["Actualizar stage",VITALLY_BASE]] },
  { t:"Lanzamiento con usuarios", quien:"Activador",
    d:"La activación no termina al configurar. Termina cuando los usuarios entran: es el paso que sostiene la penetración de producto.",
    entrada:"Componentes configurados",
    salida:"Usuarios activos y cuenta en segmento 2. Lanzamiento",
    tools:[["Materiales de lanzamiento","#producto"]] },
  { t:"Passdown a Customer Success", quien:"Activador + CSM",
    d:"Cierre formal con acta, CSAT de activación y traspaso. Sin passdown la cuenta sigue contando como carga abierta del equipo.",
    entrada:"Cuenta lanzada y adopción inicial medida",
    salida:"Acta de passdown, CSAT registrado y cuenta liberada del sprint",
    tools:[["Encuesta CSAT Activación",FORM_CSAT],["Doc de passdown",VITALLY_BASE]] }
];

const SEGMENTOS = [
  { n:"0- Sin Activar", k:"own" }, { n:"1- Onboarding", k:"own" }, { n:"2. Lanzamiento", k:"own" },
  { n:"3- Adopting", k:"hand" }, { n:"4 - Mature", k:"" }, { n:"5- Renewal", k:"" }, { n:"6- Champion", k:"" }
];

/* ============================================================
   Carga operativa
   ============================================================ */
function vistaCarga(){
  const cap = capacidad(), c = cfg();
  const siguiente = sprintSiguiente(c.sprint);
  const sim = S.simular ? S.solicitudes.find(s=>s.id===S.simular) : null;
  const simSlots = sim ? slots(sim) : 0;
  const cabe = sim ? (cap.libre - simSlots) >= 0 : null;
  const pendientes = S.solicitudes.filter(s => !est(s).enSprint && est(s).activa);

  return '<div class="note note-violet"><div class="grow">Una <strong>caja</strong> es un slot de activación de una persona. El score de complejidad define cuántos slots consume cada cuenta: media caja una activación ligera, dos cajas una crítica.</div></div>'+

  '<div class="kpis">'+
    kpi("Sprint", c.sprint.codigo, esc(rangoSprint(c.sprint)), "", "#6B3FCC")+
    kpi("Slots totales", nf(cap.total), cap.porPersona.length+" activador"+(cap.porPersona.length===1?"":"es"), "", "#8B55FE")+
    kpi("Ocupados", nf(cap.usado), cap.enSprint.length+" cuenta"+(cap.enSprint.length===1?"":"s")+" en curso", "", "#04949D")+
    kpi("Libres", nf(cap.libre), cap.total?Math.round(cap.usado/cap.total*100)+"% ocupado":"sin equipo", tonoCap(cap.libre,cap.total), "#1E7E34")+
  '</div>'+

  (cap.libre < 0
    ? '<div class="note note-red"><div class="grow"><strong>El sprint está sobrevendido por '+nf(Math.abs(cap.libre))+' slots.</strong> Mueve una cuenta a '+esc(siguiente.codigo)+' o suma capacidad antes de aceptar más solicitudes.</div></div>'
    : (cap.total && cap.libre <= cap.total*0.15
      ? '<div class="note note-amber"><div class="grow"><strong>Queda '+nf(cap.libre)+' de '+nf(cap.total)+' slots.</strong> Lo que entre ahora, entra a '+esc(siguiente.codigo)+'.</div></div>'
      : ''))+

  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Distribución por activador</h2>'+
      '<span class="hint">Cada cuadro es un slot; medio cuadro es una activación ligera</span></div>'+
      (cap.enSprint.length ? '<button class="btn btn-sm" data-act="csv-carga">'+IC.dl+'Descargar CSV</button>' : '')+
    '</div>'+
    (cap.porPersona.length
      ? cap.porPersona.map(p => {
          const libres = Math.round((p.slots - p.usados)*10)/10;
          return '<div class="person">'+
            '<span class="pid"><span class="av">'+esc((p.nombre||"?").trim().slice(0,2).toUpperCase())+'</span>'+
              '<span style="min-width:0"><span class="pname">'+esc(p.nombre)+'</span>'+
              '<span class="prole">'+esc(p.rol||"Activador")+'</span></span></span>'+
            '<span class="slotbar">'+barraSlots(p.usados,p.slots)+
              '<span class="s" style="margin-left:8px">'+(p.cuentas?p.cuentas+" cuenta"+(p.cuentas===1?"":"s"):"libre")+'</span></span>'+
            '<span class="pnum"><b>'+nf(p.usados)+'</b> / '+nf(p.slots)+'<br>'+
              '<span class="s">'+(libres<0?"sobrecarga":nf(libres)+" libre"+(libres===1?"":"s"))+'</span></span>'+
          '</div>';
        }).join("")
      : '<div class="empty">Aún no hay activadores registrados. '+(puedeConfigurar()?'Agrégalos en Ajustes → Equipo.':'El HCS configura el equipo en Ajustes.')+'</div>')+
    (cap.sinAsignar.length
      ? '<div class="card-pad" style="background:var(--surface-2);border-top:1px solid var(--line)">'+
        '<strong style="font-size:14px;color:var(--ink)">'+cap.sinAsignar.length+' cuenta'+(cap.sinAsignar.length===1?"":"s")+' en el sprint sin activador</strong>'+
        '<div class="btnrow" style="margin-top:10px">'+cap.sinAsignar.map(s=>'<span class="tag tag-amber">'+esc(s.cuenta)+' · '+nf(slots(s))+' slot'+(slots(s)===1?"":"s")+'</span>').join("")+'</div>'+
        '<p class="s" style="margin:10px 0 0">Sus slots ya cuentan contra el total del sprint. Asígnalas en Solicitudes.</p></div>'
      : '')+
  '</div>'+

  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h3>¿Cabe en este sprint?</h3>'+
      '<span class="hint">Simula el efecto de aceptar una solicitud pendiente</span></div></div>'+
    '<div class="card-pad stack">'+
      (pendientes.length
        ? '<div class="g2"><label class="field"><span class="lb">Solicitud pendiente</span><select data-act="simular">'+
            '<option value="">Elige una solicitud…</option>'+
            pendientes.map(s=>'<option value="'+esc(s.id)+'"'+(S.simular===s.id?" selected":"")+'>'+esc(s.cuenta)+' · '+esc(est(s).label)+'</option>').join("")+
          '</select></label></div>'+
          (sim
            ? '<div class="dgout">'+
                '<div><span class="lbl">Complejidad</span><span class="v" style="font-size:16px">'+esc(ev(sim).nivel||"incompleta")+'</span></div>'+
                '<div><span class="lbl">Costo</span><span class="v">'+nf(simSlots)+'</span></div>'+
                '<div><span class="lbl">Libres después</span><span class="v" style="color:var(--'+(cabe?"green":"red")+')">'+nf(Math.round((cap.libre-simSlots)*10)/10)+'</span></div>'+
                '<div class="tot"><span class="lbl">Veredicto</span><span class="v" style="font-size:17px;color:var(--'+(cabe?"green":"red")+')">'+(cabe?"Cabe":"No cabe")+'</span></div>'+
              '</div>'+
              (cabe
                ? '<div class="btnrow"><button class="btn btn-primary" data-act="meter-sprint" data-id="'+esc(sim.id)+'">Meter a '+esc(c.sprint.codigo)+'</button></div>'
                : '<div class="note note-amber"><div class="grow">Faltan '+nf(Math.round((simSlots-cap.libre)*10)/10)+' slots. La respuesta al AE es <strong>'+esc(siguiente.codigo)+' ('+esc(rangoSprint(siguiente))+')</strong>, no «la próxima semana».</div></div>')+
              (ev(sim).slots == null ? '<div class="note"><div class="grow">Esta solicitud aún no tiene diagnóstico completo: se cuesta como 1 slot por defecto. Complétalo para que el número sea real.</div></div>' : '')
            : '<p class="s" style="margin:0">Elige una solicitud para ver si entra sin sobrevender el sprint.</p>')
        : '<p class="s" style="margin:0">No hay solicitudes pendientes por acomodar. Todo lo abierto ya está en un sprint.</p>')+
    '</div>'+
  '</div>';
}
function barraSlots(usados,total){
  const out = [], enteros = Math.floor(usados), medio = usados - enteros >= 0.5;
  for(let i=0;i<Math.max(total,Math.ceil(usados));i++){
    let cls = "slot";
    if(i < enteros) cls += i >= total ? " over" : " full";
    else if(i === enteros && medio) cls += i >= total ? " over" : " half";
    out.push('<span class="'+cls+'"></span>');
  }
  return out.join("");
}
function csvCarga(){
  const c = cfg(), cap = capacidad();
  const headers = ["Sprint","Cliente","Estado","Activador","Slots","Nivel","Score","Productos","Ruta","Fecha de entrega","Progreso %"];
  const filas = cap.enSprint.map(s => {
    const d = ev(s);
    return [c.sprint.codigo, s.cuenta, est(s).label,
      (c.roster.find(x=>x.id===s.asignado)||{}).nombre||"", nf(slots(s)),
      d.nivel||"incompleto", d.score, (s.productos||[]).map(k=>prod(k).abbr).join(" | "),
      (s.ruta&&ruta(s.ruta))?ruta(s.ruta).sub:"", s.fechaEntrega||"", d.progreso];
  });
  descargar("carga-"+c.sprint.codigo+".csv", aCSV(headers, filas));
}

/* ============================================================
   Roadmap
   ============================================================ */
function vistaRoadmap(){
  const c = cfg(), grupos = {};
  S.solicitudes.forEach(s => { const k = s.sprint || "sin_sprint"; (grupos[k] = grupos[k] || []).push(s); });
  const claves = Object.keys(grupos).filter(k=>k!=="sin_sprint").sort().reverse();
  if(grupos.sin_sprint) claves.push("sin_sprint");

  return '<div class="note"><div class="grow">Esta es la vista que responde al AE sin que tenga que preguntar: cuenta, sprint, activador, avance de componentes y día de entrega.</div>'+
    (S.solicitudes.length ? '<button class="btn btn-sm" data-act="csv-roadmap">'+IC.dl+'CSV</button>' : '')+'</div>'+
  (claves.length
    ? claves.map(k => {
        const items = grupos[k], esActual = k === c.sprint.codigo;
        const sl = items.filter(s=>est(s).enSprint).reduce((a,s)=>a+slots(s),0);
        return '<div class="rms">'+
          '<div class="rmh">'+
            '<div class="btnrow">'+
              '<span class="code">'+(k==="sin_sprint"?"Sin agendar":esc(k))+'</span>'+
              (esActual?'<span class="tag tag-violet">en curso</span>':'')+
              (k==="sin_sprint"?'<span class="tag tag-amber">esperando triage</span>':'')+
            '</div>'+
            '<span class="s">'+items.length+' cuenta'+(items.length===1?"":"s")+(sl?' · '+nf(sl)+' slots':'')+'</span>'+
          '</div>'+
          items.map(s => {
            const d = ev(s), persona = (c.roster.find(p=>p.id===s.asignado)||{}).nombre;
            const dias = diasHasta(s.fechaEntrega);
            const tonoDia = dias == null ? "" : (dias < 0 ? "tag-red" : (dias <= 14 ? "tag-amber" : "tag-green"));
            return '<div class="rmi">'+
              '<span class="cs"><span class="t">'+esc(s.cuenta)+'</span>'+
                '<span class="rtags">'+(s.productos||[]).map(kk=>'<span class="tag tag-prod"><span class="pdot" style="background:'+prod(kk).color+'"></span>'+esc(prod(kk).abbr)+'</span>').join("")+'</span></span>'+
              '<span class="cs" style="min-width:120px"><span class="t">'+d.progreso+'%</span>'+
                '<span class="track"><i style="width:'+d.progreso+'%"></i></span>'+
                '<span class="s">'+d.nListos+' de '+d.nComp+' componentes</span></span>'+
              '<span class="cs"><span class="s">Activador: <b style="color:var(--ink)">'+esc(persona||"por asignar")+'</b></span>'+
                '<span class="s">'+esc(s.ruta && ruta(s.ruta) ? ruta(s.ruta).sub : "ruta por definir")+'</span></span>'+
              '<span class="cs">'+(s.fechaEntrega
                ? '<span class="tag '+tonoDia+'">'+esc(fechaCorta(s.fechaEntrega))+'</span><span class="s">'+(dias<0?Math.abs(dias)+" días tarde":dias+" días")+'</span>'
                : '<span class="s">sin fecha</span>')+'</span>'+
              '<span class="tag '+est(s).tag+'">'+esc(est(s).label)+'</span>'+
            '</div>';
          }).join("")+
        '</div>';
      }).join("")
    : '<div class="card"><div class="empty">Todavía no hay solicitudes. Cuando un AE levante la primera, aparecerá aquí con su sprint.</div></div>');
}
function csvRoadmap(){
  const c = cfg();
  const headers = ["Sprint","Cliente","AE","Estado","Activador","Productos","Slots","Nivel","Score","Ruta","Fecha de entrega","Progreso %","Componentes listos","Componentes marcados","Criterios cumplidos"];
  const filas = S.solicitudes.map(s => {
    const d = ev(s);
    return [s.sprint||"sin agendar", s.cuenta, s.ae||"", est(s).label,
      (c.roster.find(x=>x.id===s.asignado)||{}).nombre||"",
      (s.productos||[]).map(k=>prod(k).abbr).join(" | "), nf(slots(s)),
      d.nivel||"incompleto", d.score, (s.ruta&&ruta(s.ruta))?ruta(s.ruta).sub:"",
      s.fechaEntrega||"", d.progreso, d.nListos, d.nComp,
      evaluarCriterios(s).cumplidos.length+" de "+evaluarCriterios(s).aplican.length];
  });
  descargar("roadmap-activaciones.csv", aCSV(headers, filas));
}

/* ============================================================
   Proceso
   ============================================================ */
function vistaProcesos(){
  return '<div class="note note-violet"><div class="grow">Activaciones opera como área de soporte: el trabajo se solicita, se diagnostica y se agenda contra capacidad. Las ocho etapas son secuenciales — el orden es la regla, no una sugerencia.</div></div>'+
  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Flujo de activación</h2>'+
      '<span class="hint">Cada etapa nombra quién ejecuta, qué recibe, qué entrega y con qué herramienta</span></div></div>'+
    PROCESO.map((p,i) =>
      '<div class="stage">'+
        '<span class="stage-n">'+(i+1)+'</span>'+
        '<div>'+
          '<h3>'+esc(p.t)+'</h3>'+
          '<div class="who">'+esc(p.quien)+'</div>'+
          '<p>'+esc(p.d)+'</p>'+
          '<div class="sio">'+
            '<div><span class="lbl">Entrada</span><span class="s">'+esc(p.entrada)+'</span></div>'+
            '<div><span class="lbl">Salida</span><span class="s">'+esc(p.salida)+'</span></div>'+
          '</div>'+
          '<div class="stools">'+p.tools.map(t => t[1].charAt(0)==="#"
            ? '<button type="button" class="tl" data-vista="'+esc(t[1].slice(1))+'">'+IC.dot+esc(t[0])+'</button>'
            : '<a class="tl" href="'+esc(t[1])+'" target="_blank" rel="noopener noreferrer">'+IC.ext+esc(t[0])+'</a>').join("")+'</div>'+
        '</div>'+
      '</div>').join("")+
  '</div>'+
  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h3>Ciclo de vida de la cuenta en Vitally</h3>'+
      '<span class="hint">Activaciones es dueña de los tres primeros tramos</span></div></div>'+
    '<div class="card-pad">'+
      '<div class="chain">'+SEGMENTOS.map((s,i)=>
        '<span class="seg '+s.k+'">'+esc(s.n)+'</span>'+(i<SEGMENTOS.length-1?'<span class="arw">→</span>':'')).join("")+'</div>'+
      '<p class="s" style="margin:16px 0 0;max-width:74ch">El passdown a Customer Success ocurre al entrar a <strong style="color:var(--ink)">3- Adopting</strong>. Antes de eso la cuenta sigue ocupando slots del sprint de Activaciones, aunque el AE ya la considere entregada.</p>'+
    '</div>'+
  '</div>';
}

/* ============================================================
   Ajustes
   ============================================================ */
const TABS_AJUSTES = [
  { key:"equipo",      label:"Equipo y sprint" },
  { key:"componentes", label:"Componentes por producto" },
  { key:"complejidad", label:"Criterio de complejidad" },
  { key:"rutas",       label:"Rutas y criterios" },
  { key:"acceso",      label:"Accesos" }
];

function vistaAjustes(){
  return '<div class="tabs">'+TABS_AJUSTES.map(t=>
      '<button type="button" class="tab" data-tabaj="'+t.key+'" aria-pressed="'+(S.tabAjustes===t.key)+'">'+esc(t.label)+'</button>').join("")+
    '</div>'+
    (!puedeConfigurar() && S.tabAjustes !== "acceso"
      ? '<div class="note note-amber"><div class="grow">Estás con nivel <strong>'+esc((ROLES[rolAct()]||ROLES.ae).corto)+'</strong>: esta configuración es de consulta. Solo el HCS la edita.</div></div>'
      : '')+
    (S.tabAjustes === "componentes" ? ajComponentes() :
     S.tabAjustes === "complejidad" ? ajComplejidad() :
     S.tabAjustes === "rutas"       ? ajRutas() :
     S.tabAjustes === "acceso"      ? ajAcceso() : ajEquipo());
}

/* ---- Equipo y sprint ---- */
function ajEquipo(){
  const c = cfg(), puede = puedeConfigurar(), siguiente = sprintSiguiente(c.sprint);
  return '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Equipo de activaciones</h2>'+
      '<span class="hint">Los slots de cada persona son la capacidad del sprint</span></div></div>'+
    '<div class="card-pad stack">'+
      (puede
        ? '<form class="g3" data-act="add-persona">'+
            '<label class="field"><span class="lb">Nombre</span><input type="text" name="nombre" required placeholder="Nombre del activador"></label>'+
            '<label class="field"><span class="lb">Rol</span><input type="text" name="rol" placeholder="Activation Specialist"></label>'+
            '<label class="field"><span class="lb">Slots por sprint</span><input type="number" name="slots" min="0.5" max="12" step="0.5" value="'+c.slotsDefault+'"></label>'+
            '<div style="display:flex;align-items:end"><button class="btn btn-primary" type="submit">Agregar</button></div>'+
          '</form>'
        : '')+
      (c.roster.length
        ? '<div class="tw"><table><thead><tr><th>Activador</th><th>Rol</th><th>Slots</th><th></th></tr></thead><tbody>'+
          c.roster.map(p=>'<tr>'+
            '<td><span class="t">'+esc(p.nombre)+'</span></td>'+
            '<td class="s">'+esc(p.rol||"Activador")+'</td>'+
            '<td>'+(puede
              ? '<input type="number" min="0.5" max="12" step="0.5" value="'+(Number(p.slots)||c.slotsDefault)+'" data-act="set-slots" data-id="'+esc(p.id)+'" style="width:90px">'
              : '<span class="t">'+nf(Number(p.slots)||c.slotsDefault)+'</span>')+'</td>'+
            '<td>'+(puede?'<button class="btn btn-sm btn-ghost" data-act="del-persona" data-id="'+esc(p.id)+'">Quitar</button>':'')+'</td>'+
          '</tr>').join("")+'</tbody></table></div>'
        : '<div class="empty">Sin activadores registrados.</div>')+
    '</div>'+
  '</div>'+
  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Sprint</h2><span class="hint">Ciclos de dos semanas</span></div></div>'+
    '<div class="card-pad stack-sm">'+
      '<div class="rowbtw">'+
        '<div><span class="lbl">En curso</span><div style="font-size:17px;font-weight:600;color:var(--ink)">'+esc(c.sprint.codigo)+' · '+esc(rangoSprint(c.sprint))+'</div></div>'+
        (puede?'<button class="btn btn-outline" data-act="cerrar-sprint">Cerrar y abrir '+esc(siguiente.codigo)+'</button>':'')+
      '</div>'+
      '<p class="s" style="margin:0;max-width:76ch">Al cerrar el sprint, las cuentas entregadas salen de la carga y las que siguen abiertas se arrastran al nuevo sprint con su costo intacto.</p>'+
    '</div>'+
  '</div>'+
  '';
}

/* ---- Componentes por producto ---- */
function ajComponentes(){
  const puede = puedeConfigurar();
  const productos = cat().productos || {};
  const total = Object.keys(productos).reduce((a,k)=>a+(productos[k]||[]).length,0);
  return '<div class="note note-violet"><div class="grow">Estos son los <strong>procesos clave del journey de activación</strong> de cada producto, en sus fases reales. Su <strong>peso</strong> —derivado de la dificultad: Baja 1, Media 2, Alta 3— alimenta el score de complejidad, y su avance alimenta el dashboard de operación. '+total+' procesos en total.</div></div>'+
  PRODUCTOS.map(p => {
    const lista = productos[p.key] || [];
    const suma = lista.reduce((a,c)=>a+(Number(c.peso)||1),0);
    return '<div class="card">'+
      '<div class="card-head">'+
        '<div class="htxt"><h3 style="display:flex;align-items:center;gap:9px">'+
          '<span class="pdot" style="width:10px;height:10px;border-radius:99px;background:'+p.color+'"></span>'+esc(p.nombre)+'</h3>'+
          '<span class="hint">'+lista.length+' proceso'+(lista.length===1?"":"s")+' clave · peso acumulado '+nf(suma)+
          ' · '+(new Set(lista.map(function(c){return c.fase||"Sin fase"}))).size+' fases'+
          (p.vitally?' · Vitally: '+esc(p.vitally):'')+'</span></div>'+
      '</div>'+
      (lista.length
        ? '<div class="tw"><table><thead><tr><th>Proceso clave</th><th style="width:110px">Dificultad</th><th style="width:150px">Responsable</th><th style="width:110px">Peso</th><th style="width:90px"></th></tr></thead><tbody>'+
          (function(){
            const fases = [];
            lista.forEach(cc => { const f = cc.fase||"Sin fase"; if(!fases.includes(f)) fases.push(f); });
            return fases.map(fa => {
              const enFase = lista.filter(cc => (cc.fase||"Sin fase") === fa);
              return '<tr class="faserow"><td colspan="5"><span class="fasename">'+esc(fa)+'</span>'+
                '<span class="s"> · '+enFase.length+' · peso '+nf(enFase.reduce(function(a,c){return a+(Number(c.peso)||1)},0))+'</span></td></tr>'+
                enFase.map(cc=>'<tr>'+
                  '<td>'+(puede
                    ? '<input type="text" value="'+esc(cc.nombre)+'" data-act="comp-nombre" data-pk="'+esc(p.key)+'" data-c="'+esc(cc.id)+'">'
                    : '<span class="t">'+esc(cc.nombre)+'</span>')+
                    (cc.opcional?' <span class="tag">si aplica</span>':'')+
                    (cc.meta?'<div class="s" style="color:var(--green)">Meta: '+esc(cc.meta)+'</div>':'')+'</td>'+
                  '<td><span class="tag '+(cc.dificultad==="Alta"?"tag-red":(cc.dificultad==="Media"?"tag-amber":"tag-green"))+'">'+esc(cc.dificultad||"—")+'</span></td>'+
                  '<td class="s">'+esc(cc.responsable||"—")+(cc.tLapzo?'<br>AS '+esc(cc.tLapzo):'')+'</td>'+
                  '<td>'+(puede
                    ? '<input type="number" min="0.5" max="10" step="0.5" value="'+(Number(cc.peso)||1)+'" data-act="comp-peso" data-pk="'+esc(p.key)+'" data-c="'+esc(cc.id)+'" style="width:88px">'
                    : '<span class="t">'+nf(Number(cc.peso)||1)+'</span>')+'</td>'+
                  '<td>'+(puede?'<button class="btn btn-sm btn-ghost" data-act="comp-del" data-pk="'+esc(p.key)+'" data-c="'+esc(cc.id)+'">Quitar</button>':'')+'</td>'+
                '</tr>').join("");
            }).join("");
          })()+'</tbody></table></div>'
        : '<div class="empty">Sin componentes. '+(puede?'Agrega el primero abajo.':'')+'</div>')+
      (puede
        ? '<div class="card-pad"><form class="resform" data-act="comp-add" data-pk="'+esc(p.key)+'">'+
            '<label class="field"><span class="lb">Nuevo componente</span><input type="text" name="nombre" required placeholder="Ej. Creación de matrices de competencias"></label>'+
            '<label class="field"><span class="lb">Peso</span><input type="number" name="peso" min="0.5" max="10" step="0.5" value="1"></label>'+
            '<button class="btn" type="submit">Agregar</button>'+
          '</form></div>'
        : '')+
    '</div>';
  }).join("");
}

/* ---- Criterio de complejidad ---- */
function ajComplejidad(){
  const puede = puedeConfigurar(), w = pesos(), ns = niveles();
  const bloque = (k, label, desc) =>
    '<label class="field"><span class="lb">'+esc(label)+'</span>'+
      (puede
        ? '<input type="number" min="0" max="5" step="0.5" value="'+w[k]+'" data-act="peso" data-f="'+k+'">'
        : '<span class="t" style="font-size:17px">'+nf(w[k])+'</span>')+
      '<span class="hp">'+esc(desc)+'</span></label>';

  return '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Pesos del score</h2>'+
      '<span class="hint">Cambiarlos recalcula todos los scores al instante — el score se computa sobre las solicitudes cada vez que abres la vista</span></div></div>'+
    '<div class="card-pad">'+
      '<div class="g2">'+
        bloque("cuenta","Información de cuenta y contexto","Tamaño, licencias, número de productos y el contexto organizacional del kick-off. 0 lo apaga.")+
        bloque("semaforo","Preparación (semáforo)","Cuánto pesa que un módulo esté en amarillo o rojo en el diagnóstico.")+
        bloque("componente","Alcance de componentes","Multiplica el peso de cada componente marcado para activar.")+
        bloque("flags","Bloqueos y prerequisitos","Cuánto pesa un bloqueo detectado, como falta de descriptivos de puesto.")+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Bandas de complejidad</h2>'+
      '<span class="hint">Del score al costo en slots. Calíbralas con activaciones reales: el rango del score cambia si mueves los pesos.</span></div></div>'+
    '<div class="tw"><table><thead><tr><th>Score hasta</th><th>Nivel</th><th>Cuesta</th></tr></thead><tbody>'+
      ns.map((n,i)=>'<tr>'+
        '<td>'+(puede && i < ns.length-1
          ? '<input type="number" min="1" max="500" step="1" value="'+n.max+'" data-act="nivel-max" data-i="'+i+'" style="width:100px">'
          : '<span class="t">'+(n.max>=999?"sin límite":n.max)+'</span>')+'</td>'+
        '<td><span class="tag '+(TONO_NIVEL[n.nivel]||"tag")+'">'+esc(n.nivel)+'</span></td>'+
        '<td>'+(puede
          ? '<input type="number" min="0.5" max="6" step="0.5" value="'+n.slots+'" data-act="nivel-slots" data-i="'+i+'" style="width:100px">'
          : '<span class="t">'+nf(n.slots)+'</span>')+' slot'+(n.slots===1?"":"s")+'</td>'+
      '</tr>').join("")+
    '</tbody></table></div>'+
    '<div class="card-pad"><p class="s" style="margin:0;max-width:78ch">El score suma cinco partes: <strong>cuenta</strong> (tamaño, licencias y número de productos, de Vitally), <strong>contexto</strong> (madurez de RH, sponsor, administradores, proyectos en competencia y carga de datos, del kick-off), <strong>preparación</strong> (semáforo por módulo), <strong>alcance</strong> (peso de los componentes marcados) y <strong>bloqueos</strong>. Una solicitud sin diagnóstico completo se cuesta como 1 slot por defecto y aparece marcada como incompleta.</p></div>'+
  '</div>';
}

/* ---- Accesos ----
   El Hub solo administra el NIVEL OPERATIVO (AE / AS / HCS) en la tabla
   hub_usuario_rol. Las cuentas y el acceso al portal se administran en
   Portal Lapzo → Administrar accesos: desde aquí no se crean usuarios. */
function ajAcceso(){
  const puede = puedeConfigurar();
  const R = S.roles || { personas:[], candidatos:[] };
  const personas = R.personas || [];
  const candidatos = R.candidatos || [];
  const rolDet = ROLES[S.rol] || ROLES.ae;
  return '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Cómo funciona el acceso</h2>'+
      '<span class="hint">Tu nivel lo determina la base al abrir el Hub, no se elige</span></div>'+
      '<span class="tag tag-violet">Tú: '+esc(rolDet.label)+'</span>'+
    '</div>'+
    '<div class="card-pad stack-sm">'+
      '<p style="margin:0;max-width:78ch">Para entrar al Hub hacen falta dos cosas: acceso al módulo '+
      '<strong style="color:var(--ink)">Hub de Activaciones</strong> en Portal Lapzo, y un nivel operativo '+
      'aquí. El nivel se guarda en la base y las políticas de Supabase lo aplican en cada consulta, '+
      'así que no se puede falsear desde la pantalla.</p>'+
      '<div class="tw"><table><thead><tr><th>Nivel en el Hub</th><th>Qué puede hacer</th></tr></thead><tbody>'+
        '<tr><td><span class="tag">AE</span> Account Executive</td>'+
          '<td>Levantar solicitudes y consultar el roadmap con el avance de sus clientes. No ve carga, productos ni ajustes.</td></tr>'+
        '<tr><td><span class="tag tag-violet">AS</span> Activation Specialist</td>'+
          '<td>Ve todo. Diagnostica, marca componentes, asigna sprint y activador, y cura los recursos. No configura componentes, pesos, equipo ni niveles.</td></tr>'+
        '<tr><td><span class="tag tag-green">HCS</span> Head of Customer Success</td>'+
          '<td>Todo lo del AS más la configuración completa y los niveles del Hub.</td></tr>'+
      '</tbody></table></div>'+
      '<div class="note note-violet"><div class="grow">Quien sea <strong>superadministrador de Portal Lapzo</strong> '+
      'entra al Hub como HCS. Esa regla vive en la base, no en esta pantalla.</div></div>'+
    '</div>'+
  '</div>'+
  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Niveles del equipo</h2>'+
      '<span class="hint">'+personas.length+' persona'+(personas.length===1?"":"s")+' con nivel en el Hub</span></div></div>'+
    (puede
      ? (candidatos.length
          ? '<div class="card-pad"><form class="g3" data-act="add-nivel-hub">'+
              '<label class="field" style="grid-column:span 2"><span class="lb">Persona del portal</span>'+
                '<select name="user_id" required>'+
                  '<option value="">Elige a quién dar acceso…</option>'+
                  candidatos.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre)+' · '+esc(c.email)+'</option>').join("")+
                '</select></label>'+
              '<label class="field"><span class="lb">Nivel</span><select name="nivel">'+
                '<option value="ae">AE — levanta solicitudes</option>'+
                '<option value="as">AS — opera</option>'+
                '<option value="hcs">HCS — configura</option>'+
              '</select></label>'+
              '<div style="display:flex;align-items:end"><button class="btn btn-primary" type="submit">Dar acceso</button></div>'+
            '</form>'+
            '<p class="s" style="margin:10px 0 0">Solo aparecen personas que ya existen en Portal Lapzo. '+
            'Si falta alguien: primero crea o habilita al usuario desde Portal Lapzo, después podrás asignarle un nivel aquí.</p>'+
          '</div>'
          : '<div class="card-pad"><div class="note note-amber"><div class="grow">Todas las personas activas de '+
            'Portal Lapzo ya tienen un nivel en el Hub. Para agregar a alguien nuevo: primero crea o habilita al '+
            'usuario desde Portal Lapzo, después podrás asignarle un nivel aquí.</div></div></div>')
      : '')+
    (personas.length
      ? '<div class="tw"><table><thead><tr><th>Persona</th><th>Nivel</th><th>Estado</th><th></th></tr></thead><tbody>'+
        personas.map(p=>'<tr'+(p.activo?'':' style="opacity:.55"')+'>'+
          '<td><div class="cs"><span class="t">'+esc(p.nombre)+'</span><span class="s">'+esc(p.email)+'</span></div></td>'+
          '<td>'+(puede
            ? '<select data-act="set-nivel" data-id="'+esc(p.id)+'" style="width:auto">'+
              ["ae","as","hcs"].map(r=>'<option value="'+r+'"'+(p.nivel===r?" selected":"")+'>'+esc(ROLES[r].corto)+'</option>').join("")+'</select>'
            : '<span class="tag '+(p.nivel==="hcs"?"tag-green":(p.nivel==="as"?"tag-violet":"tag"))+'">'+esc(ROLES[p.nivel]?ROLES[p.nivel].corto:p.nivel)+'</span>')+'</td>'+
          '<td class="s">'+(p.activo?"Activo":"Sin acceso")+'</td>'+
          '<td>'+(puede
            ? '<button class="btn btn-sm btn-ghost" data-act="'+(p.activo?"quitar-nivel-hub":"reactivar-nivel-hub")+'" data-id="'+esc(p.id)+'">'+
              (p.activo?"Quitar acceso":"Reactivar")+'</button>'
            : '')+'</td>'+
        '</tr>').join("")+'</tbody></table></div>'
      : '<div class="empty">Nadie tiene nivel en el Hub todavía.</div>')+
  '</div>';
}

/* ---- Rutas de implementación y criterios de activación ---- */
function ajRutas(){
  const usos = {};
  RUTAS.forEach(r => { usos[r.id] = S.solicitudes.filter(s => s.ruta === r.id).length; });
  return '<div class="note note-violet"><div class="grow">Las cuatro rutas TaaS deciden qué módulo va primero y en qué mes arranca cada uno. El hub sugiere una a partir del diagnóstico, siguiendo el mismo orden de reglas del instrumento de kick-off, pero el AS puede elegir otra.</div>'+
    '<a class="btn btn-sm" href="https://success-lapzo.github.io/rutasimplementacionlapzo/" target="_blank" rel="noopener noreferrer">'+IC.ext+'Ver rutas</a></div>'+
  RUTAS.map(r => {
    const mods = Object.keys(r.orden).sort(function(a,b){ return r.orden[a]-r.orden[b]; });
    return '<div class="card">'+
      '<div class="card-head">'+
        '<div class="htxt"><h3>'+esc(r.nombre)+'</h3><span class="hint">'+esc(r.sub)+'</span></div>'+
        '<span class="tag '+(usos[r.id]?"tag-violet":"tag")+'">'+usos[r.id]+' cuenta'+(usos[r.id]===1?"":"s")+'</span>'+
      '</div>'+
      '<div class="card-pad stack-sm">'+
        '<p style="margin:0;max-width:80ch">'+esc(r.desc)+'</p>'+
        '<div><span class="lbl">Cuándo se elige</span><div class="s">'+esc(r.criterio)+'</div></div>'+
        '<div class="ordgrid">'+mods.map(function(pk){
          return '<div class="ordcard">'+
            '<span class="ordmes">M'+r.orden[pk]+'</span>'+
            '<span class="grow"><span class="prohead"><span class="pdot" style="background:'+prod(pk).color+'"></span>'+
              '<span class="t">'+esc(prod(pk).nombre)+'</span></span>'+
              '<span class="s">'+esc(r.hitos[pk]||"")+'</span></span>'+
          '</div>';
        }).join("")+'</div>'+
      '</div>'+
    '</div>';
  }).join("")+
  '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Criterios de activación</h2>'+
      '<span class="hint">Una cuenta se considera activa, y puede pasar a los AEs, cuando cumple '+CRITERIOS_MINIMOS+' de los criterios de sus módulos contratados</span></div></div>'+
    '<div class="tw"><table><thead><tr><th>Producto</th><th>Usuario</th><th>Criterio</th><th>Plazo</th><th>Cumplen</th></tr></thead><tbody>'+
      CRITERIOS.map(function(c){
        const aplica = S.solicitudes.filter(function(s){ return (s.productos||[]).includes(c.producto) && est(s).activa; });
        const ok = aplica.filter(function(s){ return (s.criterios||{})[c.id]; }).length;
        return '<tr>'+
          '<td><span class="tag tag-prod"><span class="pdot" style="background:'+prod(c.producto).color+'"></span>'+esc(prod(c.producto).abbr)+'</span></td>'+
          '<td class="s">'+esc(c.usuario)+'</td>'+
          '<td><span class="t">'+esc(c.texto)+'</span>'+(c.obligatorio?' <span class="tag tag-red">obligatorio</span>':'')+
            (c.nota?'<div class="s">'+esc(c.nota)+'</div>':'')+'</td>'+
          '<td class="s">'+esc(c.plazo)+'</td>'+
          '<td>'+(aplica.length?'<span class="tag '+(ok===aplica.length?"tag-green":(ok?"tag-amber":"tag"))+'">'+ok+' de '+aplica.length+'</span>':'<span class="s">—</span>')+'</td>'+
        '</tr>';
      }).join("")+
    '</tbody></table></div>'+
  '</div>';
}
