-- Agregar campo para habilitar cierre ciego de caja
-- Cuando está activo, el widget de turno oculta los montos en tiempo real

ALTER TABLE hotel_configuracion 
ADD COLUMN habilitar_cierre_ciego boolean DEFAULT true;

COMMENT ON COLUMN hotel_configuracion.habilitar_cierre_ciego IS 
'Si es true, el widget de turno activo oculta saldos/ingresos/egresos durante el turno. El cajero debe declarar sin ver los cálculos del sistema (cierre ciego). Si es false, muestra los montos en tiempo real.';
