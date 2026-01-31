-- MIGRACIÓN HOLÍSTICA V2: SOLUCIÓN DEFINITIVA A INCONSISTENCIAS DE CAJA
-- 1. Corrige formato de Ingresos (Elimina redundancia en descripción).
-- 2. Corrige Bug Crítico de Devolución Pendiente (Evita crear egresos falsos).
-- 3. Unifica descripciones de movimientos.

BEGIN;

-- ============================================================================
-- 1. CORREGIR INGRESO (Registrar Cobro Completo)
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_cobro_completo(
    p_turno_caja_id uuid, p_reserva_id uuid, p_tipo_comprobante text, p_serie text, 
    p_receptor_tipo_doc text, p_receptor_nro_doc text, p_receptor_razon_social text, p_receptor_direccion text,
    p_moneda text, p_tipo_cambio numeric, p_op_gravadas numeric, p_op_exoneradas numeric, p_monto_igv numeric, p_total_venta numeric,
    p_metodo_pago text, p_monto_pago numeric, p_referencia_pago text, p_nota text, p_idempotency_key text, p_usuario_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_correlativo bigint; v_comprobante_id uuid; v_pago_id uuid; v_numero_completo text; v_codigo_reserva text;
BEGIN
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_pago_id FROM public.pagos WHERE idempotency_key = p_idempotency_key;
        IF v_pago_id IS NOT NULL THEN RETURN jsonb_build_object('success', true, 'message', 'Idempotente', 'pago_id', v_pago_id); END IF;
    END IF;

    SELECT correlativo_actual + 1 INTO v_correlativo FROM public.series_comprobante WHERE serie = p_serie AND tipo_comprobante = p_tipo_comprobante::tipo_comprobante_enum FOR UPDATE;
    IF v_correlativo IS NULL THEN RAISE EXCEPTION 'Serie no encontrada'; END IF;
    UPDATE series_comprobante SET correlativo_actual = v_correlativo WHERE serie = p_serie AND tipo_comprobante = p_tipo_comprobante::tipo_comprobante_enum;
    v_numero_completo := p_serie || '-' || LPAD(v_correlativo::text, 8, '0');
    
    INSERT INTO public.comprobantes (turno_caja_id, reserva_id, tipo_comprobante, serie, numero, receptor_tipo_doc, receptor_nro_doc, receptor_razon_social, receptor_direccion, moneda, tipo_cambio, op_gravadas, op_exoneradas, monto_igv, total_venta, estado_sunat, fecha_emision)
    VALUES (p_turno_caja_id, p_reserva_id, p_tipo_comprobante::tipo_comprobante_enum, p_serie, v_correlativo, p_receptor_tipo_doc, p_receptor_nro_doc, p_receptor_razon_social, p_receptor_direccion, p_moneda::moneda_enum, p_tipo_cambio, p_op_gravadas, p_op_exoneradas, p_monto_igv, p_total_venta, 'PENDIENTE', now()) RETURNING id INTO v_comprobante_id;
    
    INSERT INTO public.pagos (reserva_id, caja_turno_id, comprobante_id, metodo_pago, moneda_pago, monto, tipo_cambio_pago, referencia_pago, nota, idempotency_key, fecha_pago)
    VALUES (p_reserva_id, p_turno_caja_id, v_comprobante_id, p_metodo_pago, p_moneda::moneda_enum, p_monto_pago, p_tipo_cambio, p_referencia_pago, p_nota, p_idempotency_key, now()) RETURNING id INTO v_pago_id;
    
    SELECT codigo_reserva INTO v_codigo_reserva FROM public.reservas WHERE id = p_reserva_id;
    
    -- CAMBIO: Motivo limpio (sin concatenar método), porque ya se guarda en metodo_pago
    INSERT INTO public.caja_movimientos (caja_turno_id, usuario_id, tipo, categoria, moneda, monto, motivo, comprobante_referencia, metodo_pago)
    VALUES (p_turno_caja_id, p_usuario_id, 'INGRESO', 'COBRO_SERVICIO', p_moneda::moneda_enum, p_monto_pago, 'Cobro Reserva ' || COALESCE(v_codigo_reserva, p_reserva_id::text), v_numero_completo, p_metodo_pago);
    
    RETURN jsonb_build_object('success', true, 'comprobante_id', v_comprobante_id, 'pago_id', v_pago_id, 'numero_completo', v_numero_completo, 'correlativo', v_correlativo);
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Error: %', SQLERRM; RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END; $$;

-- ============================================================================
-- 2. CORREGIR DEVOLUCIÓN (Procesar Devolución Atómica)
-- ============================================================================
CREATE OR REPLACE FUNCTION procesar_devolucion_atomica(
    p_reserva_id uuid, p_nueva_fecha_salida date, p_monto_devolucion numeric, p_metodo_devolucion text, p_dias_devueltos integer,
    p_emitir_nc boolean DEFAULT false, p_comprobante_original_id uuid DEFAULT NULL, p_motivo_nc text DEFAULT NULL,
    p_turno_id uuid DEFAULT NULL, p_usuario_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_reserva record; v_pago_id uuid; v_movimiento_id uuid; v_metodo_pago_final text; v_motivo_texto text;
BEGIN
    SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
    IF v_reserva IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada'); END IF;
    -- Idempotencia
    IF p_nueva_fecha_salida = v_reserva.fecha_salida::date THEN RETURN jsonb_build_object('success', true, 'mensaje', 'Ya actualizado'); END IF;
    IF p_nueva_fecha_salida > v_reserva.fecha_salida::date THEN RETURN jsonb_build_object('success', false, 'error', 'La nueva fecha debe ser anterior'); END IF;
    
    UPDATE public.reservas SET fecha_salida = (p_nueva_fecha_salida::text || 'T12:00:00Z')::timestamptz WHERE id = p_reserva_id;
    v_metodo_pago_final := 'DEVOLUCION_' || p_metodo_devolucion;
    
    -- Insertar pago (negativo)
    INSERT INTO public.pagos (reserva_id, caja_turno_id, comprobante_id, metodo_pago, moneda_pago, monto, tipo_cambio_pago, nota, fecha_pago)
    VALUES (p_reserva_id, p_turno_id, NULL, v_metodo_pago_final, v_reserva.moneda_pactada, -p_monto_devolucion, 1.0, 'Devolución por acortamiento de estadía (' || p_dias_devueltos || ' noches)', now()) RETURNING id INTO v_pago_id;
    
    -- CORRECCIÓN CRÍTICA: Filtrar PENDIENTE. Si es pendiente, NO crear movimiento de caja.
    -- Además, unificar descripción.
    IF p_turno_id IS NOT NULL AND p_metodo_devolucion != 'PENDIENTE' THEN
        
        v_motivo_texto := 'Devolución por acortamiento de estadía (' || p_dias_devueltos || ' noches)';
        
        INSERT INTO public.caja_movimientos (caja_turno_id, usuario_id, tipo, categoria, moneda, monto, motivo, comprobante_referencia, metodo_pago)
        VALUES (p_turno_id, p_usuario_id, 'EGRESO', 'DEVOLUCION', v_reserva.moneda_pactada, p_monto_devolucion, v_motivo_texto, v_reserva.codigo_reserva, p_metodo_devolucion) RETURNING id INTO v_movimiento_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'pago_id', v_pago_id);
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Error: %', SQLERRM; RETURN jsonb_build_object('success', false, 'error', SQLERRM); END; $$;

COMMIT;
