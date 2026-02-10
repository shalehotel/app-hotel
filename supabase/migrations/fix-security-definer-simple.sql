-- =============================================
-- FIX: Agregar SECURITY DEFINER solo a la función crítica
-- Problema: calcular_movimientos_turno se ejecuta con permisos del usuario
-- Solución: SECURITY DEFINER hace que se ejecute con permisos del propietario
-- =============================================

-- Función crítica que causa el error 500 en producción
CREATE OR REPLACE FUNCTION calcular_movimientos_turno(p_turno_id uuid)
RETURNS TABLE(
    total_ingresos_pen numeric, 
    total_ingresos_usd numeric, 
    total_egresos_pen numeric, 
    total_egresos_usd numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Confirmación
SELECT '✅ SECURITY DEFINER aplicado a calcular_movimientos_turno' AS resultado;
