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
