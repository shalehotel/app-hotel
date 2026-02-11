-- AUDITORÍA SIMPLE: Sin JOIN para ver la reserva directamente

-- 1. La reserva existe?
SELECT 
    '🔍 RESERVA SIN JOIN' as tipo,
    id,
    codigo_reserva,
    estado,
    habitacion_id,
    fecha_entrada,
    fecha_salida,
    check_in_real,
    check_out_real,
    created_at
FROM reservas
WHERE estado = 'CHECKED_IN'
  AND fecha_salida::date < CURRENT_DATE;

-- 2. La habitación existe?
SELECT 
    '🏠 VERIFICAR HABITACION' as tipo,
    h.id,
    h.numero
FROM habitaciones h
WHERE h.id = (SELECT habitacion_id FROM reservas WHERE estado = 'CHECKED_IN' AND fecha_salida::date < CURRENT_DATE LIMIT 1);

-- 3. Por qué falla el JOIN?
SELECT 
    '❌ TEST JOIN' as tipo,
    r.id as reserva_id,
    r.codigo_reserva,
    r.habitacion_id,
    h.id as habitacion_id_join,
    h.numero
FROM reservas r
LEFT JOIN habitaciones h ON r.habitacion_id = h.id
WHERE r.estado = 'CHECKED_IN'
  AND r.fecha_salida::date < CURRENT_DATE;

-- 4. ¿Es problema de timezone o formato?
SELECT 
    '⏰ FECHAS Y TIMEZONE' as tipo,
    fecha_salida,
    fecha_salida::date as fecha_salida_date,
    CURRENT_DATE as hoy,
    (fecha_salida::date < CURRENT_DATE) as es_atrasado,
    CURRENT_DATE AT TIME ZONE 'America/Lima' as hoy_lima
FROM reservas
WHERE estado = 'CHECKED_IN'
  AND fecha_salida::date < CURRENT_DATE;
