-- =============================================
-- FIX: Agregar SECURITY DEFINER a todas las funciones
-- Problema: Las funciones se ejecutan con permisos del usuario que las llama
-- Solución: SECURITY DEFINER hace que se ejecuten con permisos del propietario
-- =============================================

-- 1. calcular_movimientos_turno (LA MÁS CRÍTICA - causa el error 500)
CREATE OR REPLACE FUNCTION calcular_movimientos_turno(p_turno_id uuid)
RETURNS TABLE(total_ingresos_pen numeric, total_ingresos_usd numeric, total_egresos_pen numeric, total_egresos_usd numeric)
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' AND moneda = 'PEN' THEN monto ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' AND moneda = 'USD' THEN monto ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'EGRESO' AND moneda = 'PEN' THEN monto ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'EGRESO' AND moneda = 'USD' THEN monto ELSE 0 END), 0)
    FROM public.caja_movimientos
    WHERE caja_turno_id = p_turno_id AND anulado = false;
END;
$$;

-- 2. obtener_siguiente_correlativo
CREATE OR REPLACE FUNCTION obtener_siguiente_correlativo(p_serie text, p_tipo text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
DECLARE
    v_correlativo integer;
BEGIN
    UPDATE public.series_comprobante
    SET correlativo_actual = correlativo_actual + 1
    WHERE serie = p_serie AND tipo_comprobante = p_tipo::tipo_comprobante
    RETURNING correlativo_actual INTO v_correlativo;
    
    RETURN v_correlativo;
END;
$$;

-- 3. validar_y_cerrar_caja
CREATE OR REPLACE FUNCTION validar_y_cerrar_caja(
    p_turno_id uuid, 
    p_efectivo_declarado_pen numeric, 
    p_efectivo_declarado_usd numeric, 
    p_limite_descuadre numeric DEFAULT 10.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
DECLARE
    v_saldo_pen numeric;
    v_saldo_usd numeric;
    v_descuadre_pen numeric;
    v_descuadre_usd numeric;
BEGIN
    -- Calcular saldos reales
    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' AND moneda = 'PEN' THEN monto ELSE 0 END) - 
                 SUM(CASE WHEN tipo = 'EGRESO' AND moneda = 'PEN' THEN monto ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' AND moneda = 'USD' THEN monto ELSE 0 END) - 
                 SUM(CASE WHEN tipo = 'EGRESO' AND moneda = 'USD' THEN monto ELSE 0 END), 0)
    INTO v_saldo_pen, v_saldo_usd
    FROM public.caja_movimientos
    WHERE caja_turno_id = p_turno_id AND anulado = false;
    
    -- Calcular descuadres
    v_descuadre_pen := p_efectivo_declarado_pen - v_saldo_pen;
    v_descuadre_usd := p_efectivo_declarado_usd - v_saldo_usd;
    
    -- Validar límites
    IF ABS(v_descuadre_pen) > p_limite_descuadre OR ABS(v_descuadre_usd) > p_limite_descuadre THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'descuadre_excedido',
            'descuadre_pen', v_descuadre_pen,
            'descuadre_usd', v_descuadre_usd
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'saldo_pen', v_saldo_pen,
        'saldo_usd', v_saldo_usd,
        'descuadre_pen', v_descuadre_pen,
        'descuadre_usd', v_descuadre_usd
    );
END;
$$;

-- 4. soft_delete
CREATE OR REPLACE FUNCTION soft_delete(p_tabla text, p_id uuid) 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
BEGIN
    EXECUTE format('UPDATE %I SET deleted_at = now() WHERE id = $1', p_tabla) USING p_id;
    RETURN FOUND;
END;
$$;

-- 5. insertar_comprobante_atomico
CREATE OR REPLACE FUNCTION insertar_comprobante_atomico(
    p_tipo tipo_comprobante,
    p_serie text,
    p_reserva_id uuid,
    p_huesped_id uuid,
    p_items jsonb,
    p_metodo_pago metodo_pago,
    p_moneda moneda,
    p_efectivo_recibido numeric DEFAULT NULL,
    p_tarjeta_ultimos_digitos text DEFAULT NULL,
    p_turno_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
DECLARE
    v_numero integer;
    v_comprobante_id uuid;
    v_subtotal numeric := 0;
    v_igv numeric := 0;
    v_total numeric := 0;
    v_item jsonb;
BEGIN
    -- Calcular totales
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_subtotal := v_subtotal + ((v_item->>'precio')::numeric * (v_item->>'cantidad')::numeric);
    END LOOP;
    
    v_igv := ROUND(v_subtotal * 0.18, 2);
    v_total := v_subtotal + v_igv;
    
    -- Obtener correlativo
    v_numero := obtener_siguiente_correlativo(p_serie, p_tipo::text);
    
    -- Insertar comprobante
    INSERT INTO public.comprobantes (
        tipo, serie, numero, reserva_id, huesped_id,
        subtotal, igv, total, moneda, metodo_pago,
        efectivo_recibido, vuelto, tarjeta_ultimos_digitos,
        estado_sunat, fecha_emision
    )
    VALUES (
        p_tipo, p_serie, v_numero, p_reserva_id, p_huesped_id,
        v_subtotal, v_igv, v_total, p_moneda, p_metodo_pago,
        p_efectivo_recibido, 
        CASE WHEN p_efectivo_recibido IS NOT NULL THEN p_efectivo_recibido - v_total ELSE NULL END,
        p_tarjeta_ultimos_digitos,
        'PENDIENTE', now()
    )
    RETURNING id INTO v_comprobante_id;
    
    -- Insertar items
    INSERT INTO public.comprobante_items (comprobante_id, concepto, cantidad, precio_unitario, subtotal)
    SELECT 
        v_comprobante_id,
        v_item->>'concepto',
        (v_item->>'cantidad')::integer,
        (v_item->>'precio')::numeric,
        (v_item->>'precio')::numeric * (v_item->>'cantidad')::numeric
    FROM jsonb_array_elements(p_items) v_item;
    
    -- Registrar movimiento de caja si hay turno
    IF p_turno_id IS NOT NULL THEN
        INSERT INTO public.caja_movimientos (
            caja_turno_id, tipo, moneda, monto, descripcion, comprobante_id
        )
        VALUES (
            p_turno_id, 'INGRESO', p_moneda, v_total,
            'Venta - ' || p_tipo || ' ' || p_serie || '-' || v_numero,
            v_comprobante_id
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'comprobante_id', v_comprobante_id,
        'numero', v_numero
    );
END;
$$;

-- 6. registrar_cobro_completo
CREATE OR REPLACE FUNCTION registrar_cobro_completo(
    p_reserva_id uuid,
    p_huesped_id uuid,
    p_conceptos jsonb,
    p_metodo_pago metodo_pago,
    p_moneda moneda,
    p_efectivo_recibido numeric DEFAULT NULL,
    p_tarjeta_ultimos_digitos text DEFAULT NULL,
    p_turno_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    v_result := insertar_comprobante_atomico(
        'BOLETA'::tipo_comprobante,
        'BBB1',
        p_reserva_id,
        p_huesped_id,
        p_conceptos,
        p_metodo_pago,
        p_moneda,
        p_efectivo_recibido,
        p_tarjeta_ultimos_digitos,
        p_turno_id
    );
    
    RETURN v_result;
END;
$$;

-- 7. procesar_devolucion_atomica
CREATE OR REPLACE FUNCTION procesar_devolucion_atomica(
    p_comprobante_id uuid,
    p_motivo text,
    p_items_devolucion jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
DECLARE
    v_nota_credito_id uuid;
    v_comprobante record;
BEGIN
    -- Obtener comprobante original
    SELECT * INTO v_comprobante FROM public.comprobantes WHERE id = p_comprobante_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'comprobante_no_encontrado');
    END IF;
    
    -- Crear nota de crédito
    INSERT INTO public.comprobantes (
        tipo, serie, numero, reserva_id, huesped_id,
        subtotal, igv, total, moneda, metodo_pago,
        estado_sunat, fecha_emision, comprobante_origen_id
    )
    SELECT
        'NOTA_CREDITO'::tipo_comprobante,
        v_comprobante.serie,
        obtener_siguiente_correlativo(v_comprobante.serie, 'NOTA_CREDITO'),
        v_comprobante.reserva_id,
        v_comprobante.huesped_id,
        v_comprobante.subtotal * -1,
        v_comprobante.igv * -1,
        v_comprobante.total * -1,
        v_comprobante.moneda,
        v_comprobante.metodo_pago,
        'PENDIENTE',
        now(),
        p_comprobante_id
    RETURNING id INTO v_nota_credito_id;
    
    RETURN jsonb_build_object('success', true, 'nota_credito_id', v_nota_credito_id);
END;
$$;

-- 8. marcar_devolucion_procesada
CREATE OR REPLACE FUNCTION marcar_devolucion_procesada(
    p_comprobante_id uuid,
    p_nota_credito_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
BEGIN
    UPDATE public.comprobantes
    SET nota_credito_id = p_nota_credito_id
    WHERE id = p_comprobante_id;
    
    RETURN FOUND;
END;
$$;

-- 9. realizar_checkin_atomico
CREATE OR REPLACE FUNCTION realizar_checkin_atomico(
    p_reserva_id uuid,
    p_usuario_id uuid,
    p_huespedes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX
SET search_path = public
AS $$
DECLARE
    v_reserva record;
    v_huesped jsonb;
    v_huesped_id uuid;
BEGIN
    -- Verificar reserva
    SELECT * INTO v_reserva FROM public.reservas WHERE id = p_reserva_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'reserva_no_encontrada');
    END IF;
    
    -- Actualizar reserva a CONFIRMADA
    UPDATE public.reservas
    SET estado = 'CONFIRMADA', checkin_realizado = true
    WHERE id = p_reserva_id;
    
    -- Actualizar habitación a OCUPADA
    UPDATE public.habitaciones
    SET estado_ocupacion = 'OCUPADA'
    WHERE id = v_reserva.habitacion_id;
    
    RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================
-- CONFIRMACIÓN
-- =============================================
SELECT '✅ SECURITY DEFINER aplicado a 9 funciones críticas' AS resultado;
