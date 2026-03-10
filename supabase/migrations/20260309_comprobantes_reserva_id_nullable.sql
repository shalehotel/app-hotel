-- Migration: Hacer reserva_id nullable en comprobantes
-- Motivo: Permitir emisión de comprobantes manuales (Boleta/Factura)
-- sin que provengan de una reserva. La FK se mantiene pero ya no es obligatoria.
-- Fecha: 2026-03-09

-- 1. Quitar la restricción NOT NULL de la columna reserva_id
ALTER TABLE public.comprobantes 
    ALTER COLUMN reserva_id DROP NOT NULL;

-- 2. Actualizar la función RPC para que p_reserva_id sea opcional (DEFAULT NULL)
CREATE OR REPLACE FUNCTION insertar_comprobante_atomico(
    p_serie text,
    p_tipo_comprobante text,
    p_turno_caja_id uuid,
    p_reserva_id uuid DEFAULT NULL,
    p_receptor_tipo_doc text DEFAULT '',
    p_receptor_nro_doc text DEFAULT '',
    p_receptor_razon_social text DEFAULT '',
    p_receptor_direccion text DEFAULT NULL,
    p_moneda text DEFAULT 'PEN',
    p_tipo_cambio numeric DEFAULT 1.0,
    p_op_gravadas numeric DEFAULT 0,
    p_op_exoneradas numeric DEFAULT 0,
    p_monto_igv numeric DEFAULT 0,
    p_total_venta numeric DEFAULT 0,
    p_nota_credito_ref_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    serie text,
    numero integer,
    numero_completo text
)
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    v_correlativo integer;
    v_comprobante_id uuid;
    v_numero_completo text;
    v_tipo_enum public.tipo_comprobante_enum;
    v_moneda_enum public.moneda_enum;
BEGIN
    v_tipo_enum := p_tipo_comprobante::public.tipo_comprobante_enum;
    v_moneda_enum := p_moneda::public.moneda_enum;

    SELECT correlativo_actual + 1 INTO v_correlativo
    FROM public.series_comprobante
    WHERE series_comprobante.serie = p_serie 
    AND series_comprobante.tipo_comprobante = v_tipo_enum
    FOR UPDATE;

    IF v_correlativo IS NULL THEN
        RAISE EXCEPTION 'Serie % del tipo % no encontrada', p_serie, p_tipo_comprobante;
    END IF;

    UPDATE public.series_comprobante 
    SET correlativo_actual = v_correlativo,
        updated_at = now()
    WHERE series_comprobante.serie = p_serie 
    AND series_comprobante.tipo_comprobante = v_tipo_enum;

    v_numero_completo := p_serie || '-' || LPAD(v_correlativo::text, 8, '0');

    INSERT INTO public.comprobantes (
        turno_caja_id, reserva_id, tipo_comprobante, serie, numero,
        receptor_tipo_doc, receptor_nro_doc, receptor_razon_social, receptor_direccion,
        moneda, tipo_cambio, op_gravadas, op_exoneradas, monto_igv, total_venta,
        nota_credito_ref_id, estado_sunat, fecha_emision
    ) VALUES (
        p_turno_caja_id, p_reserva_id, v_tipo_enum, p_serie, v_correlativo,
        p_receptor_tipo_doc, p_receptor_nro_doc, p_receptor_razon_social, p_receptor_direccion,
        v_moneda_enum, p_tipo_cambio, p_op_gravadas, p_op_exoneradas, p_monto_igv, p_total_venta,
        p_nota_credito_ref_id, 'PENDIENTE', now()
    )
    RETURNING public.comprobantes.id INTO v_comprobante_id;

    RETURN QUERY SELECT 
        v_comprobante_id as id, p_serie as serie, v_correlativo as numero, v_numero_completo as numero_completo;
END;
$$;
