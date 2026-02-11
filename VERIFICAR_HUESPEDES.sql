-- ¿La reserva tiene huéspedes asociados?
SELECT 
    r.id as reserva_id,
    r.codigo_reserva,
    r.estado,
    COUNT(rh.id) as cantidad_huespedes,
    CASE 
        WHEN COUNT(rh.id) = 0 THEN '❌ SIN HUÉSPEDES - Por eso no aparece en el rack'
        ELSE '✅ TIENE HUÉSPEDES'
    END as diagnostico
FROM reservas r
LEFT JOIN reserva_huespedes rh ON rh.reserva_id = r.id
WHERE r.id = '904b26cc-89a6-47f2-b150-5a535418d15a'
GROUP BY r.id, r.codigo_reserva, r.estado;

-- Ver todos los huéspedes de esta reserva
SELECT 
    rh.id,
    rh.reserva_id,
    rh.huesped_id,
    h.nombres,
    h.apellidos
FROM reserva_huespedes rh
JOIN huespedes h ON h.id = rh.huesped_id
WHERE rh.reserva_id = '904b26cc-89a6-47f2-b150-5a535418d15a';
