-- ============================================================================
-- MIGRACIÓN MAESTRA CONSOLIDADA - CORRECCIONES CAJA Y FACTURACIÓN
-- ============================================================================
-- Este archivo consolida TODAS las correcciones aplicadas a las funciones
-- y vistas relacionadas con caja, devoluciones y facturación.
-- 
-- VERSIÓN: 1.0 - 2026-01-31
-- 
-- CONTENIDO:
-- 1. Vista vw_reservas_con_datos_basicos
-- 2. Vista vw_historial_comprobantes (con método de pago)
-- 3. Función registrar_cobro_completo (ingresos limpios)
-- 4. Función procesar_devolucion_atomica (devoluciones inmediatas)
-- 5. Función marcar_devolucion_procesada (devoluciones diferidas)
-- 
-- REEMPLAZA A:
-- - 20260127180000_fix_reservas_view.sql
-- - 20260128133000_fix_refund_session_logic.sql
-- - 20260128173000_add_method_to_billing_view.sql
-- - 20260130000000_update_all_fixes.sql
-- - 20260130104500_fix_refund_movements_complete.sql
-- - 20260130113000_holistic_fixes_v2.sql
-- - 20260130115000_fix_deferred_refund_description.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VISTA: RESERVAS CON DATOS BÁSICOS
-- ============================================================================
-- Propósito: Vista simplificada de reservas con datos del huésped titular
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

-- ============================================================================
-- 2. VISTA: HISTORIAL DE COMPROBANTES (CON MÉTODO DE PAGO)
-- ============================================================================
-- Propósito: Vista de comprobantes que incluye el método de pago asociado
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

    -- MÉTODO DE PAGO (agregado de pagos asociados)
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

-- ============================================================================
-- 3. FUNCIÓN: REGISTRAR COBRO COMPLETO
-- ============================================================================
-- Propósito: Registra un cobro con comprobante, pago y movimiento de caja
-- Corrección: Descripción limpia (sin concatenar método) + columna metodo_pago poblada
CREATE OR REPLACE FUNCTION registrar_cobro_completo(
    p_turno_caja_id uuid, p_reserva_id uuid, p_tipo_comprobante text, p_serie text, 
    p_receptor_tipo_doc text, p_receptor_nro_doc text, p_receptor_razon_social text, p_receptor_direccion text,
    p_moneda text, p_tipo_cambio numeric, p_op_gravadas numeric, p_op_exoneradas numeric, p_monto_igv numeric, p_total_venta numeric,
    p_metodo_pago text, p_monto_pago numeric, p_referencia_pago text, p_nota text, p_idempotency_key text, p_usuario_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_correlativo bigint; 
    v_comprobante_id uuid; 
    v_pago_id uuid; 
    v_numero_completo text; 
    v_codigo_reserva text;
BEGIN
    -- Idempotencia
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_pago_id FROM public.pagos WHERE idempotency_key = p_idempotency_key;
        IF v_pago_id IS NOT NULL THEN 
            RETURN jsonb_build_object('success', true, 'message', 'Idempotente', 'pago_id', v_pago_id); 
        END IF;
    END IF;

    -- Obtener y actualizar correlativo
    SELECT correlativo_actual + 1 INTO v_correlativo 
    FROM public.series_comprobante 
    WHERE serie = p_serie AND tipo_comprobante = p_tipo_comprobante::tipo_comprobante_enum 
    FOR UPDATE;
    
    IF v_correlativo IS NULL THEN 
        RAISE EXCEPTION 'Serie no encontrada'; 
    END IF;
    
    UPDATE series_comprobante 
    SET correlativo_actual = v_correlativo 
    WHERE serie = p_serie AND tipo_comprobante = p_tipo_comprobante::tipo_comprobante_enum;
    
    v_numero_completo := p_serie || '-' || LPAD(v_correlativo::text, 8, '0');
    
    -- Insertar comprobante
    INSERT INTO public.comprobantes (
        turno_caja_id, reserva_id, tipo_comprobante, serie, numero, 
        receptor_tipo_doc, receptor_nro_doc, receptor_razon_social, receptor_direccion, 
        moneda, tipo_cambio, op_gravadas, op_exoneradas, monto_igv, total_venta, 
        estado_sunat, fecha_emision
    ) VALUES (
        p_turno_caja_id, p_reserva_id, p_tipo_comprobante::tipo_comprobante_enum, p_serie, v_correlativo, 
        p_receptor_tipo_doc, p_receptor_nro_doc, p_receptor_razon_social, p_receptor_direccion, 
        p_moneda::moneda_enum, p_tipo_cambio, p_op_gravadas, p_op_exoneradas, p_monto_igv, p_total_venta, 
        'PENDIENTE', now()
    ) RETURNING id INTO v_comprobante_id;
    
    -- Insertar pago
    INSERT INTO public.pagos (
        reserva_id, caja_turno_id, comprobante_id, metodo_pago, moneda_pago, 
        monto, tipo_cambio_pago, referencia_pago, nota, idempotency_key, fecha_pago
    ) VALUES (
        p_reserva_id, p_turno_caja_id, v_comprobante_id, p_metodo_pago, p_moneda::moneda_enum, 
        p_monto_pago, p_tipo_cambio, p_referencia_pago, p_nota, p_idempotency_key, now()
    ) RETURNING id INTO v_pago_id;
    
    -- Obtener código de reserva para el motivo
    SELECT codigo_reserva INTO v_codigo_reserva FROM public.reservas WHERE id = p_reserva_id;
    
    -- Insertar movimiento de caja (INGRESO)
    -- CORRECCIÓN: Motivo limpio sin concatenar método, método en columna separada
    INSERT INTO public.caja_movimientos (
        caja_turno_id, usuario_id, tipo, categoria, moneda, monto, 
        motivo, comprobante_referencia, metodo_pago
    ) VALUES (
        p_turno_caja_id, p_usuario_id, 'INGRESO', 'COBRO_SERVICIO', p_moneda::moneda_enum, p_monto_pago, 
        'Cobro Reserva ' || COALESCE(v_codigo_reserva, p_reserva_id::text), 
        v_numero_completo, 
        p_metodo_pago
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'comprobante_id', v_comprobante_id, 
        'pago_id', v_pago_id, 
        'numero_completo', v_numero_completo, 
        'correlativo', v_correlativo
    );
    
EXCEPTION WHEN OTHERS THEN 
    RAISE WARNING 'Error en registrar_cobro_completo: %', SQLERRM; 
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ============================================================================
-- 4. FUNCIÓN: PROCESAR DEVOLUCIÓN ATÓMICA (INMEDIATA)
-- ============================================================================
-- Propósito: Procesa acortamiento de estadía con devolución inmediata
-- Correcciones:
--   1. Descripción unificada: "Devolución por acortamiento de estadía (X noches)"
--   2. NO crea movimiento de caja si método es PENDIENTE (evita egresos falsos)
--   3. Registra movimiento para TODOS los métodos reales (Efectivo, Yape, etc)
CREATE OR REPLACE FUNCTION procesar_devolucion_atomica(
    p_reserva_id uuid, 
    p_nueva_fecha_salida date, 
    p_monto_devolucion numeric, 
    p_metodo_devolucion text, 
    p_dias_devueltos integer,
    p_emitir_nc boolean DEFAULT false, 
    p_comprobante_original_id uuid DEFAULT NULL, 
    p_motivo_nc text DEFAULT NULL,
    p_turno_id uuid DEFAULT NULL, 
    p_usuario_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_reserva record; 
    v_pago_id uuid; 
    v_movimiento_id uuid; 
    v_metodo_pago_final text; 
    v_motivo_texto text;
BEGIN
    -- Bloquear reserva
    SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
    IF v_reserva IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada'); 
    END IF;
    
    -- Idempotencia
    IF p_nueva_fecha_salida = v_reserva.fecha_salida::date THEN 
        RETURN jsonb_build_object('success', true, 'mensaje', 'Ya actualizado'); 
    END IF;
    IF p_nueva_fecha_salida > v_reserva.fecha_salida::date THEN 
        RETURN jsonb_build_object('success', false, 'error', 'La nueva fecha debe ser anterior'); 
    END IF;
    
    -- Actualizar fecha de salida
    UPDATE public.reservas 
    SET fecha_salida = (p_nueva_fecha_salida::text || 'T12:00:00Z')::timestamptz 
    WHERE id = p_reserva_id;
    
    -- Preparar método de pago final
    v_metodo_pago_final := 'DEVOLUCION_' || p_metodo_devolucion;
    
    -- Descripción unificada (misma que se usará en movimientos)
    v_motivo_texto := 'Devolución por acortamiento de estadía (' || p_dias_devueltos || ' noches)';
    
    -- Insertar pago (negativo)
    INSERT INTO public.pagos (
        reserva_id, caja_turno_id, comprobante_id, metodo_pago, moneda_pago, 
        monto, tipo_cambio_pago, nota, fecha_pago
    ) VALUES (
        p_reserva_id, p_turno_id, NULL, v_metodo_pago_final, v_reserva.moneda_pactada, 
        -p_monto_devolucion, 1.0, v_motivo_texto, now()
    ) RETURNING id INTO v_pago_id;
    
    -- CORRECCIÓN CRÍTICA: Solo crear movimiento si NO es PENDIENTE
    -- Si es PENDIENTE, el movimiento se creará cuando se procese la devolución diferida
    IF p_turno_id IS NOT NULL AND p_metodo_devolucion != 'PENDIENTE' THEN
        INSERT INTO public.caja_movimientos (
            caja_turno_id, usuario_id, tipo, categoria, moneda, monto, 
            motivo, comprobante_referencia, metodo_pago
        ) VALUES (
            p_turno_id, p_usuario_id, 'EGRESO', 'DEVOLUCION', v_reserva.moneda_pactada, p_monto_devolucion, 
            v_motivo_texto, v_reserva.codigo_reserva, p_metodo_devolucion
        ) RETURNING id INTO v_movimiento_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'pago_id', v_pago_id);
    
EXCEPTION WHEN OTHERS THEN 
    RAISE WARNING 'Error en procesar_devolucion_atomica: %', SQLERRM; 
    RETURN jsonb_build_object('success', false, 'error', SQLERRM); 
END; $$;

-- ============================================================================
-- 5. FUNCIÓN: MARCAR DEVOLUCIÓN PROCESADA (DIFERIDA)
-- ============================================================================
-- Propósito: Procesa una devolución pendiente desde el dashboard
-- Correcciones:
--   1. Usa la nota original del pago como descripción (hereda del rack)
--   2. Mueve el pago al turno actual
--   3. Crea movimiento de caja con método real
CREATE OR REPLACE FUNCTION marcar_devolucion_procesada(
    p_pago_id uuid, 
    p_metodo_real text, 
    p_nota_adicional text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_pago record; 
    v_turno_activo uuid;
    v_motivo_movimiento text;
BEGIN
    -- 1. Obtener turno activo
    SELECT id INTO v_turno_activo FROM public.caja_turnos WHERE estado = 'ABIERTA' LIMIT 1;
    
    IF v_turno_activo IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'No hay turno de caja abierto para procesar la devolución'); 
    END IF;

    -- 2. Bloquear y validar pago pendiente
    SELECT * INTO v_pago 
    FROM public.pagos 
    WHERE id = p_pago_id AND metodo_pago LIKE '%PENDIENTE%' 
    FOR UPDATE;
    
    IF v_pago IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya procesado'); 
    END IF;

    -- 3. Determinar motivo del movimiento
    -- Usar la nota original (ej: "Devolución por acortamiento de estadía (2 noches)")
    -- Si es la nota genérica antigua, usar fallback
    v_motivo_movimiento := v_pago.nota;
    IF v_motivo_movimiento IS NULL OR v_motivo_movimiento = 'Devolución: PENDIENTE' THEN
        v_motivo_movimiento := 'Devolución diferida completada';
    END IF;

    -- 4. Actualizar el pago: método real, turno actual, fecha actual
    UPDATE public.pagos 
    SET 
        metodo_pago = p_metodo_real, 
        nota = COALESCE(nota, '') || ' | Procesado con: ' || p_metodo_real, 
        fecha_pago = now(),
        caja_turno_id = v_turno_activo
    WHERE id = p_pago_id;

    -- 5. Insertar movimiento de caja (EGRESO)
    INSERT INTO public.caja_movimientos (
        caja_turno_id, usuario_id, tipo, categoria, moneda, monto, 
        motivo, comprobante_referencia, metodo_pago
    ) VALUES (
        v_turno_activo, auth.uid(), 'EGRESO', 'DEVOLUCION_PROCESADA', v_pago.moneda_pago, ABS(v_pago.monto), 
        v_motivo_movimiento, NULL, p_metodo_real
    );

    RETURN jsonb_build_object('success', true, 'movimiento_caja_id', v_turno_activo);
    
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE WARNING 'Error en marcar_devolucion_procesada: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM); 
END; $$;

COMMIT;

-- ============================================================================
-- FIN DE MIGRACIÓN CONSOLIDADA
-- ============================================================================
