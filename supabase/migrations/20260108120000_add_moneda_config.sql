-- =============================================
-- MIGRACIÓN: AGREGAR CAMPO MONEDA PRINCIPAL
-- =============================================

ALTER TABLE public.hotel_configuracion 
ADD COLUMN IF NOT EXISTS moneda_principal text DEFAULT 'PEN';

-- Actualizar comentario
COMMENT ON COLUMN public.hotel_configuracion.moneda_principal IS 'Moneda base del sistema (PEN/USD)';

-- Confirmación
SELECT '✅ Migración completada: moneda_principal agregada' as status;
