-- TEST 1: Solo contar
SELECT COUNT(*) as total
FROM reservas
WHERE estado = 'CHECKED_IN'
  AND fecha_salida::date < CURRENT_DATE;

-- TEST 2: Solo ID
SELECT id
FROM reservas
WHERE estado = 'CHECKED_IN'
  AND fecha_salida::date < CURRENT_DATE;

-- TEST 3: ID + codigo_reserva
SELECT id, codigo_reserva
FROM reservas
WHERE estado = 'CHECKED_IN'
  AND fecha_salida::date < CURRENT_DATE;

-- TEST 4: Todo sin filtro de fecha
SELECT id, codigo_reserva, estado, habitacion_id
FROM reservas
WHERE estado = 'CHECKED_IN'
LIMIT 5;
