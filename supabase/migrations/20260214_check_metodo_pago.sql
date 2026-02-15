-- =============================================
-- MIGRACIÓN: CHECK constraint en pagos.metodo_pago
-- FECHA: 2026-02-14
-- =============================================
-- Restringe pagos.metodo_pago a valores válidos.
-- Incluye todos los métodos directos + todas las combinaciones
-- de devolución generadas por procesar_devolucion_atomica()
-- (que hace: 'DEVOLUCION_' || metodo_devolucion)
-- =============================================

ALTER TABLE public.pagos
ADD CONSTRAINT check_metodo_pago_valido
CHECK (metodo_pago IN (
  -- Métodos directos
  'EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN',
  -- Devoluciones (generados por RPC: 'DEVOLUCION_' || metodo)
  'DEVOLUCION_EFECTIVO', 'DEVOLUCION_TARJETA', 'DEVOLUCION_TRANSFERENCIA',
  'DEVOLUCION_YAPE', 'DEVOLUCION_PLIN', 'DEVOLUCION_PENDIENTE'
));

-- Lo mismo para caja_movimientos.metodo_pago (también es text libre)
ALTER TABLE public.caja_movimientos
ADD CONSTRAINT check_mov_metodo_pago_valido
CHECK (metodo_pago IS NULL OR metodo_pago IN (
  'EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN',
  'DEVOLUCION_EFECTIVO', 'DEVOLUCION_TARJETA', 'DEVOLUCION_TRANSFERENCIA',
  'DEVOLUCION_YAPE', 'DEVOLUCION_PLIN', 'DEVOLUCION_PENDIENTE'
));

DO $$ BEGIN
  RAISE NOTICE '✅ CHECK constraints aplicados en pagos.metodo_pago y caja_movimientos.metodo_pago';
END $$;
