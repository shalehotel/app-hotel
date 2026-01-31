-- ============================================================================
-- MIGRACIÓN COMBINADA: CORRECCIONES DE RESERVAS, CAJA Y FACTURACIÓN
-- ============================================================================
-- Incluye:
-- 1. 20260127180000_fix_reservas_view.sql
-- 2. 20260128133000_fix_refund_session_logic.sql
-- 3. 20260128173000_add_method_to_billing_view.sql

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CORRECCIÓN VISTA DE RESERVAS
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. CORRECCIÓN LÓGICA DE SESIÓN EN REEMBOLSOS (FIX REFUND SESSION LOGIC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marcar_devolucion_procesada(p_pago_id uuid, p_metodo_real text, p_nota_adicional text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_pago record; 
    v_turno_activo uuid;
BEGIN
    -- 1. Obtener turno activo (para mover el pago a este turno)
    SELECT id INTO v_turno_activo FROM public.caja_turnos WHERE estado = 'ABIERTA' LIMIT 1;
    
    IF v_turno_activo IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'No hay turno de caja abierto para procesar la devolución'); 
    END IF;

    -- 2. Bloquear y validar pago
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id AND metodo_pago = 'DEVOLUCION_PENDIENTE' FOR UPDATE;
    
    IF v_pago IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya procesado'); 
    END IF;

    -- 3. Actualizar el pago: método real, fecha actual, Y EL TURNO ACTUAL
    -- Al cambiar caja_turno_id, el egreso aparecerá en el reporte del turno actual (sea Yape, Efectivo, etc).
    UPDATE public.pagos 
    SET 
        metodo_pago = p_metodo_real, 
        nota = COALESCE(nota, '') || ' | Procesado con: ' || p_metodo_real, 
        fecha_pago = now(),
        caja_turno_id = v_turno_activo
    WHERE id = p_pago_id;

    -- 4. Insertar movimiento de caja (EGRESO) para TODOS los métodos
    -- Esto garantiza unicidad en el flujo de caja (si entra Yape, debe salir Yape)
    INSERT INTO public.caja_movimientos (caja_turno_id, usuario_id, tipo, categoria, moneda, monto, motivo, comprobante_referencia, metodo_pago)
    VALUES (v_turno_activo, auth.uid(), 'EGRESO', 'DEVOLUCION_PROCESADA', v_pago.moneda_pago, ABS(v_pago.monto), 'Devolución diferida completada', NULL, p_metodo_real);

    RETURN jsonb_build_object('success', true, 'movimiento_caja_id', v_turno_activo);
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE WARNING 'Error en marcar_devolucion_procesada: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM); 
END; $$;

-- ----------------------------------------------------------------------------
-- 3. AGREGAR MÉTODO DE PAGO A VISTA DE FACTURACIÓN
-- ----------------------------------------------------------------------------
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

COMMIT;
