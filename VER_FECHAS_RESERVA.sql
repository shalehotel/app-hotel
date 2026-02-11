-- Ver las fechas de la reserva específica
SELECT 
    id,
    codigo_reserva,
    estado,
    habitacion_id,
    fecha_entrada,
    fecha_salida,
    fecha_salida::date as fecha_salida_solo_fecha,
    CURRENT_DATE as hoy,
    fecha_salida::date < CURRENT_DATE as cumple_filtro,
    CURRENT_DATE - fecha_salida::date as dias_diferencia
FROM reservas
WHERE id = '904b26cc-89a6-47f2-b150-5a535418d15a';
