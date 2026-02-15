-- =============================================
-- MIGRACIÓN: RLS CON POLÍTICAS POR ROL
-- FECHA: 2026-02-14
-- BRANCH: rls-update
-- =============================================
-- DESCRIPCIÓN:
--   Habilita Row Level Security en TODAS las tablas
--   con políticas basadas en los 3 roles del sistema:
--     ADMIN        → acceso total a todo
--     RECEPCION    → acceso operativo (reservas, pagos, comprobantes, huéspedes, caja)
--     HOUSEKEEPING → solo habitaciones (lectura + actualizar limpieza)
--
-- NOTA: Las funciones RPC con SECURITY DEFINER (realizar_checkin_atomico,
--   registrar_cobro_completo, etc.) NO se ven afectadas por RLS porque
--   se ejecutan con permisos del owner (postgres), no del usuario.
-- =============================================

-- =============================================
-- 1. FUNCIÓN AUXILIAR: Obtener rol del usuario actual
-- =============================================
-- STABLE = PostgreSQL puede cachear el resultado dentro de un statement
-- Esto evita N subconsultas a la tabla usuarios por cada fila evaluada.

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT rol::text FROM public.usuarios WHERE id = auth.uid()
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- =============================================
-- 2. HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_comprobante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_habitacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_habitacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canales_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.huespedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserva_huespedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobante_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. POLÍTICAS: ADMIN → ACCESO TOTAL
-- =============================================
-- Una sola política por tabla que da acceso completo al ADMIN.

CREATE POLICY admin_full_access ON public.usuarios
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.audit_log
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.hotel_configuracion
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.cajas
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.series_comprobante
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.caja_turnos
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.caja_movimientos
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.tipos_habitacion
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.categorias_habitacion
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.canales_venta
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.tarifas
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.habitaciones
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.huespedes
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.reservas
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.reserva_huespedes
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.comprobantes
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.comprobante_detalles
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

CREATE POLICY admin_full_access ON public.pagos
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'ADMIN')
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- =============================================
-- 4. POLÍTICAS: RECEPCION
-- =============================================
-- RECEPCION puede operar reservas, pagos, comprobantes,
-- huéspedes, caja. Lectura en tablas de configuración.

-- usuarios: leer todos (necesita para mostrar nombres), actualizar solo el propio
CREATE POLICY recepcion_read_usuarios ON public.usuarios
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

CREATE POLICY recepcion_update_self ON public.usuarios
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'RECEPCION' AND id = auth.uid())
  WITH CHECK (public.get_my_role() = 'RECEPCION' AND id = auth.uid());

-- audit_log: solo lectura
CREATE POLICY recepcion_read_audit ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- hotel_configuracion: solo lectura (necesita RUC, IGV, etc. para facturar)
CREATE POLICY recepcion_read_config ON public.hotel_configuracion
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- cajas: solo lectura (para seleccionar caja al abrir turno)
CREATE POLICY recepcion_read_cajas ON public.cajas
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- series_comprobante: solo lectura (para seleccionar serie al emitir)
CREATE POLICY recepcion_read_series ON public.series_comprobante
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- caja_turnos: acceso completo (abrir, operar, cerrar su turno)
CREATE POLICY recepcion_full_turnos ON public.caja_turnos
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- caja_movimientos: acceso completo (registrar ingresos/egresos)
CREATE POLICY recepcion_full_movimientos ON public.caja_movimientos
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- tipos_habitacion: solo lectura
CREATE POLICY recepcion_read_tipos ON public.tipos_habitacion
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- categorias_habitacion: solo lectura
CREATE POLICY recepcion_read_categorias ON public.categorias_habitacion
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- canales_venta: solo lectura
CREATE POLICY recepcion_read_canales ON public.canales_venta
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- tarifas: solo lectura (para precios sugeridos)
CREATE POLICY recepcion_read_tarifas ON public.tarifas
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

-- habitaciones: leer y actualizar (cambio de estado en checkin/checkout)
CREATE POLICY recepcion_read_habitaciones ON public.habitaciones
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'RECEPCION');

CREATE POLICY recepcion_update_habitaciones ON public.habitaciones
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- huespedes: acceso completo (crear, editar, buscar)
CREATE POLICY recepcion_full_huespedes ON public.huespedes
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- reservas: acceso completo
CREATE POLICY recepcion_full_reservas ON public.reservas
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- reserva_huespedes: acceso completo
CREATE POLICY recepcion_full_reserva_huespedes ON public.reserva_huespedes
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- comprobantes: acceso completo (emitir, actualizar estado SUNAT)
CREATE POLICY recepcion_full_comprobantes ON public.comprobantes
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- comprobante_detalles: acceso completo
CREATE POLICY recepcion_full_detalles ON public.comprobante_detalles
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- pagos: acceso completo (cobrar, ver historial)
CREATE POLICY recepcion_full_pagos ON public.pagos
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'RECEPCION')
  WITH CHECK (public.get_my_role() = 'RECEPCION');

-- =============================================
-- 5. POLÍTICAS: HOUSEKEEPING
-- =============================================
-- HOUSEKEEPING solo necesita:
--   - Ver habitaciones y sus tipos/categorías
--   - Actualizar estado de limpieza
--   - Ver reservas (para saber qué habitaciones se desocupan)

-- usuarios: leer solo su propio perfil
CREATE POLICY housekeeping_read_self ON public.usuarios
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING' AND id = auth.uid());

-- tipos_habitacion: lectura (para mostrar info de la habitación)
CREATE POLICY housekeeping_read_tipos ON public.tipos_habitacion
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING');

-- categorias_habitacion: lectura
CREATE POLICY housekeeping_read_categorias ON public.categorias_habitacion
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING');

-- habitaciones: leer todas + actualizar estado_limpieza
CREATE POLICY housekeeping_read_habitaciones ON public.habitaciones
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING');

CREATE POLICY housekeeping_update_limpieza ON public.habitaciones
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING')
  WITH CHECK (public.get_my_role() = 'HOUSEKEEPING');

-- reservas: solo lectura (para ver qué habitaciones están ocupadas/desocupándose)
CREATE POLICY housekeeping_read_reservas ON public.reservas
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING');

-- reserva_huespedes: solo lectura
CREATE POLICY housekeeping_read_rh ON public.reserva_huespedes
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING');

-- huespedes: solo lectura (para ver nombre del huésped en la habitación)
CREATE POLICY housekeeping_read_huespedes ON public.huespedes
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'HOUSEKEEPING');

-- =============================================
-- 6. POLÍTICAS PARA service_role (BYPASS)
-- =============================================
-- El service_role ya bypasa RLS automáticamente en Supabase.
-- No necesita políticas adicionales.
-- Las funciones SECURITY DEFINER también bypasan RLS.

-- =============================================
-- 7. FIN
-- =============================================
DO $$ BEGIN
  RAISE NOTICE '✅ RLS HABILITADO: Políticas por rol (ADMIN/RECEPCION/HOUSEKEEPING) aplicadas en 17 tablas';
END $$;
