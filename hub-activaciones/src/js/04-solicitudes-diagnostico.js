"use strict";

/* ============================================================
   PARTE 4 — Solicitudes, información de cuenta y diagnóstico
   ============================================================ */

const FILTROS = [
  { key:"abiertas",  label:"Abiertas" },
  { key:"sin_diag",  label:"Sin diagnóstico" },
  { key:"en_sprint", label:"En sprint" },
  { key:"bloqueada", label:"Bloqueadas" },
  { key:"entregada", label:"Entregadas" },
  { key:"todas",     label:"Todas" }
];

function vistaSolicitudes(){
  const esAE = rolAct() === "ae";
  const c = cfg(), cap = capacidad();
  const abiertas = S.solicitudes.filter(s=>est(s).activa);
  const sinDiag = abiertas.filter(s=>!ev(s).completo);
  const entregadas = S.solicitudes.filter(s=>s.estado==="entregada");

  let lista;
  switch(S.filtro){
    case "sin_diag":  lista = sinDiag; break;
    case "en_sprint": lista = S.solicitudes.filter(s=>s.estado==="en_sprint"); break;
    case "bloqueada": lista = S.solicitudes.filter(s=>s.estado==="bloqueada"); break;
    case "entregada": lista = entregadas; break;
    case "todas":     lista = S.solicitudes; break;
    default:          lista = abiertas;
  }

  return (esAE ? formularioAE() : "") +
  '<div class="kpis">'+
    kpi("Abiertas", abiertas.length, "en la bandeja", "", "#6B3FCC")+
    kpi("Sin diagnóstico", sinDiag.length, "no se pueden costear", sinDiag.length?"warn":"", "#04949D")+
    (esAE
      ? kpi("En el sprint", cap.enSprint.length, esc(c.sprint.codigo), "", "#8B55FE")
      : kpi("En el sprint", cap.enSprint.length, esc(c.sprint.codigo), "", "#8B55FE"))+
    (esAE
      ? kpi("Entregadas", entregadas.length, "histórico", "", "#1E7E34")
      : kpi("Slots comprometidos", nf(cap.usado), "de "+nf(cap.total)+" disponibles", tonoCap(cap.libre,cap.total), "#1E7E34"))+
  '</div>'+
  '<div class="card">'+
    '<div class="card-head">'+
      '<div class="htxt"><h2>'+(esAE?"Solicitudes del equipo":"Bandeja de triage")+'</h2>'+
      '<span class="hint">'+(esAE
        ? "El diagnóstico y la asignación los hace Activaciones. Aquí ves el avance."
        : "Información de cuenta desde Vitally, diagnóstico de kick-off y componentes definen el costo en slots.")+'</span></div>'+
      '<div class="pills">'+FILTROS.map(f=>
        '<button type="button" class="pl" data-filtro="'+f.key+'" aria-pressed="'+(S.filtro===f.key)+'">'+esc(f.label)+'</button>').join("")+
      '</div>'+
    '</div>'+
    (lista.length ? lista.map((s,i)=>fila(s,i+1,esAE,c)).join("") : '<div class="empty">Nada en este filtro.</div>')+
  '</div>';
}

function fila(s, n, esAE, c){
  const e = est(s), d = ev(s);
  const abierto = S.abierta === s.id;
  const persona = (c.roster.find(p=>p.id===s.asignado)||{}).nombre;
  const maxScore = niveles()[niveles().length-2] ? niveles()[niveles().length-2].max * 1.4 : 30;
  const pct = Math.min(100, Math.round((d.score / maxScore) * 100));
  return '<button type="button" class="rrow" data-act="abrir" data-id="'+esc(s.id)+'" aria-expanded="'+abierto+'">'+
    '<span class="rnum">'+n+'</span>'+
    '<span class="rmain">'+
      '<span class="rtitle">'+esc(s.cuenta)+'</span>'+
      '<span class="rdesc">'+esc(s.contexto || s.tipo || "")+'</span>'+
      '<span class="rtags">'+
        (s.productos||[]).map(k=>'<span class="tag tag-prod"><span class="pdot" style="background:'+prod(k).color+'"></span>'+esc(prod(k).abbr)+'</span>').join("")+
        (d.flagsActivos.length ? '<span class="tag tag-red">'+d.flagsActivos.length+' bloqueo'+(d.flagsActivos.length===1?"":"s")+'</span>' : '')+
        (d.nComp ? '<span class="tag '+(d.progreso===100?"tag-green":"tag")+'">'+d.progreso+'% componentes</span>' : '')+
      '</span>'+
    '</span>'+
    '<span class="rscore">'+
      '<span class="n">'+d.score+'</span>'+
      '<span class="track"><i style="width:'+pct+'%"></i></span>'+
      '<span class="tag '+(d.completo?d.tono:"tag-amber")+'">'+esc(d.nivel || "incompleto")+'</span>'+
    '</span>'+
    '<span class="rmeta">'+
      '<span><b>'+nf(slots(s))+'</b> slot'+(slots(s)===1?"":"s")+'</span>'+
      '<span>'+esc(s.sprint || "sin agendar")+'</span>'+
      '<span>'+esc(s.fechaEntrega ? "entrega "+fechaCorta(s.fechaEntrega) : "sin fecha")+'</span>'+
    '</span>'+
    '<span class="rctx">'+
      '<span class="tag '+e.tag+'">'+esc(e.label)+'</span>'+
      '<span class="s">'+esc(persona || (s.ae ? "AE "+s.ae : "—"))+'</span>'+
    '</span>'+
    '<span class="chev">'+IC.chev+'</span>'+
  '</button>'+
  (abierto ? '<div class="rdetail">'+(esAE ? detalleAE(s,c,d) : detalleAS(s,c,d))+'</div>' : "");
}

/* ---- Detalle para AE: consulta de avance ---- */
function detalleAE(s, c, d){
  const persona = (c.roster.find(p=>p.id===s.asignado)||{}).nombre;
  const prods = (s.productos||[]);
  return '<div class="stack">'+
    '<div class="g3">'+
      '<div><span class="lbl">Estado</span><div class="dv"><span class="tag '+est(s).tag+'">'+esc(est(s).label)+'</span></div></div>'+
      '<div><span class="lbl">Sprint</span><div class="dv">'+esc(s.sprint||"por agendar")+'</div></div>'+
      '<div><span class="lbl">Activador</span><div class="dv">'+esc(persona||"por asignar")+'</div></div>'+
      '<div><span class="lbl">Día de entrega</span><div class="dv">'+esc(fechaCorta(s.fechaEntrega))+'</div></div>'+
    '</div>'+
    '<div>'+
      '<span class="lbl">Avance por producto</span>'+
      (prods.length
        ? '<div class="progrid">'+prods.map(pk => {
            const catalogo = comps(pk), mapa = (s.componentes||{})[pk] || {};
            const propios = catalogo.filter(cc => mapa[cc.id] && COMP_ESTADOS[mapa[cc.id]].cuenta);
            const listos = propios.filter(cc => mapa[cc.id]==="listo").length;
            const curso = propios.filter(cc => mapa[cc.id]==="curso");
            const pct = propios.length ? Math.round(listos/propios.length*100) : 0;
            return '<div class="procard">'+
              '<div class="prohead"><span class="pdot" style="background:'+prod(pk).color+'"></span>'+
                '<span class="t">'+esc(prod(pk).nombre)+'</span><span class="pct">'+pct+'%</span></div>'+
              '<span class="track"><i style="width:'+pct+'%;background:'+prod(pk).color+'"></i></span>'+
              '<span class="s">'+(propios.length ? listos+" de "+propios.length+" componentes listos" : "sin componentes marcados")+'</span>'+
              (curso.length ? '<div class="rtags">'+curso.map(cc=>'<span class="tag tag-violet">'+esc(cc.nombre)+'</span>').join("")+'</div>' : '')+
            '</div>';
          }).join("")+'</div>'
        : '<div class="s">Sin productos.</div>')+
    '</div>'+
    (s.ruta && ruta(s.ruta)
      ? '<div><span class="lbl">Ruta de implementación</span>'+
        '<div class="dv">'+esc(ruta(s.ruta).nombre)+'</div>'+
        '<span class="s">'+esc(ruta(s.ruta).sub)+' — '+esc(ruta(s.ruta).desc)+'</span></div>'
      : '')+
    (function(){ const cr = evaluarCriterios(s); if(!cr.aplican.length) return "";
      return '<div><span class="lbl">Criterios de activación</span>'+
        '<div class="dv">'+cr.cumplidos.length+' de '+cr.aplican.length+
        ' <span class="tag '+(cr.activa?"tag-green":"tag-amber")+'">'+(cr.activa?"cuenta activa":"en activación")+'</span></div>'+
        '<span class="s">La cuenta pasa a Customer Success al cumplir '+CRITERIOS_MINIMOS+' criterios.</span></div>'; })()+
    '<p class="s" style="margin:0;max-width:76ch">Si el compromiso con el cliente cambió, dilo en la solicitud en lugar de mover la fecha por tu cuenta: la fecha de entrega la fija Activaciones contra la capacidad del sprint.</p>'+
  '</div>';
}

/* ---- Detalle para AS/HCS ---- */
function detalleAS(s, c, d){
  return '<div class="stack">'+
    bloqueCuenta(s)+
    bloqueDiagnostico(s, d)+
    bloqueRuta(s)+
    bloqueComponentes(s, d)+
    bloqueCriterios(s)+
    bloqueResultado(s, c, d)+
  '</div>';
}

/* 1 — Información de cuenta (Vitally) */
function bloqueCuenta(s){
  const info = s.cuentaInfo;
  const cargando = S.refrescando === s.id;
  const cabecera =
    '<div class="blkhead">'+
      '<div class="htxt"><h3>Información de cuenta</h3>'+
        '<span class="hint">'+(info && info._leidoEn
          ? "Leída de Vitally el "+fechaCorta(info._leidoEn)
          : "Sin datos de Vitally adjuntos")+'</span></div>'+
      '<div class="btnrow">'+
        (info && info._url ? '<a class="btn btn-sm" href="'+esc(info._url)+'" target="_blank" rel="noopener noreferrer">'+IC.ext+'Ver en Vitally</a>' : '')+
        (S.mcp ? '<button class="btn btn-sm btn-outline" data-act="refrescar-cuenta" data-id="'+esc(s.id)+'"'+(cargando?" disabled":"")+'>'+
          (cargando?'<span class="spin"></span>':IC.refresh)+'Actualizar</button>' : '')+
      '</div>'+
    '</div>';

  if(!info){
    return '<div class="blk">'+cabecera+
      '<div class="note note-amber"><div class="grow">Esta solicitud no tiene cuenta de Vitally adjunta. '+
      (S.mcp ? 'Pulsa «Actualizar» para buscarla por nombre.' : 'El conector de Vitally no está disponible en Portal Lapzo.')+
      ' Sin ella el score de cuenta queda en cero.</div></div></div>';
  }

  return '<div class="blk">'+cabecera+
    VT_GRUPOS.map(g => {
      const campos = VT_CAMPOS.filter(cc => cc.grupo === g.key);
      return '<div class="vgrp">'+
        '<span class="lbl">'+esc(g.titulo)+'</span>'+
        '<div class="vtp">'+campos.map(cc => {
          const raw = info[cc.key];
          let val;
          if(raw == null || raw === "" || (Array.isArray(raw) && !raw.length)) val = '<span class="sindato">sin dato</span>';
          else if(cc.tipo === "bool") val = raw ? "Sí" : "No";
          else if(cc.tipo === "pct")  val = Math.round(Number(raw))+"%";
          else if(cc.tipo === "money") val = money(raw);
          else if(cc.tipo === "lista") val = (Array.isArray(raw)?raw:[raw]).map(x=>'<span class="tag tag-prod">'+esc(x)+'</span>').join(" ");
          else if(cc.tipo === "url")  val = '<a href="'+esc(raw)+'" target="_blank" rel="noopener noreferrer">'+esc(String(raw).replace(/^https?:\/\//,""))+'</a>';
          else if(cc.tipo === "num")  val = Number(raw).toLocaleString("es-MX");
          else val = esc(raw);
          return '<div><span class="k">'+esc(cc.label)+'</span><span class="v">'+val+'</span></div>';
        }).join("")+'</div>'+
      '</div>';
    }).join("")+
  '</div>';
}

/* 2 — Diagnóstico de activación */
function bloqueDiagnostico(s, d){
  const diag = s.diagnostico || {};
  const ctx = diag.contexto || {};
  const porMod = diag.porModulo || {};
  const flags = diag.flags || {};
  const prods = (s.productos||[]);
  const flagsAplicables = FLAGS.filter(f => prods.includes(f.producto));

  return '<div class="blk">'+
    '<div class="blkhead"><div class="htxt"><h3>Diagnóstico de activación</h3>'+
      '<span class="hint">Lo que el AS levanta en el kick-off. No viene de Vitally: sale de la conversación con el cliente.</span></div>'+
      '<span class="tag '+(d.faltan.contexto||d.faltan.semaforo?"tag-amber":"tag-green")+'">'+
        (d.faltan.contexto||d.faltan.semaforo ? "incompleto" : "completo")+'</span>'+
    '</div>'+

    '<span class="lbl">Contexto organizacional</span>'+
    '<div class="dg">'+CONTEXTO.map(f =>
      '<label class="field"><span class="lb">'+esc(f.label)+'</span>'+
        '<select data-act="ctx" data-id="'+esc(s.id)+'" data-f="'+esc(f.key)+'">'+
          '<option value="">Sin evaluar</option>'+
          f.ops.map(o=>'<option value="'+o[1]+'"'+(String(ctx[f.key])===String(o[1])?" selected":"")+'>'+esc(o[0])+'</option>').join("")+
        '</select></label>').join("")+
    '</div>'+

    '<hr class="sep">'+
    '<span class="lbl">Semáforo de madurez por producto contratado</span>'+
    (prods.length
      ? '<div class="semagrid">'+prods.map(pk => {
          const sm = (porMod[pk]||{}).semaforo || "";
          return '<div class="semacard">'+
            '<div class="prohead"><span class="pdot" style="background:'+prod(pk).color+'"></span>'+
              '<span class="t">'+esc(prod(pk).nombre)+'</span></div>'+
            '<div class="semabtns">'+Object.keys(SEMAFOROS).map(k =>
              '<button type="button" class="semabtn '+k+'" data-act="sema" data-id="'+esc(s.id)+'" data-pk="'+esc(pk)+'" data-v="'+k+'" aria-pressed="'+(sm===k)+'">'+
                esc(SEMAFOROS[k].label)+' <b>+'+SEMAFOROS[k].puntos+'</b></button>').join("")+
            '</div>'+
            '<input type="text" class="notainl" placeholder="Nota del diagnóstico (opcional)" value="'+esc((porMod[pk]||{}).notas||"")+'" data-act="sema-nota" data-id="'+esc(s.id)+'" data-pk="'+esc(pk)+'">'+
          '</div>';
        }).join("")+'</div>'
      : '<div class="s">Esta solicitud no tiene productos seleccionados.</div>')+

    (flagsAplicables.length
      ? '<hr class="sep"><span class="lbl">Bloqueos y prerequisitos</span>'+
        '<div class="flaglist">'+flagsAplicables.map(f =>
          '<label class="flagrow'+(flags[f.key]?" on":"")+'">'+
            '<input type="checkbox" data-act="flag" data-id="'+esc(s.id)+'" data-f="'+esc(f.key)+'"'+(flags[f.key]?" checked":"")+'>'+
            '<span class="grow"><span class="t">'+esc(f.label)+'</span>'+
              '<span class="s">'+esc(prod(f.producto).abbr)+' · '+esc(f.aviso)+'</span></span>'+
            '<span class="tag '+(f.tono==="red"?"tag-red":"tag-amber")+'">+'+f.puntos+'</span>'+
          '</label>').join("")+'</div>'+
        (d.flagsActivos.length
          ? d.flagsActivos.map(f=>'<div class="note note-'+(f.tono==="red"?"red":"amber")+'"><div class="grow"><strong>'+esc(prod(f.producto).abbr)+' — '+esc(f.label)+'.</strong> '+esc(f.aviso)+'</div></div>').join("")
          : '')
      : '')+
  '</div>';
}

/* 3 — Componentes a activar, agrupados por fase del journey */
function bloqueComponentes(s, d){
  const prods = (s.productos||[]);
  const sel = s.componentes || {};
  return '<div class="blk">'+
    '<div class="blkhead"><div class="htxt"><h3>Componentes a activar</h3>'+
      '<span class="hint">Los procesos clave del journey de cada producto, en sus fases reales. Marca qué se activa y en qué va: el alcance suma al score y el avance alimenta el dashboard.</span></div>'+
      '<span class="tag '+(d.nComp?"tag-violet":"tag-amber")+'">'+d.nComp+' marcado'+(d.nComp===1?"":"s")+' · '+d.progreso+'% listo</span>'+
    '</div>'+
    (prods.length
      ? prods.map(pk => {
          const catalogo = comps(pk), mapa = sel[pk] || {};
          if(!catalogo.length){
            return '<div class="compgrp"><div class="prohead"><span class="pdot" style="background:'+prod(pk).color+'"></span>'+
              '<span class="t">'+esc(prod(pk).nombre)+'</span></div>'+
              '<div class="note note-amber" style="margin-top:8px"><div class="grow">Sin componentes en el catálogo. '+
              (puedeConfigurar()?'Configúralos en Ajustes → Componentes.':'El HCS los define en Ajustes → Componentes.')+'</div></div></div>';
          }
          const marcados = catalogo.filter(cc => mapa[cc.id] && COMP_ESTADOS[mapa[cc.id]].cuenta);
          const listos = marcados.filter(cc => mapa[cc.id]==="listo").length;
          const pct = marcados.length ? Math.round(listos/marcados.length*100) : 0;
          const fases = [];
          catalogo.forEach(cc => { if(!fases.includes(cc.fase||"Sin fase")) fases.push(cc.fase||"Sin fase"); });
          return '<div class="compgrp">'+
            '<div class="prohead"><span class="pdot" style="background:'+prod(pk).color+'"></span>'+
              '<span class="t">'+esc(prod(pk).nombre)+'</span>'+
              '<span class="pct">'+pct+'%</span>'+
              '<button type="button" class="btn btn-sm btn-ghost" data-act="comp-todos" data-id="'+esc(s.id)+'" data-pk="'+esc(pk)+'">'+
                (marcados.length===catalogo.filter(c=>!c.opcional).length?"Quitar todos":"Marcar journey completo")+'</button>'+
            '</div>'+
            '<span class="track"><i style="width:'+pct+'%;background:'+prod(pk).color+'"></i></span>'+
            '<span class="s">'+marcados.length+' de '+catalogo.length+' procesos del journey · '+listos+' listos</span>'+
            fases.map(fa => {
              const enFase = catalogo.filter(cc => (cc.fase||"Sin fase") === fa);
              const mFase = enFase.filter(cc => mapa[cc.id] && COMP_ESTADOS[mapa[cc.id]].cuenta);
              const lFase = mFase.filter(cc => mapa[cc.id]==="listo").length;
              return '<div class="fasegrp">'+
                '<div class="fasehead">'+
                  '<span class="fasename">'+esc(fa)+'</span>'+
                  '<button type="button" class="fasebtn" data-act="comp-fase" data-id="'+esc(s.id)+'" data-pk="'+esc(pk)+'" data-fase="'+esc(fa)+'">'+
                    (mFase.length===enFase.filter(c=>!c.opcional).length && mFase.length ? "quitar fase" : "marcar fase")+'</button>'+
                  '<span class="fasecount">'+(mFase.length?lFase+"/"+mFase.length:"—")+'</span>'+
                '</div>'+
                '<div class="complist">'+enFase.map(cc => {
                  const e = mapa[cc.id] || "";
                  const meta = [cc.dificultad?("dificultad "+cc.dificultad):null, cc.responsable, cc.tLapzo?("AS "+cc.tLapzo):null]
                    .filter(Boolean).join(" · ");
                  return '<div class="comprow'+(COMP_ESTADOS[e]&&COMP_ESTADOS[e].cuenta?" on":"")+'"'+(cc.desc?' title="'+esc(cc.desc)+'"':'')+'>'+
                    '<span class="grow">'+
                      '<span class="t">'+esc(cc.nombre)+
                        (cc.opcional?' <span class="tag">si aplica</span>':'')+
                        (cc.dificultad==="Alta"?' <span class="tag tag-red">Alta</span>':'')+'</span>'+
                      '<span class="s">'+esc(meta)+' · peso '+nf(Number(cc.peso)||1)+'</span>'+
                      (cc.meta?'<span class="s" style="color:var(--green)">Meta: '+esc(cc.meta)+'</span>':'')+
                    '</span>'+
                    '<div class="segm">'+Object.keys(COMP_ESTADOS).map(k =>
                      '<button type="button" data-act="comp" data-id="'+esc(s.id)+'" data-pk="'+esc(pk)+'" data-c="'+esc(cc.id)+'" data-v="'+k+'" aria-pressed="'+(e===k)+'">'+
                        esc(COMP_ESTADOS[k].label)+'</button>').join("")+'</div>'+
                  '</div>';
                }).join("")+'</div>'+
              '</div>';
            }).join("")+
          '</div>';
        }).join("")
      : '<div class="s">Sin productos seleccionados.</div>')+
  '</div>';
}

/* Ruta de implementación */
function bloqueRuta(s){
  const sug = sugerirRuta(s);
  const actual = s.ruta ? ruta(s.ruta) : null;
  const prods = (s.productos||[]).filter(k=>k!=="plat");
  return '<div class="blk">'+
    '<div class="blkhead"><div class="htxt"><h3>Ruta de implementación</h3>'+
      '<span class="hint">Define qué módulo va primero y en qué mes arranca cada uno. Son las cuatro rutas TaaS.</span></div>'+
      (actual?'<span class="tag tag-violet">'+esc(actual.sub)+'</span>':'<span class="tag tag-amber">sin ruta</span>')+
    '</div>'+
    (sug && (!s.ruta || s.ruta !== sug.id)
      ? '<div class="note note-violet"><div class="grow"><strong>El diagnóstico sugiere '+esc(ruta(sug.id).sub)+'.</strong> '+esc(sug.por)+'</div>'+
        '<button class="btn btn-sm" data-act="usar-ruta" data-id="'+esc(s.id)+'" data-r="'+esc(sug.id)+'">Usar esta ruta</button></div>'
      : '')+
    '<div class="rutagrid">'+RUTAS.map(r => {
      const on = s.ruta === r.id;
      return '<button type="button" class="rutacard'+(on?" on":"")+'" data-act="ruta" data-id="'+esc(s.id)+'" data-r="'+esc(r.id)+'" aria-pressed="'+on+'">'+
        '<span class="rutasub">'+esc(r.sub)+'</span>'+
        '<span class="rutanom">'+esc(r.nombre)+'</span>'+
        '<span class="s">'+esc(r.criterio)+'</span>'+
      '</button>';
    }).join("")+'</div>'+
    (actual
      ? '<p class="s" style="margin:0;max-width:78ch">'+esc(actual.desc)+'</p>'+
        (prods.length
          ? '<div class="ordgrid">'+prods.slice().sort((a,b)=>(actual.orden[a]||99)-(actual.orden[b]||99)).map(pk =>
              '<div class="ordcard">'+
                '<span class="ordmes">M'+(actual.orden[pk] || "?")+'</span>'+
                '<span class="grow"><span class="prohead"><span class="pdot" style="background:'+prod(pk).color+'"></span>'+
                  '<span class="t">'+esc(prod(pk).nombre)+'</span></span>'+
                  '<span class="s">'+esc(actual.hitos[pk] || "sin hito definido en esta ruta")+'</span></span>'+
              '</div>').join("")+'</div>'
          : '')
      : '');
}

/* Criterios de activación — la puerta del passdown */
function bloqueCriterios(s){
  const c = evaluarCriterios(s);
  if(!c.aplican.length){
    return '<div class="blk"><div class="blkhead"><div class="htxt"><h3>Criterios de activación</h3>'+
      '<span class="hint">Sin productos con criterios definidos.</span></div></div></div>';
  }
  return '<div class="blk">'+
    '<div class="blkhead"><div class="htxt"><h3>Criterios de activación</h3>'+
      '<span class="hint">Una cuenta se considera activa, y puede pasar a los AEs, cuando cumple '+CRITERIOS_MINIMOS+
      ' de los criterios de sus módulos contratados. La carga del 50% de la base es obligatoria.</span></div>'+
      '<span class="tag '+(c.activa?"tag-green":"tag-amber")+'">'+c.cumplidos.length+' de '+c.aplican.length+
      (c.activa?" · activa":" · no activa")+'</span>'+
    '</div>'+
    '<div class="critlist">'+c.aplican.map(cc => {
      const on = !!(s.criterios||{})[cc.id];
      return '<label class="critrow'+(on?" on":"")+'">'+
        '<input type="checkbox" data-act="crit" data-id="'+esc(s.id)+'" data-c="'+esc(cc.id)+'"'+(on?" checked":"")+'>'+
        '<span class="grow">'+
          '<span class="t">'+esc(cc.texto)+(cc.obligatorio?' <span class="tag tag-red">obligatorio</span>':'')+'</span>'+
          '<span class="s">'+esc(prod(cc.producto).abbr)+' · '+esc(cc.usuario)+' · '+esc(cc.plazo)+(cc.nota?" · "+esc(cc.nota):"")+'</span>'+
        '</span>'+
      '</label>';
    }).join("")+'</div>'+
    (c.activa
      ? '<div class="note note-green"><div class="grow"><strong>La cuenta cumple los criterios de activación.</strong> Puede pasar a Customer Success: corre el passdown, la encuesta CSAT y libera los slots del sprint.</div></div>'
      : (!c.obligOk
        ? '<div class="note note-red"><div class="grow"><strong>Falta el criterio obligatorio.</strong> Sin la carga del 50% de la base de colaboradores la cuenta no se considera activa, aunque cumpla los demás.</div></div>'
        : '<div class="note note-amber"><div class="grow">Faltan <strong>'+c.faltan+'</strong> criterio'+(c.faltan===1?"":"s")+' para que la cuenta se considere activa.</div></div>'))+
  '</div>';
}

/* 4 — Resultado, asignación y entrega */
function bloqueResultado(s, c, d){
  const siguiente = sprintSiguiente(c.sprint);
  const cap = capacidad();
  const costo = d.slots != null ? d.slots : 1;
  const libreDespues = Math.round((cap.libre - (s.sprint===c.sprint.codigo ? 0 : costo))*10)/10;
  const cabe = libreDespues >= 0;
  const faltantes = [];
  if(d.faltan.cuenta) faltantes.push("información de cuenta de Vitally");
  if(d.faltan.contexto) faltantes.push("contexto organizacional");
  if(d.faltan.semaforo) faltantes.push("semáforo de "+d.semaforosFaltantes.map(k=>prod(k).abbr).join(", "));
  if(d.faltan.componentes) faltantes.push("componentes a activar");

  return '<div class="blk">'+
    '<div class="blkhead"><div class="htxt"><h3>Complejidad y agenda</h3>'+
      '<span class="hint">El score suma cuenta, contexto, preparación, alcance y bloqueos. Los pesos se configuran en Ajustes.</span></div></div>'+

    '<div class="dgout">'+
      '<div><span class="lbl">Cuenta</span><span class="v">'+nf(d.partes.cuenta)+'</span></div>'+
      '<div><span class="lbl">Contexto</span><span class="v">'+nf(d.partes.contexto)+'</span></div>'+
      '<div><span class="lbl">Preparación</span><span class="v">'+nf(d.partes.prep)+'</span></div>'+
      '<div><span class="lbl">Alcance</span><span class="v">'+nf(d.partes.alcance)+'</span></div>'+
      '<div><span class="lbl">Bloqueos</span><span class="v">'+nf(d.partes.flags)+'</span></div>'+
      '<div class="tot"><span class="lbl">Score</span><span class="v">'+d.score+'</span></div>'+
      '<div class="tot"><span class="lbl">Nivel</span><span class="v" style="font-size:16px">'+esc(d.nivel||"incompleto")+'</span></div>'+
      '<div class="tot"><span class="lbl">Slots</span><span class="v">'+(d.slots!=null?nf(d.slots):"1*")+'</span></div>'+
    '</div>'+
    (faltantes.length
      ? '<div class="note note-amber"><div class="grow"><strong>Diagnóstico incompleto.</strong> Falta: '+esc(faltantes.join(" · "))+'. Mientras tanto se cuesta como 1 slot por defecto.</div></div>'
      : '')+

    '<hr class="sep">'+
    '<div class="g3">'+
      '<label class="field"><span class="lb">Estado</span><select data-act="estado" data-id="'+esc(s.id)+'">'+
        Object.keys(ESTADOS).map(k=>'<option value="'+k+'"'+(s.estado===k?" selected":"")+'>'+esc(ESTADOS[k].label)+'</option>').join("")+
      '</select></label>'+
      '<label class="field"><span class="lb">Sprint</span><select data-act="sprint" data-id="'+esc(s.id)+'">'+
        '<option value="">Sin agendar</option>'+
        '<option value="'+esc(c.sprint.codigo)+'"'+(s.sprint===c.sprint.codigo?" selected":"")+'>'+esc(c.sprint.codigo)+' · en curso</option>'+
        '<option value="'+esc(siguiente.codigo)+'"'+(s.sprint===siguiente.codigo?" selected":"")+'>'+esc(siguiente.codigo)+' · '+esc(rangoSprint(siguiente))+'</option>'+
      '</select></label>'+
      '<label class="field"><span class="lb">Activador</span><select data-act="asignar" data-id="'+esc(s.id)+'">'+
        '<option value="">Sin asignar</option>'+
        c.roster.map(p=>'<option value="'+esc(p.id)+'"'+(s.asignado===p.id?" selected":"")+'>'+esc(p.nombre)+'</option>').join("")+
      '</select></label>'+
    '</div>'+
    '<div class="g2">'+
      '<label class="field"><span class="lb">Día de entrega</span>'+
        '<input type="date" value="'+esc(s.fechaEntrega||"")+'" data-act="fentrega" data-id="'+esc(s.id)+'">'+
        '<span class="hp">'+(s.fechaCliente?"El AE comprometió "+esc(fechaCorta(s.fechaCliente)):"El AE no comprometió fecha")+'</span></label>'+
    '</div>'+
    (!cabe && s.sprint !== c.sprint.codigo
      ? '<div class="note note-amber"><div class="grow">Con '+nf(costo)+' slots no entra a '+esc(c.sprint.codigo)+' (quedarían '+nf(libreDespues)+'). Agéndala en <strong>'+esc(siguiente.codigo)+'</strong> y dile al AE esa fecha.</div></div>'
      : '')+
    '<div class="rowbtw">'+
      '<span class="s">'+esc(s.id)+(s.ae?' · solicitó '+esc(s.ae):'')+(s.creadoEn?' · '+esc(fechaCorta(s.creadoEn)):'')+'</span>'+
      (s.estado !== "cancelada"
        ? '<button class="btn btn-sm btn-ghost" data-act="cancelar" data-id="'+esc(s.id)+'">Cancelar solicitud</button>'
        : '<span class="tag">Cancelada</span>')+
    '</div>'+
  '</div>';
}

/* ---- Formulario del AE ---- */
function formularioAE(){
  const b = S.borrador;
  return '<div class="card">'+
    '<div class="card-head"><div class="htxt"><h2>Nueva solicitud de activación</h2>'+
      '<span class="hint">'+(S.mcp?"La cuenta se busca en vivo en Vitally y su información queda adjunta":"Sin conector de Vitally: escribe el nombre de la cuenta")+'</span></div></div>'+
    '<form class="card-pad stack" data-act="crear">'+
      '<div class="g2">'+
        '<label class="field"><span class="lb">Cuenta</span>'+
          '<input type="text" name="cuenta" required autocomplete="off" placeholder="Escribe el nombre de la cuenta" value="'+esc(b.cuenta||"")+'" data-act="vt-input"></label>'+
        '<label class="field"><span class="lb">Tu nombre (AE)</span>'+
          '<input type="text" name="ae" required placeholder="Quién solicita" value="'+esc(b.ae||"")+'"></label>'+
      '</div>'+
      bloqueVitally(S.vt)+
      (b.cuentaInfo
        ? '<div class="note note-green"><div class="grow"><strong>'+esc(b.cuentaInfo._nombre)+' adjunta desde Vitally.</strong> '+
          [b.cuentaInfo.tipoEmpresa, b.cuentaInfo.clientStage,
           b.cuentaInfo.licContratadas?b.cuentaInfo.licContratadas+" licencias":null].filter(Boolean).map(esc).join(" · ")+
          '</div></div>'
        : '')+
      '<div class="g2">'+
        '<label class="field"><span class="lb">Tipo de trabajo</span><select name="tipo">'+
          TIPOS_TRABAJO.map(t=>'<option'+(b.tipo===t?" selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label>'+
        '<label class="field"><span class="lb">Fecha comprometida con el cliente</span>'+
          '<input type="date" name="fechaCliente" value="'+esc(b.fechaCliente||"")+'"></label>'+
      '</div>'+
      '<div class="field"><span class="lb">Productos a activar</span>'+
        '<div class="pills" style="margin-top:4px">'+PRODUCTOS.map(p=>
          '<label class="pl chk"><input type="checkbox" name="productos" value="'+p.key+'"'+(p.siempre?" checked":"")+'>'+
            '<span class="pdot" style="background:'+p.color+'"></span>'+esc(p.nombre)+
            (p.siempre?'<span class="s"> · siempre</span>':'')+'</label>').join("")+
        '</div>'+
      '</div>'+
      '<label class="field"><span class="lb">Contexto del cliente</span>'+
        '<textarea name="contexto" placeholder="Qué compró, qué espera resolver, quién es el sponsor, qué ya intentaron, restricciones de calendario.">'+esc(b.contexto||"")+'</textarea></label>'+
      '<div class="rowbtw">'+
        '<span class="s">Se registra como <strong>Nueva</strong> y entra al siguiente triage de Activaciones.</span>'+
        '<button class="btn btn-primary" type="submit">Levantar solicitud</button>'+
      '</div>'+
    '</form>'+
  '</div>';
}

function bloqueVitally(vt){
  if(vt.estado === "idle") return "";
  if(vt.estado === "cargando") return '<div class="vt"><span class="s"><span class="spin"></span> Buscando «'+esc(vt.q)+'» en Vitally…</span></div>';
  if(vt.estado === "error") return '<div class="note note-amber"><div class="grow">'+esc(vt.err.texto)+'</div>'+
    (vt.err.reintentar?'<button class="btn btn-sm" data-act="vt-retry">Reintentar</button>':'')+'</div>';
  if(!vt.res.length) return '<div class="vt"><span class="s">Vitally no tiene cuentas que contengan «'+esc(vt.q)+'». Revisa el nombre o continúa a mano.</span></div>';
  return '<div class="stack-sm">'+
    '<span class="s">'+vt.res.length+' cuenta'+(vt.res.length===1?"":"s")+' en Vitally'+
      (vt.cache?' · datos de '+new Date(vt.cache).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}):'')+' — elige una para adjuntarla</span>'+
    vt.res.map((cu,i) => {
      const props = [["Client Stage",cu.clientStage],["Tipo",cu.tipoEmpresa],
        ["Colaboradores",cu.tamanoNum],["Licencias",cu.licContratadas],
        ["Productos",Array.isArray(cu.prodContratado)?cu.prodContratado.length:cu.nProductos],
        ["Activado",cu.activado==null?null:(cu.activado?"Sí":"No")]];
      return '<div class="vt pick" data-act="vt-pick" data-i="'+i+'" tabindex="0" role="button">'+
        '<div class="rowbtw"><strong style="color:var(--ink)">'+esc(cu._nombre)+'</strong>'+
          (cu._url?'<a href="'+esc(cu._url)+'" target="_blank" rel="noopener noreferrer" class="s" onclick="event.stopPropagation()">Ver en Vitally ↗</a>':'')+'</div>'+
        '<div class="vtp">'+props.map(p=>'<div><span class="k">'+esc(p[0])+'</span><span class="v">'+
          (p[1]==null||p[1]===""?'<span class="sindato">sin dato</span>':esc(p[1]))+'</span></div>').join("")+'</div>'+
      '</div>';
    }).join("")+
  '</div>';
}
