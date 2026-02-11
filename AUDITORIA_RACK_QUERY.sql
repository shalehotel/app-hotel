-- AUDITORÍA EXTREMA: Verificar si realmente existe reserva con checkout atrasado
-- Hoy es 11-feb-2026

-- 1. ¿HAY RESERVAS CON CHECKOUT AT RASADO?
SELECT 
    'DIAGNÓSTICO: RESERVAS CON CHECKOUT ATRASADO' as tipo,
    r.id,
    r.codigo_reserva,
    r.estado,
    h.numero as habitacion,
    r.fecha_entrada,
    r.fecha_salida,
    r.check_in_real,
    r.check_out_real,
    CASE 
        WHEN r.fecha_salida::date < CURRENT_DATE AND r.estado = 'CHECKED_IN' 
        THEN '🔴 CHECKOUT ATRASADO (' || (CURRENT_DATE - r.fecha_salida::date) || ' días)' 
        ELSE '✅ OK' 
    END as diagnostico
FROM reservas r
JOIN habitaciones h ON r.habitacion_id = h.id
WHERE r.estado = 'CHECKED_IN'
  AND r.fecha_salida::date < CURRENT_DATE
ORDER BY r.fecha_salida;

-- 2. ¿QUÉ RESERVAS APARECEN EN LAS ALERTAS?
SELECT 
    '>>> ALERTAS: CHECKOUT TARDE (lo que ves en el sistema)' as tipo,
    r.id,
    r.codigo_reserva,
    h.numero as habitacion,
    r.fecha_salida,
    r.estado
FROM reservas r
JOIN habitaciones h ON r.habitacion_id = h.id
WHERE r.fecha_salida < (CURRENT_DATE AT TIME ZONE 'America/Lima')
  AND r.estado = 'CHECKED_IN'
LIMIT 5;

-- 3. ¿QUÉ TRAE LA QUERY DEL RACK?
-- Simular: hoy=11-feb, startDate=08-feb (3 días atrás), endDate=08-marzo (30 días totales)
SELECT 
    '>>> RACK: Lo que debería traer getRackReservas()' as tipo,
    r.id,
    r.codigo_reserva,
    h.numero as habitacion,
    r.fecha_entrada,
    r.fecha_salida,
    r.estado,
    CASE 
        WHEN r.fecha_salida >= '2026-02-08'::date 
         AND r.fecha_entrada <= '2026-03-10'::date 
         AND r.estado IN ('RESERVADA', 'CHECKED_IN')
        THEN '✅ PASA FILTROS'
        ELSE '❌ NO PASA'
    END as pasa_filtros
FROM reservas r
JOIN habitaciones h ON r.habitacion_id = h.id
WHERE r.fecha_salida >= '2026-02-08'::timestamptz  -- fecha_salida >= startDate
  AND r.fecha_entrada <= '2026-03-10'::timestamptz -- fecha_entrada <= endDate
  AND r.estado IN ('RESERVADA', 'CHECKED_IN')
ORDER BY r.fecha_entrada;

-- 4. RESUMEN EJECUTIVO
SELECT 
    '📊 RESUMEN' as reporte,
    (SELECT COUNT(*) FROM reservas WHERE estado = 'CHECKED_IN') as total_checked_in,
    (SELECT COUNT(*) FROM reservas WHERE estado = 'CHECKED_IN' AND fecha_salida::date < CURRENT_DATE) as con_checkout_atrasado,
    (SELECT COUNT(*) FROM reservas WHERE estado = 'CHECKED_IN' AND fecha_salida::date = '2026-02-10') as checkout_ayer_10feb;
