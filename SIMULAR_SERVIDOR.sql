-- SIMULAR EXACTAMENTE getRackReservas() del servidor
-- fechaInicio = 2026-02-08, fechaFin = 2026-03-10

SELECT 
    r.id,
    r.codigo_reserva,
    r.habitacion_id,
    r.fecha_entrada,
    r.fecha_salida,
    r.estado,
    h.numero as habitacion_numero,
    COUNT(DISTINCT rh.id) as huespedes_count
FROM reservas r
INNER JOIN reserva_huespedes rh ON rh.reserva_id = r.id
INNER JOIN huespedes hues ON hues.id = rh.huesped_id
LEFT JOIN habitaciones h ON h.id = r.habitacion_id
WHERE r.fecha_salida >= '2026-02-08'::timestamptz
  AND r.fecha_entrada <= '2026-03-10'::timestamptz
  AND r.estado IN ('RESERVADA', 'CHECKED_IN')
GROUP BY r.id, r.codigo_reserva, r.habitacion_id, r.fecha_entrada, r.fecha_salida, r.estado, h.numero
ORDER BY r.fecha_entrada;
