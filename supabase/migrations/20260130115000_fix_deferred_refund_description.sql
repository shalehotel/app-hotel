-- MIGRACIÓN FINAL: UNIFICAR DESCRIPCIÓN EN MOVIMIENTOS DEVOLUCIÓN DIFERIDA
-- Hace que el movimiento de caja tome la nota descritiva ("Acortamiento...") 
-- en lugar del texto genérico "Devolución diferida completada".

BEGIN;

CREATE OR REPLACE FUNCTION marcar_devolucion_procesada(p_pago_id uuid, p_metodo_real text, p_nota_adicional text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
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

    -- 2. Bloquear y validar pago
    SELECT * INTO v_pago FROM public.pagos WHERE id = p_pago_id AND metodo_pago LIKE '%PENDIENTE%' FOR UPDATE;
    
    IF v_pago IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'Pago no encontrado o ya procesado'); 
    END IF;

    -- Determinar motivo: Usar la nota original (ej: "Devolución por acortamiento...") si existe
    -- Si es la nota genérica antigua, usar un fallback decente.
    v_motivo_movimiento := v_pago.nota;
    IF v_motivo_movimiento IS NULL OR v_motivo_movimiento = 'Devolución: PENDIENTE' THEN
        v_motivo_movimiento := 'Devolución diferida completada';
    END IF;

    -- 3. Actualizar el pago
    UPDATE public.pagos 
    SET 
        metodo_pago = p_metodo_real, 
        nota = COALESCE(nota, '') || ' | Procesado con: ' || p_metodo_real, 
        fecha_pago = now(),
        caja_turno_id = v_turno_activo
    WHERE id = p_pago_id;

    -- 4. Insertar movimiento de caja con EL MOTIVO CORRECTO
    -- Ahora v_motivo_movimiento trae la descripción del rack (Acortamiento de estadía...)
    INSERT INTO public.caja_movimientos (caja_turno_id, usuario_id, tipo, categoria, moneda, monto, motivo, comprobante_referencia, metodo_pago)
    VALUES (v_turno_activo, auth.uid(), 'EGRESO', 'DEVOLUCION_PROCESADA', v_pago.moneda_pago, ABS(v_pago.monto), v_motivo_movimiento, NULL, p_metodo_real);

    RETURN jsonb_build_object('success', true, 'movimiento_caja_id', v_turno_activo);
EXCEPTION 
    WHEN OTHERS THEN 
        RAISE WARNING 'Error en marcar_devolucion_procesada: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM); 
END; $$;

COMMIT;
