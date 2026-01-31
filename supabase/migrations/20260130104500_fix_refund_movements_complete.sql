-- MIGRACIÓN PARA CORREGIR REGISTRO DE MOVIMIENTOS EN DEVOLUCIONES INMEDIATAS
-- Y ASEGURAR VISIBILIDAD DE YAPE/PLIN/ ETC.

BEGIN;

-- 1. CORREGIR RPC: Procesar Devolución Atómica (IDEMPOTENTE)
--    Ahora insertará movimiento en caja_movimientos para TODOS los métodos de pago.
CREATE OR REPLACE FUNCTION procesar_devolucion_atomica(
    p_reserva_id uuid, p_nueva_fecha_salida date, p_monto_devolucion numeric, p_metodo_devolucion text, p_dias_devueltos integer,
    p_emitir_nc boolean DEFAULT false, p_comprobante_original_id uuid DEFAULT NULL, p_motivo_nc text DEFAULT NULL,
    p_turno_id uuid DEFAULT NULL, p_usuario_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_reserva record; v_pago_id uuid; v_movimiento_id uuid; v_metodo_pago_final text;
BEGIN
    SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id FOR UPDATE;
    IF v_reserva IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada'); END IF;
    -- Idempotencia
    IF p_nueva_fecha_salida = v_reserva.fecha_salida::date THEN RETURN jsonb_build_object('success', true, 'mensaje', 'Ya actualizado'); END IF;
    IF p_nueva_fecha_salida > v_reserva.fecha_salida::date THEN RETURN jsonb_build_object('success', false, 'error', 'La nueva fecha debe ser anterior'); END IF;
    
    UPDATE public.reservas SET fecha_salida = (p_nueva_fecha_salida::text || 'T12:00:00Z')::timestamptz WHERE id = p_reserva_id;
    v_metodo_pago_final := 'DEVOLUCION_' || p_metodo_devolucion;
    
    INSERT INTO public.pagos (reserva_id, caja_turno_id, comprobante_id, metodo_pago, moneda_pago, monto, tipo_cambio_pago, nota, fecha_pago)
    VALUES (p_reserva_id, p_turno_id, NULL, v_metodo_pago_final, v_reserva.moneda_pactada, -p_monto_devolucion, 1.0, 'Devolución: ' || p_metodo_devolucion, now()) RETURNING id INTO v_pago_id;
    
    -- CORRECCIÓN: Insertar SIEMPRE si hay turno activo, sin importar el método de pago
    IF p_turno_id IS NOT NULL THEN
        INSERT INTO public.caja_movimientos (caja_turno_id, usuario_id, tipo, categoria, moneda, monto, motivo, comprobante_referencia, metodo_pago)
        VALUES (p_turno_id, p_usuario_id, 'EGRESO', 'DEVOLUCION', v_reserva.moneda_pactada, p_monto_devolucion, 'Devolución Acortamiento', v_reserva.codigo_reserva, p_metodo_devolucion) RETURNING id INTO v_movimiento_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'pago_id', v_pago_id);
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Error: %', SQLERRM; RETURN jsonb_build_object('success', false, 'error', SQLERRM); END; $$;

COMMIT;
