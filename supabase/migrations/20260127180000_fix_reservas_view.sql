CREATE OR REPLACE VIEW public.vw_reservas_con_datos_basicos AS
SELECT 
    r.id, 
    r.codigo_reserva, 
    r.estado, 
    r.fecha_entrada, 
    r.fecha_salida, 
    r.check_in_real, 
    r.check_out_real, 
    r.precio_pactado, 
    r.moneda_pactada, 
    r.huesped_presente,
    h.numero as habitacion_numero, 
    hue.nombres || ' ' || hue.apellidos as titular_nombre,
    hue.tipo_documento as titular_tipo_doc,
    hue.numero_documento as titular_numero_doc
FROM public.reservas r 
JOIN public.habitaciones h ON r.habitacion_id = h.id 
LEFT JOIN public.reserva_huespedes rh ON r.id = rh.reserva_id AND rh.es_titular = true 
LEFT JOIN public.huespedes hue ON rh.huesped_id = hue.id
WHERE r.estado IN ('RESERVADA', 'CHECKED_IN', 'CHECKED_OUT') 
ORDER BY r.fecha_entrada DESC;
