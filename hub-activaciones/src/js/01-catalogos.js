"use strict";

/* ============================================================
   PARTE 1 — Catálogos, constantes y motor de complejidad
   Se concatena en el <script> del hub.
   ============================================================ */
"use strict";

/* ---- Iconos ---- */
const IC = {
  inbox:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 5h14l2 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6L5 5Z"/></svg>',
  gauge:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19a9 9 0 1 1 16 0"/><path d="M12 14l4-4"/></svg>',
  map:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h6"/><circle cx="18" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>',
  flow:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v5a4 4 0 0 0 4 4h3.5"/></svg>',
  sliders:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  book:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-13c-4.5 0-6.5.5-8 2Z"/><path d="M12 6.5v13"/></svg>',
  ext:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-8 8"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  dl:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10M8 11l4 4 4-4M4 19h16"/></svg>',
  search:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg>',
  dot:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  moon:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
  sun:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',
  refresh:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>'
};

/* ---- Productos. Colores tomados del propio diagnostico-kickoff.html
        (plat/cya/dxc/eyc/eye) y de Voz del Cliente para el resto. ---- */
const PRODUCTOS = [
  { key:"plat",          nombre:"Plataforma General",          abbr:"PLAT", vitally:null,             color:"#6B3FCC", siempre:true },
  { key:"capacitacion",  nombre:"Capacitación y Aprendizaje",  abbr:"CyA",  vitally:"Capacitación",   color:"#8B55FE" },
  { key:"dxc",           nombre:"Desarrollo por Competencias", abbr:"DxC",  vitally:"DxC",            color:"#5C3D8F" },
  { key:"eyc",           nombre:"Evaluaciones y Clima",        abbr:"EyC",  vitally:"EyC",            color:"#04949D" },
  { key:"eye",           nombre:"Estrategia y Ejecución",      abbr:"EyE",  vitally:"EyE",            color:"#1E7E34" },
  { key:"reclutamiento", nombre:"Reclutamiento",               abbr:"REC",  vitally:"Reclutamiento",  color:"#2B7FF0" },
  { key:"gdp",           nombre:"Gestión de Personas",         abbr:"GdP",  vitally:null,             color:"#14C4B0" },
  { key:"catalogo",      nombre:"Catálogo Lapzo",              abbr:"CAT",  vitally:"Catálogo Lapzo", color:"#8B92A8" }
];
const prod = k => PRODUCTOS.find(p=>p.key===k) || { key:k, nombre:k, abbr:"?", vitally:null, color:"#8B92A8" };
const prodName = k => prod(k).nombre;

/* ---- Semáforo de madurez (del instrumento de kick-off) ---- */
const SEMAFOROS = {
  verde:    { label:"Listo",                  puntos:0, tag:"tag-green", desc:"Organización preparada para iniciar." },
  amarillo: { label:"En preparación",         puntos:1, tag:"tag-amber", desc:"Hay avances pero faltan detalles." },
  rojo:     { label:"Requiere construcción",  puntos:2, tag:"tag-red",   desc:"Hay bloqueos importantes o se parte de cero." }
};

/* ---- Contexto organizacional (Dimensión 1 del diagnóstico) ---- */
const CONTEXTO = [
  { key:"madurezRH", label:"Madurez del área de RH/DO",
    ops:[["Estratégica — RH como socio de negocio con métricas",0],
         ["Estructurada — procesos documentados y en operación",1],
         ["En transición — algunos procesos definidos",2],
         ["Muy operativa — procesos manuales, poca formalización",3]] },
  { key:"sponsor", label:"Sponsor ejecutivo",
    ops:[["Sponsor con poder para mover la organización",0],
         ["Sponsor con poder parcial",1],
         ["Sponsor nominal o sin claridad",2]] },
  { key:"admins", label:"Equipo que administrará Lapzo",
    ops:[["2 o más personas con tiempo dedicado",0],
         ["1 persona con tiempo suficiente",1],
         ["1 persona con poco tiempo disponible",2]] },
  { key:"proyectos", label:"Proyectos que compiten por atención (60 días)",
    ops:[["Sin proyectos en competencia",0],
         ["Algún proyecto en paralelo",1],
         ["Auditoría, reestructura o temporada alta",2]] },
  { key:"datos", label:"Carga de datos y estructura organizacional",
    ops:[["Alta manual / plantilla lista",1],
         ["Archivo por depurar con el cliente",2],
         ["Integración con HRIS o nómina",3]] }
];

/* ---- Flags críticos del instrumento (bloqueos) ---- */
const FLAGS = [
  { key:"dxcSinDesc", producto:"dxc", label:"Sin descriptivos de puesto",
    aviso:"Bloqueo crítico: DxC no puede iniciar sin descriptivos. Lapzo apoya con IA pero requiere validación del cliente.", tono:"red", puntos:3 },
  { key:"dxcDescParcial", producto:"dxc", label:"Descriptivos incompletos",
    aviso:"Descriptivos parciales: completarlos en las primeras semanas antes de generar matrices.", tono:"amber", puntos:1 },
  { key:"eyeSinObjetivos", producto:"eye", label:"Objetivos del ciclo sin definir",
    aviso:"Se requiere sesión de alineación con Dirección como primer paso de EyE.", tono:"amber", puntos:2 },
  { key:"eyeSinMetodologia", producto:"eye", label:"Sin metodología de objetivos",
    aviso:"Agregar capacitación en metodología OKR/KPI antes de configurar la plataforma.", tono:"amber", puntos:2 },
  { key:"cyaSinPlan", producto:"capacitacion", label:"Sin plan de cursos definido",
    aviso:"Se requiere DNC (diagnóstico de necesidades de capacitación) antes de cargar contenido.", tono:"amber", puntos:2 },
  { key:"eycUrgente", producto:"eyc", label:"Ciclo de evaluación urgente (≤1 mes)",
    aviso:"EyC arranca en el mismo mes del kick-off. Comprime la ventana de configuración.", tono:"amber", puntos:2 }
];

/* ---- Campos de Vitally: información de cuenta ---- */
const VT_CAMPOS = [
  { key:"clientStage",   label:"Client Stage",          prop:"customFields.f108a399-8701-4328-8353-b4b398753dfb", tipo:"texto",  grupo:"estado" },
  { key:"csmPulse",      label:"CSM Pulse",             prop:"customFields.5f8d6a1a-d566-4f9e-ad40-52e901b9368b", tipo:"texto",  grupo:"estado" },
  { key:"health",        label:"Health score",          prop:"healthCategories.1068a9ae-f8f1-4646-9534-4db57fd83054", tipo:"num", grupo:"estado" },
  { key:"activado",      label:"Cliente activado",      prop:"customFields.1e87a660-7fff-4e1d-a119-112c5515c1dc", tipo:"bool",   grupo:"estado" },
  { key:"adopcion",      label:"% Adopción",            prop:"customFields.9d2ac82a-de67-4c5b-8b1e-230350be09a9", tipo:"pct",    grupo:"estado" },

  { key:"tipoEmpresa",   label:"Tipo de empresa (TIER)",prop:"customFields.293f7e83-234c-4030-a9d2-aaf282c4dcf8", tipo:"texto",  grupo:"perfil" },
  { key:"tamanoNum",     label:"Tamaño de empresa (#)", prop:"customFields.fb539b17-f251-4b19-a688-9b80d9784cfa", tipo:"num",    grupo:"perfil" },
  { key:"tamanoSeg",     label:"Segmento de tamaño",    prop:"customFields.33eeb9af-6505-49bb-854d-2cba790d7b67", tipo:"texto",  grupo:"perfil" },
  { key:"mrr",           label:"MRR",                   prop:"customFields.ee810155-f39b-4169-9b07-a22495dd7799", tipo:"money",  grupo:"perfil" },

  { key:"licContratadas",label:"Licencias contratadas", prop:"customFields.bde63780-f89e-48ff-bda5-459a577e443e", tipo:"num",    grupo:"licencias" },
  { key:"licFull",       label:"Licencias full",        prop:"customFields.58f3ec49-64a1-4848-96f6-67a25156790e", tipo:"num",    grupo:"licencias" },
  { key:"licUtilizadas", label:"Licencias utilizadas",  prop:"customFields.aefbc36b-58fe-4247-9f88-1bcb3eab5cae", tipo:"pct",    grupo:"licencias" },
  { key:"vdmActivos",    label:"VDM usuarios activos",  prop:"customFields.9b9c9292-765d-4998-bba4-b5844a3c495c", tipo:"num",    grupo:"licencias" },
  { key:"vdmRegistrados",label:"VDM registrados",       prop:"customFields.45aa1da9-80ba-49cd-8299-0b35fbdcec90", tipo:"num",    grupo:"licencias" },

  { key:"prodContratado",label:"Producto contratado",   prop:"customFields.1fba07cc-b41d-4a1e-85dd-8375195be7ad", tipo:"lista",  grupo:"productos" },
  { key:"prodUtilizando",label:"Producto utilizando",   prop:"customFields.d7a48010-b0f2-4d73-91d5-84da5d38a865", tipo:"lista",  grupo:"productos" },
  { key:"addons",        label:"Add-ons",               prop:"customFields.6355c970-b5ba-4f23-9959-4f73d0534f8a", tipo:"lista",  grupo:"productos" },
  { key:"nProductos",    label:"# Productos",           prop:"customFields.438050d2-b632-4fe8-8418-f46ae6c8cebc", tipo:"num",    grupo:"productos" },

  { key:"instanciaNom",  label:"Nombre de instancia",   prop:"customFields.c866e852-87be-4924-9659-52bc5097c840", tipo:"texto",  grupo:"instancia" },
  { key:"instanciaUrl",  label:"Instancia URL",         prop:"customFields.50f388d3-16ef-4441-a375-07afe4f0b25d", tipo:"url",    grupo:"instancia" }
];
const VT_GRUPOS = [
  { key:"estado",    titulo:"Estado del cliente" },
  { key:"perfil",    titulo:"Perfil y contrato" },
  { key:"licencias", titulo:"Licencias y uso" },
  { key:"productos", titulo:"Productos y add-ons" },
  { key:"instancia", titulo:"Instancia" }
];

/* ---- Estados de solicitud ---- */
const ESTADOS = {
  nueva:     { label:"Nueva",      tag:"tag-violet", enSprint:false, activa:true  },
  triage:    { label:"En triage",  tag:"tag-amber",  enSprint:false, activa:true  },
  aceptada:  { label:"Aceptada",   tag:"tag",        enSprint:false, activa:true  },
  en_sprint: { label:"En sprint",  tag:"tag-violet", enSprint:true,  activa:true  },
  bloqueada: { label:"Bloqueada",  tag:"tag-red",    enSprint:true,  activa:true  },
  entregada: { label:"Entregada",  tag:"tag-green",  enSprint:false, activa:false },
  cancelada: { label:"Cancelada",  tag:"tag",        enSprint:false, activa:false }
};
const est = s => ESTADOS[(s||{}).estado] || ESTADOS.nueva;

/* ---- Estado de cada componente dentro de una activación ---- */
const COMP_ESTADOS = {
  "":          { label:"No aplica",  tag:"tag",        cuenta:false, listo:false },
  pendiente:   { label:"Pendiente",  tag:"tag-amber",  cuenta:true,  listo:false },
  curso:       { label:"En curso",   tag:"tag-violet", cuenta:true,  listo:false },
  listo:       { label:"Listo",      tag:"tag-green",  cuenta:true,  listo:true  }
};

const TIPOS_TRABAJO = [
  "Activación inicial (onboarding + lanzamiento)",
  "Activación de producto adicional",
  "Relanzamiento / reactivación",
  "Configuración puntual",
  "Acompañamiento a lanzamiento"
];


/* ---- Rutas de implementación TaaS (success-lapzo.github.io/rutasimplementacionlapzo) ---- */
const RUTAS = [
  { id:"ideal", nombre:"Descubre el talento de tu equipo", sub:"Ruta Ideal · DxC primero",
    desc:"Para organizaciones que empiezan desde cero. El diagnóstico de competencias como base garantiza que cada decisión de desarrollo, capacitación y evaluación esté respaldada por datos reales.",
    criterio:"DxC contratado, semáforo verde o amarillo, y descriptivos de puesto disponibles.",
    orden:{ dxc:1, eye:2, capacitacion:3, eyc:3 },
    hitos:{ dxc:"M2 · Primer PID generado", capacitacion:"15% con curso iniciado",
            eyc:"M5 · Primer ciclo de evaluación", eye:"M2 · Objetivos definidos" } },
  { id:"cya", nombre:"Capacita a tu equipo desde el día 1", sub:"Ruta B · CyA primero",
    desc:"Para organizaciones con urgencia de capacitación inmediata. Cursos y rutas activos desde M1. Competencias y evaluación se integran a partir del M3, potenciadas por los datos de aprendizaje ya generados.",
    criterio:"CyA contratado en verde o amarillo, o DxC bloqueado por falta de descriptivos.",
    orden:{ capacitacion:1, eyc:3, eye:3, dxc:10 },
    hitos:{ capacitacion:"M2 · Colaboradores aprendiendo", dxc:"M10 · Primer PID generado",
            eyc:"M4 · Primer ciclo de evaluación", eye:"M3 · Objetivos definidos" } },
  { id:"eyc", nombre:"Evalúa el desempeño de tu organización", sub:"Ruta C · EyC primero",
    desc:"Para organizaciones con un proceso de evaluación ya definido. La evaluación 180° desde M1 genera los datos que alimentan el modelo de competencias y los planes de desarrollo.",
    criterio:"EyC contratado con ciclo urgente (≤1 mes) y proceso de evaluación ya definido.",
    orden:{ eyc:1, dxc:1, eye:2, capacitacion:6 },
    hitos:{ eyc:"M2 · Evaluación lanzada", dxc:"M1 · Competencias como base",
            capacitacion:"M6 · Rutas basadas en competencias", eye:"M2 · Objetivos como segundo módulo" } },
  { id:"eye", nombre:"Alinea tu empresa hacia los mismos objetivos", sub:"Ruta D · EyE primero",
    desc:"Para organizaciones con urgencia de alinear su estrategia desde el día 1. Los objetivos y KPIs se instalan primero, creando la cultura de seguimiento que potencia competencias, capacitación y evaluación.",
    criterio:"EyE contratado con objetivos ya definidos, o urgencia de alineación estratégica.",
    orden:{ eye:1, dxc:3, capacitacion:3, eyc:6 },
    hitos:{ eye:"M1 · Estrategia publicada", dxc:"M3 · Competencias ancladas a objetivos",
            capacitacion:"M3 · Rutas alineadas a objetivos", eyc:"M6 · Evaluación que cierra el ciclo" } }
];
const ruta = id => RUTAS.find(r=>r.id===id) || null;

/* Sugerencia de ruta según el diagnóstico. Replica el orden de reglas
   de consultantSequence() del instrumento de kick-off. */
function sugerirRuta(s){
  const prods = s.productos || [];
  const diag = s.diagnostico || {};
  const sema = pk => ((diag.porModulo||{})[pk]||{}).semaforo || "";
  const f = diag.flags || {};
  const listo = pk => sema(pk) === "verde" || sema(pk) === "amarillo";
  if(prods.includes("dxc") && listo("dxc") && !f.dxcSinDesc)
    return { id:"ideal", por:"DxC está contratado, en verde o amarillo, y hay descriptivos de puesto." };
  if(prods.includes("capacitacion") && listo("capacitacion") && prods.includes("dxc") && f.dxcSinDesc)
    return { id:"cya", por:"DxC está bloqueado por falta de descriptivos: CyA arranca la adopción mientras se construyen." };
  if(prods.includes("eyc") && f.eycUrgente && !prods.includes("dxc"))
    return { id:"eyc", por:"Hay un ciclo de evaluación urgente y DxC no está en el mix." };
  if(prods.filter(k=>k!=="plat").length === 1 && prods.includes("eye") && !f.eyeSinObjetivos)
    return { id:"eye", por:"EyE es el único módulo contratado y los objetivos ya están definidos." };
  if(prods.includes("capacitacion") && sema("capacitacion") === "verde" && !prods.includes("dxc"))
    return { id:"cya", por:"CyA está listo y no hay DxC: es el arranque más rápido." };
  const orden = { verde:1, amarillo:2, rojo:3, "":2 };
  const primero = prods.filter(k=>k!=="plat").sort((a,b)=>orden[sema(a)]-orden[sema(b)])[0];
  if(!primero) return null;
  const mapa = { dxc:"ideal", capacitacion:"cya", eyc:"eyc", eye:"eye" };
  return mapa[primero] ? { id:mapa[primero], por:"Ninguna regla específica aplica: se prioriza el módulo con mayor preparación ("+prod(primero).abbr+")." } : null;
}

/* ---- Criterios de activación (hoja «Medir en activación»)
        Una cuenta se considera activa, y puede pasar a los AEs,
        cuando cumple 2 de los criterios de sus módulos contratados. ---- */
const CRITERIOS_MINIMOS = 2;
const CRITERIOS = [
  { id:"adm-carga",  producto:"plat", usuario:"Admin", obligatorio:true,
    texto:"Carga del 50% de la base de colaboradores", plazo:"30 días desde el KO", nota:"Activation rate: obligatorio." },
  { id:"adm-cap",    producto:"plat", usuario:"Admin",
    texto:"100% de administradores capacitados en los módulos contratados", plazo:"≤30 días del KO" },
  { id:"adm-login",  producto:"plat", usuario:"Colaborador",
    texto:"Ingreso a la plataforma (LOGIN) del 20% de los usuarios cargados", plazo:"≤60 días del KO", nota:"MAU" },
  { id:"col-accion", producto:"plat", usuario:"Colaborador",
    texto:"10% de los usuarios con LOGIN ejecutan al menos 1 acción", plazo:"Seguimiento mensual", nota:"MAU" },
  { id:"cya-adm",    producto:"capacitacion", usuario:"Admin",
    texto:"20% de los usuarios inscritos a un curso", plazo:"Primeros 60 días", nota:"Activation rate y first value." },
  { id:"cya-col",    producto:"capacitacion", usuario:"Colaborador",
    texto:"15% de los usuarios iniciaron un curso", plazo:"30 días desde el acceso" },
  { id:"dxc-adm",    producto:"dxc", usuario:"Admin",
    texto:"Asignación de rutas al 40% de los colaboradores", plazo:"Primeros 60 días" },
  { id:"dxc-col",    producto:"dxc", usuario:"Colaborador",
    texto:"5% de los usuarios iniciaron ruta por competencias o crearon un PID", plazo:"30 días desde el acceso" },
  { id:"eyc-adm",    producto:"eyc", usuario:"Admin",
    texto:"Un ciclo de evaluación creado", plazo:"Primer mes después del KO" },
  { id:"eyc-col",    producto:"eyc", usuario:"Colaborador",
    texto:"5% de las licencias contratadas con una evaluación finalizada", plazo:"30 días desde el acceso" },
  { id:"eye-adm",    producto:"eye", usuario:"Admin",
    texto:"Un ciclo creado con objetivos, metas o indicadores al 20% de la población", plazo:"≤2 meses después del KO" },
  { id:"eye-col",    producto:"eye", usuario:"Colaborador",
    texto:"50% de los usuarios con objetivos entraron al menos una vez a su módulo", plazo:"30 días desde el acceso" }
];
function evaluarCriterios(s){
  const prods = s.productos || [];
  const aplican = CRITERIOS.filter(c => prods.includes(c.producto));
  const cumplidos = aplican.filter(c => (s.criterios||{})[c.id]);
  const oblig = aplican.filter(c => c.obligatorio);
  const obligOk = oblig.every(c => (s.criterios||{})[c.id]);
  return { aplican, cumplidos, oblig, obligOk,
    activa: obligOk && cumplidos.length >= CRITERIOS_MINIMOS,
    faltan: Math.max(0, CRITERIOS_MINIMOS - cumplidos.length) };
}

/* ---- Niveles por defecto (editables en Ajustes) ---- */
const NIVELES_DEF = [
  { max:14, nivel:"Ligera",   slots:0.5 },
  { max:30, nivel:"Estándar", slots:1   },
  { max:48, nivel:"Compleja", slots:1.5 },
  { max:999,nivel:"Crítica",  slots:2   }
];
const TONO_NIVEL = { "Ligera":"tag-green", "Estándar":"tag-violet", "Compleja":"tag-amber", "Crítica":"tag-red" };

const PESOS_DEF = { cuenta:1, semaforo:1, componente:0.25, flags:1 };

/* ---- Escalas de los factores de cuenta ---- */
function puntosTamano(info){
  const n = Number((info||{}).tamanoNum);
  if(n > 0) return n > 1000 ? 3 : (n >= 150 ? 2 : 1);
  const s = String((info||{}).tamanoSeg || "").toLowerCase();
  if(s.indexOf("small") >= 0) return 1;
  if(s.indexOf("mid") >= 0 || s.indexOf("medium") >= 0) return 2;
  if(s.indexOf("enterprise") >= 0 || s.indexOf("large") >= 0) return 3;
  return 0;
}
function puntosLicencias(info){
  const n = Number((info||{}).licContratadas) || Number((info||{}).licFull);
  if(!(n > 0)) return 0;
  return n > 500 ? 3 : (n >= 100 ? 2 : 1);
}
function puntosProductos(s){
  const todos = (s.productos||[]);
  const n = todos.filter(k=>k!=="plat").length;
  if(!n) return todos.length ? 1 : 0;
  return n >= 3 ? 3 : n;
}

/* ============================================================
   Motor de complejidad
   ============================================================ */
function evaluar(s, cat, pesos, niveles){
  pesos = pesos || PESOS_DEF;
  niveles = (niveles && niveles.length) ? niveles : NIVELES_DEF;
  const comps = (cat && cat.productos) || {};
  const diag = s.diagnostico || {};
  const porMod = diag.porModulo || {};
  const ctx = diag.contexto || {};
  const sel = s.componentes || {};
  const prods = s.productos || [];

  /* 1 — Cuenta */
  const pTam = puntosTamano(s.cuentaInfo), pLic = puntosLicencias(s.cuentaInfo), pProd = puntosProductos(s);
  const cuentaCompleta = pTam > 0 && pLic > 0 && pProd > 0;
  const cuenta = (pTam + pLic + pProd) * pesos.cuenta;

  /* 2 — Contexto organizacional */
  let contexto = 0, ctxCompleto = true;
  CONTEXTO.forEach(f => {
    const v = ctx[f.key];
    if(v === undefined || v === null || v === "") ctxCompleto = false;
    else contexto += Number(v);
  });
  contexto = contexto * pesos.cuenta;

  /* 3 — Preparación por módulo (semáforo) */
  let prep = 0, semaforosFaltantes = [];
  prods.forEach(pk => {
    const sm = (porMod[pk] || {}).semaforo;
    if(!sm || !SEMAFOROS[sm]) semaforosFaltantes.push(pk);
    else prep += SEMAFOROS[sm].puntos;
  });
  prep = prep * pesos.semaforo;

  /* 4 — Alcance: componentes marcados */
  let alcance = 0, nComp = 0, nListos = 0, nCurso = 0, enCurso = [];
  prods.forEach(pk => {
    const lista = comps[pk] || [];
    const mapa = sel[pk] || {};
    lista.forEach(c => {
      const e = mapa[c.id];
      if(!e || !COMP_ESTADOS[e] || !COMP_ESTADOS[e].cuenta) return;
      nComp++;
      alcance += (Number(c.peso) || 1);
      if(e === "listo") nListos++;
      if(e === "curso"){ nCurso++; enCurso.push({ pk, nombre:c.nombre }); }
    });
  });
  alcance = alcance * pesos.componente;

  /* 5 — Flags de bloqueo */
  let flags = 0; const flagsActivos = [];
  FLAGS.forEach(f => {
    if(!prods.includes(f.producto)) return;
    if((diag.flags || {})[f.key]){ flags += f.puntos; flagsActivos.push(f); }
  });
  flags = flags * pesos.flags;

  const score = Math.round((cuenta + contexto + prep + alcance + flags) * 10) / 10;
  const completo = cuentaCompleta && ctxCompleto && semaforosFaltantes.length === 0 && nComp > 0;
  const banda = niveles.find(n => score <= n.max) || niveles[niveles.length-1];

  return {
    score, completo,
    partes:{ cuenta, contexto, prep, alcance, flags },
    nivel: completo ? banda.nivel : null,
    slots: completo ? banda.slots : null,
    tono: TONO_NIVEL[banda.nivel] || "tag",
    nComp, nListos, nCurso, enCurso, flagsActivos, semaforosFaltantes,
    progreso: nComp ? Math.round((nListos / nComp) * 100) : 0,
    faltan: {
      cuenta: !cuentaCompleta, contexto: !ctxCompleto,
      semaforo: semaforosFaltantes.length > 0, componentes: nComp === 0
    }
  };
}
function slotsDe(s, cat, pesos, niveles){
  const e = evaluar(s, cat, pesos, niveles);
  return e.slots != null ? e.slots : 1;
}
