-- ============================================================================
-- PORTAL LAPZO · registro del catálogo en Supabase
-- ----------------------------------------------------------------------------
-- Este archivo NO lo ejecuta la aplicación. Es para pegarlo en el SQL Editor de
-- Supabase, revisarlo y correrlo a mano.
--
-- Solo hay INSERT y UPDATE sobre tablas que ya existen. No crea ni modifica
-- tablas ni políticas.
--
-- ¿Por qué hace falta? Porque el portal muestra un artefacto únicamente si
-- Supabase lo devuelve. Hoy en public.artefactos está registrado el de FEVISA;
-- los demás archivos del Centro de Reportes existen en el repositorio pero no
-- en la base, así que no se ven. Este script los da de alta.
--
-- Revisa dos cosas antes de correrlo:
--   1. los nombres de las empresas nuevas (Lapzo interno y Multicliente);
--   2. que las rutas coincidan con las carpetas reales del repositorio.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Qué hay hoy. Corre esto primero y compara.
-- ----------------------------------------------------------------------------
-- select id, slug, nombre, activo, orden from public.empresas order by orden;
-- select a.slug, a.nombre, a.ruta, a.activo, e.slug as empresa
--   from public.artefactos a join public.empresas e on e.id = a.empresa_id
--  order by e.orden, a.orden;


-- ----------------------------------------------------------------------------
-- 1. Ruta del artefacto de FEVISA que ya está registrado
-- ----------------------------------------------------------------------------
-- La ruta se guarda relativa a la raíz del portal, sin barra inicial, porque
-- el portal puede vivir en un subpath de GitHub Pages.
-- Ajusta el slug del where si en tu base es otro.

update public.artefactos
   set ruta = 'centro-reportes/reportes/fevisa/indicadores-capacitacion-supabase/index.html',
       updated_at = now()
 where empresa_id = (select id from public.empresas where slug = 'fevisa')
   and slug in ('indicadores-capacitacion', 'indicadores_capacitacion',
                'indicadores-de-capacitacion', 'indicadores-capacitacion-supabase');


-- ----------------------------------------------------------------------------
-- 2. Empresas contenedoras para los artefactos que no son de un cliente
-- ----------------------------------------------------------------------------
-- Cinco herramientas del Centro sirven para cualquier cuenta y tres son de uso
-- interno. Como el permiso se otorga por empresa, necesitan una empresa donde
-- vivir. Si prefieres otros nombres, cámbialos aquí y en el paso 3.

insert into public.empresas (slug, nombre, descripcion, activo, orden)
values
  ('lapzo-interno', 'Lapzo (interno)', 'Herramientas de uso interno del equipo.', true, 90),
  ('multicliente',  'Multicliente',    'Generadores que funcionan con cualquier cuenta.', true, 91)
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- 3. Artefactos del Centro de Reportes
-- ----------------------------------------------------------------------------
-- El slug de cada artefacto es el nombre de su carpeta: así el portal puede
-- cruzarlo con los metadatos de data/reports.js aunque la ruta cambie.

-- FEVISA -------------------------------------------------------------------
insert into public.artefactos (empresa_id, slug, nombre, descripcion, ruta, activo, orden)
select e.id, v.slug, v.nombre, v.descripcion, v.ruta, true, v.orden
  from public.empresas e
  join (values
    ('indicadores-capacitacion',
     'Indicadores de Capacitación',
     'Procesa el reporte detallado de Lapzo y construye los indicadores de capacitación.',
     'centro-reportes/reportes/fevisa/indicadores-capacitacion/index.html', 20),
    ('indicadores-capacitacion-consolidado',
     'Indicadores de Capacitación · FEVISA',
     'Base consolidada, cumplimiento y calificaciones por razón social.',
     'centro-reportes/reportes/fevisa/indicadores-capacitacion-consolidado/index.html', 30)
  ) as v(slug, nombre, descripcion, ruta, orden) on true
 where e.slug = 'fevisa'
on conflict do nothing;

-- Palos Garza ---------------------------------------------------------------
-- Solo si la empresa ya existe. Si no, créala primero como en el paso 2.
insert into public.artefactos (empresa_id, slug, nombre, descripcion, ruta, activo, orden)
select e.id, 'informe-cursos',
       'Generador de Informe de Cursos',
       'Carga el reporte detallado de cursos en CSV y descarga el informe consolidado en Excel.',
       'centro-reportes/reportes/palos-garza/informe-cursos/index.html', true, 10
  from public.empresas e
 where e.slug = 'palos-garza'
on conflict do nothing;

-- Multicliente --------------------------------------------------------------
insert into public.artefactos (empresa_id, slug, nombre, descripcion, ruta, activo, orden)
select e.id, v.slug, v.nombre, v.descripcion, v.ruta, true, v.orden
  from public.empresas e
  join (values
    ('nom035-guia-iii',
     'Generador de Reportes NOM-035 · Guía de Referencia III',
     'Convierte el export crudo de la plataforma en el PDF ejecutivo y el Excel de resultados.',
     'centro-reportes/reportes/general/nom035-guia-iii/index.html', 10),
    ('nom035-guia-ii',
     'Generador de Reportes NOM-035 · Guía de Referencia II',
     'Versión Guía II del generador NOM-035.',
     'centro-reportes/reportes/general/nom035-guia-ii/index.html', 20),
    ('avance-pid-cursos-extras',
     'Generador de Reporte de Avance PID',
     'Convierte la data cruda del cliente en un reporte ejecutivo de avance de PID en PDF.',
     'centro-reportes/reportes/general/avance-pid-cursos-extras/index.html', 30),
    ('avance-diagnosticos',
     'Generador de Reporte de Avance de Diagnósticos',
     'PDF ejecutivo de avance y resultados de diagnósticos.',
     'centro-reportes/reportes/general/avance-diagnosticos/index.html', 40),
    ('clima-organizacional',
     'Generador de Clima Organizacional',
     'Informe ejecutivo de clima organizacional por dimensión.',
     'centro-reportes/reportes/general/clima-organizacional/index.html', 50)
  ) as v(slug, nombre, descripcion, ruta, orden) on true
 where e.slug = 'multicliente'
on conflict do nothing;

-- Lapzo (interno) -----------------------------------------------------------
insert into public.artefactos (empresa_id, slug, nombre, descripcion, ruta, activo, orden)
select e.id, v.slug, v.nombre, v.descripcion, v.ruta, true, v.orden
  from public.empresas e
  join (values
    ('generador-renovaciones',
     'Generador de Renovaciones Lapzo',
     'Arma el acuerdo de renovación y la propuesta económica del Anexo A.',
     'centro-reportes/reportes/interno/generador-renovaciones/index.html', 10),
    ('elegibilidad-taas',
     'Checklist de elegibilidad TaaS',
     'Evalúa si un prospecto es apto para el modelo Talent-as-a-Service.',
     'centro-reportes/reportes/interno/elegibilidad-taas/index.html', 20),
    ('diagnostico-kickoff',
     'Diagnóstico de Kick-off',
     'Instrumento de activación de 4 dimensiones.',
     'centro-reportes/reportes/interno/diagnostico-kickoff/index.html', 30)
  ) as v(slug, nombre, descripcion, ruta, orden) on true
 where e.slug = 'lapzo-interno'
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- 4. Módulos del portal
-- ----------------------------------------------------------------------------
-- El portal resuelve modulos_portal.ruta contra su propia base. Si esas rutas
-- están vacías en tu base, esto las deja listas.

update public.modulos_portal
   set ruta = 'centro-reportes/index.html', updated_at = now()
 where slug = 'centro_reportes' and coalesce(ruta, '') = '';

update public.modulos_portal
   set ruta = 'tablero-unificado/index.html', updated_at = now()
 where slug = 'tablero_unificado' and coalesce(ruta, '') = '';


-- ----------------------------------------------------------------------------
-- 5. Comprobación
-- ----------------------------------------------------------------------------
-- select e.nombre as empresa, a.slug, a.ruta, a.activo
--   from public.artefactos a join public.empresas e on e.id = a.empresa_id
--  order by e.orden, a.orden;

-- Nota sobre "on conflict do nothing": depende de que exista un índice único
-- sobre (empresa_id, slug) o sobre slug. Si tu tabla no lo tiene, corre primero
-- la consulta del paso 0 y quita a mano las filas que ya estén registradas,
-- para no duplicar.


-- ----------------------------------------------------------------------------
-- 6. Módulo Hub de Activaciones
-- ----------------------------------------------------------------------------
-- Ya debería existir en modulos_portal. Esto solo asegura que su ruta apunte
-- a la carpeta del módulo dentro del portal.

update public.modulos_portal
   set ruta = 'hub-activaciones/index.html', updated_at = now()
 where slug = 'hub_activaciones'
   and coalesce(ruta, '') <> 'hub-activaciones/index.html';

-- Y así se le da nivel operativo a alguien en el Hub (AE / AS / HCS).
-- Los superadministradores del portal entran como HCS sin necesidad de esto.
--
-- insert into public.hub_usuario_rol (user_id, nivel, activo)
-- select user_id, 'as', true from public.usuarios_portal
--  where email = 'habid.hernandez@lapzo.com'
-- on conflict (user_id) do update set nivel = 'as', activo = true;
