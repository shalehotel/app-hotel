-- =============================================
-- MIGRACIÓN: Fixes menores de auditoría
-- FECHA: 2026-02-14
-- =============================================
-- 1. Índice faltante en comprobante_detalles(comprobante_id)
-- 2. REPLICA IDENTITY FULL en caja_turnos (para realtime updates completos)
-- =============================================

-- 1. Índice en comprobante_detalles
-- Sin este índice, cada JOIN o WHERE por comprobante_id hace full table scan
CREATE INDEX IF NOT EXISTS idx_comprobante_detalles_comprobante
  ON public.comprobante_detalles(comprobante_id);

-- 2. REPLICA IDENTITY FULL en caja_turnos
-- Ya tiene realtime habilitado pero sin REPLICA IDENTITY FULL,
-- los UPDATE events no envían todos los campos al cliente
ALTER TABLE public.caja_turnos REPLICA IDENTITY FULL;

DO $$ BEGIN
  RAISE NOTICE '✅ Índice comprobante_detalles + REPLICA IDENTITY caja_turnos aplicados';
END $$;
