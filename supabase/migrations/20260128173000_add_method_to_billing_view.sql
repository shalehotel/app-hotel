-- Actualizar vista para incluir el método de pago (agregado)
CREATE OR REPLACE VIEW public.vw_historial_comprobantes AS
SELECT 
    c.id,
    c.fecha_emision,
    c.tipo_comprobante,
    c.serie,
    c.numero,
    c.serie || '-' || LPAD(c.numero::text, 8, '0') as numero_completo,
    
    -- DATOS CLIENTE
    c.receptor_razon_social as cliente_nombre,
    c.receptor_tipo_doc as cliente_tipo_doc,
    c.receptor_nro_doc as cliente_doc,
    c.receptor_direccion,
    
    -- MONTOS
    c.moneda,
    c.tipo_cambio,
    c.op_gravadas,
    c.op_exoneradas,
    c.op_inafectas,
    c.monto_igv,
    c.total_venta,
    
    -- ESTADO SUNAT Y URLS
    c.estado_sunat,
    c.xml_url,
    c.cdr_url,
    c.pdf_url,
    c.hash_cpe,
    c.external_id,
    
    -- REFERENCIAS ID
    c.reserva_id,
    c.nota_credito_ref_id,
    c.turno_caja_id,
    ct.usuario_id,
    ct.caja_id,
    
    -- METADATA ADICIONAL
    r.codigo_reserva,
    u.nombres || ' ' || COALESCE(u.apellidos, '') as emisor_nombre,
    u.rol as emisor_rol,

    -- MÉTODO DE PAGO (Nuevo Campo)
    -- Obtenemos los métodos de pago únicos asociados a este comprobante
    (
        SELECT string_agg(DISTINCT p.metodo_pago, ', ')
        FROM public.pagos p 
        WHERE p.comprobante_id = c.id
    ) as metodo_pago
    
FROM public.comprobantes c
JOIN public.caja_turnos ct ON c.turno_caja_id = ct.id
JOIN public.usuarios u ON ct.usuario_id = u.id
LEFT JOIN public.reservas r ON c.reserva_id = r.id
ORDER BY c.fecha_emision DESC;
