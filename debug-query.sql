-- Query de diagnóstico: Verificar reservas con checkout atrasado
SELECT 
    r.codigo_reserva,
    r.estado,
    h.numero as habitacion,
    r.fecha_entrada,
    r.fecha_salida,
    CASE 
        WHEN r.fecha_salida < CURRENT_DATE AND r.estado = 'CHECKED_IN' 
        THEN 'CHECKOUT ATRASADO' 
        ELSE 'OK' 
    END as diagnostico
FROM reservas r
JOIN habitaciones h ON r.habitacion_id = h.id
WHERE r.estado = 'CHECKED_IN'
    AND r.fecha_salida < CURRENT_DATE
ORDER BY r.fecha_salida;
