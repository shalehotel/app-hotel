-- =============================================
-- SCHEMA COMPLETO MAESTRO - VERSIÓN UNIFICADA v3.0
-- TIPO: ARCHIVO ÚNICO DE CREACIÓN DE BASE DE DATOS
-- FECHA: 2026-02-01
-- DESCRIPCIÓN: Archivo único que crea la BD completa desde cero.
--              Incluye TODAS las correcciones y mejoras consolidadas.
--              NO requiere migraciones adicionales.
-- =============================================
-- INTEGRA:
--   - schema-maestro-enterprise-v2.sql (base)
--   - consolidated_caja_fixes.sql (funciones corregidas)
--   - add_kardex_number.sql (numero_kardex)
--   - update_reservas_view_for_kardex.sql (vistas mejoradas)
-- =============================================

-- =============================================
-- 1. EXTENSIONES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. ENUMS
-- =============================================
CREATE TYPE estado_ocupacion_enum AS ENUM ('LIBRE', 'OCUPADA');
CREATE TYPE estado_limpieza_enum AS ENUM ('LIMPIA', 'SUCIA', 'EN_LIMPIEZA');
CREATE TYPE estado_servicio_enum AS ENUM ('OPERATIVA', 'MANTENIMIENTO', 'FUERA_SERVICIO');
CREATE TYPE estado_reserva_enum AS ENUM ('RESERVADA', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELADA', 'NO_SHOW');
CREATE TYPE tipo_comprobante_enum AS ENUM ('BOLETA', 'FACTURA', 'NOTA_CREDITO', 'TICKET_INTERNO');
CREATE TYPE moneda_enum AS ENUM ('PEN', 'USD');
CREATE TYPE estado_sunat_enum AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'ANULADO');
CREATE TYPE rol_usuario_enum AS ENUM ('ADMIN', 'RECEPCION', 'HOUSEKEEPING');
CREATE TYPE metodo_pago_enum AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'DEVOLUCION_EFECTIVO', 'DEVOLUCION_PENDIENTE');

-- =============================================
-- 3. TABLAS
-- =============================================

-- USUARIOS
CREATE TABLE public.usuarios (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol rol_usuario_enum NOT NULL DEFAULT 'RECEPCION',
    nombres text NOT NULL,
    apellidos text,
    estado boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- AUDIT LOG (MEJORA ENTERPRISE)
CREATE TABLE public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla text NOT NULL,
    operacion text CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
    registro_id uuid NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id),
    datos_antes jsonb,
    datos_despues jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_audit_log_tabla ON public.audit_log(tabla);
CREATE INDEX idx_audit_log_registro ON public.audit_log(registro_id);
CREATE INDEX idx_audit_log_fecha ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_usuario ON public.audit_log(usuario_id);

-- CONFIGURACIÓN HOTEL
CREATE TABLE public.hotel_configuracion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ruc text NOT NULL,
    razon_social text NOT NULL,
    nombre_comercial text,
    direccion_fiscal text,
    ubigeo_codigo text,
    tasa_igv numeric(5,2) DEFAULT 18.00,
    tasa_icbper numeric(5,2) DEFAULT 0.50,
    es_exonerado_igv boolean DEFAULT false,
    facturacion_activa boolean DEFAULT true,
    proveedor_metadata jsonb,
    hora_checkin time DEFAULT '14:00:00',
    hora_checkout time DEFAULT '12:00:00',
    telefono text,
    email text,
    pagina_web text,
    logo_url text,
    descripcion text,
    moneda_principal text DEFAULT 'PEN',
    
    -- CAMPOS NUEVOS AGREGADOS AQUÍ
    terminos_condiciones text,
    ciudad text DEFAULT 'Chachapoyas',
    region text DEFAULT 'Amazonas - Perú',
    
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT check_ruc_format CHECK (ruc ~ '^(10|15|17|20)[0-9]{9}$'),
    CONSTRAINT check_ubigeo_format CHECK (ubigeo_codigo IS NULL OR ubigeo_codigo ~ '^[0-9]{6}$'),
    CONSTRAINT check_tasa_igv_range CHECK (tasa_igv >= 0 AND tasa_igv <= 100),
    CONSTRAINT check_moneda_principal CHECK (moneda_principal IN ('PEN', 'USD'))
);


CREATE UNIQUE INDEX only_one_config_row ON public.hotel_configuracion ((true));

-- CAJAS
CREATE TABLE public.cajas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    estado boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- SERIES DE COMPROBANTES
CREATE TABLE public.series_comprobante (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id uuid REFERENCES public.cajas(id),
    tipo_comprobante tipo_comprobante_enum NOT NULL,
    serie text NOT NULL,
    correlativo_actual bigint NOT NULL DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(serie, tipo_comprobante)
);

-- TURNOS DE CAJA
CREATE TABLE public.caja_turnos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id uuid REFERENCES public.cajas(id) NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) NOT NULL,
    fecha_apertura timestamptz DEFAULT now(),
    fecha_cierre timestamptz,
    
    monto_apertura_efectivo numeric(12,2) DEFAULT 0,
    monto_cierre_teorico_efectivo numeric(12,2),
    monto_cierre_real_efectivo numeric(12,2),
    descuadre_efectivo numeric(12,2) GENERATED ALWAYS AS (monto_cierre_real_efectivo - monto_cierre_teorico_efectivo) STORED,
    
    monto_apertura_usd numeric(12,2) DEFAULT 0,
    monto_cierre_teorico_usd numeric(12,2) DEFAULT 0,
    monto_cierre_real_usd numeric(12,2) DEFAULT 0,
    
    total_efectivo numeric(12,2) DEFAULT 0,
    total_tarjeta numeric(12,2) DEFAULT 0,
    total_transferencia numeric(12,2) DEFAULT 0,
    total_yape numeric(12,2) DEFAULT 0,
    
    total_digital numeric(12,2) GENERATED ALWAYS AS (
        COALESCE(total_tarjeta, 0) + 
        COALESCE(total_transferencia, 0) + 
        COALESCE(total_yape, 0)
    ) STORED,
    total_vendido numeric(12,2) GENERATED ALWAYS AS (
        COALESCE(total_efectivo, 0) + 
        COALESCE(total_tarjeta, 0) + 
        COALESCE(total_transferencia, 0) + 
        COALESCE(total_yape, 0)
    ) STORED,
    
    observaciones_cierre text,
    requiere_autorizacion boolean DEFAULT false,
    autorizado_por uuid REFERENCES public.usuarios(id),
    
    estado text DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA'))
);

-- MOVIMIENTOS DE CAJA
CREATE TABLE public.caja_movimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_turno_id uuid REFERENCES public.caja_turnos(id) ON DELETE CASCADE NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) NOT NULL,
    tipo text CHECK (tipo IN ('INGRESO', 'EGRESO')) NOT NULL,
    categoria text,
    moneda moneda_enum DEFAULT 'PEN',
    monto numeric(12,2) NOT NULL CHECK (monto > 0),
    motivo text NOT NULL CHECK (char_length(motivo) >= 5),
    comprobante_referencia text,
    evidencia_url text,
    metodo_pago text,
    created_at timestamptz DEFAULT now(),
    -- Campos Enterprise
    anulado boolean DEFAULT false,
    anulado_por uuid REFERENCES public.usuarios(id),
    anulado_motivo text,
    anulado_at timestamptz
);
CREATE INDEX idx_movimientos_turno ON public.caja_movimientos(caja_turno_id);
CREATE INDEX idx_movimientos_usuario ON public.caja_movimientos(usuario_id);
CREATE INDEX idx_movimientos_fecha ON public.caja_movimientos(created_at DESC);
CREATE INDEX idx_movimientos_tipo_turno ON public.caja_movimientos(caja_turno_id, tipo);
CREATE INDEX idx_movimientos_activos ON public.caja_movimientos(caja_turno_id) WHERE anulado = false;

-- TABLAS BASE DE HOTEL
CREATE TABLE public.tipos_habitacion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    capacidad_personas int NOT NULL DEFAULT 2,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.categorias_habitacion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    descripcion text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.canales_venta (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL UNIQUE,
    comision_porcentaje numeric(5,2) DEFAULT 0.00,
    activo boolean DEFAULT true,
    deleted_at timestamptz
);

CREATE TABLE public.tarifas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_habitacion_id uuid REFERENCES public.tipos_habitacion(id),
    categoria_habitacion_id uuid REFERENCES public.categorias_habitacion(id),
    nombre_tarifa text NOT NULL,
    precio_base numeric(12,2) NOT NULL,
    precio_minimo numeric(12,2) NOT NULL,
    fecha_inicio date,
    fecha_fin date,
    activa boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT check_precio_minimo_valido CHECK (precio_minimo <= precio_base)
);

CREATE TABLE public.habitaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero text NOT NULL UNIQUE,
    piso text,
    tipo_id uuid REFERENCES public.tipos_habitacion(id) NOT NULL,
    categoria_id uuid REFERENCES public.categorias_habitacion(id) NOT NULL,
    estado_ocupacion estado_ocupacion_enum DEFAULT 'LIBRE',
    estado_limpieza estado_limpieza_enum DEFAULT 'LIMPIA',
    estado_servicio estado_servicio_enum DEFAULT 'OPERATIVA',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE public.huespedes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres text NOT NULL,
    apellidos text NOT NULL,
    tipo_documento text NOT NULL,
    numero_documento text NOT NULL,
    sexo char(1) CHECK (sexo IN ('M', 'F')), -- Obligatorio MINCETUR
    nacionalidad text,
    procedencia_departamento text,
    correo text,
    telefono text,
    fecha_nacimiento date,
    notas_internas text,
    es_frecuente boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    UNIQUE(tipo_documento, numero_documento)
);

-- RESERVAS (CON numero_kardex INTEGRADO)
CREATE TABLE public.reservas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_reserva text UNIQUE DEFAULT substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8),
    numero_kardex BIGINT GENERATED BY DEFAULT AS IDENTITY,
    habitacion_id uuid REFERENCES public.habitaciones(id),
    canal_venta_id uuid REFERENCES public.canales_venta(id),
    usuario_id uuid REFERENCES public.usuarios(id), -- Responsable de la reserva
    fecha_entrada timestamptz NOT NULL,
    fecha_salida timestamptz NOT NULL,
    check_in_real timestamptz,
    check_out_real timestamptz,
    estado estado_reserva_enum DEFAULT 'RESERVADA',
    precio_base_tarifa numeric(12,2),
    precio_pactado numeric(12,2) NOT NULL,
    moneda_pactada moneda_enum DEFAULT 'PEN',
    autorizado_descuento boolean DEFAULT false,
    huesped_presente boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE public.reserva_huespedes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id uuid REFERENCES public.reservas(id) ON DELETE CASCADE,
    huesped_id uuid REFERENCES public.huespedes(id),
    es_titular boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(reserva_id, huesped_id)
);

-- COMPROBANTES
CREATE TABLE public.comprobantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_caja_id uuid REFERENCES public.caja_turnos(id) NOT NULL,
    reserva_id uuid REFERENCES public.reservas(id) NOT NULL,
    fecha_emision timestamptz DEFAULT now(),
    tipo_comprobante tipo_comprobante_enum NOT NULL,
    serie text NOT NULL,
    numero bigint NOT NULL,
    receptor_tipo_doc text NOT NULL,
    receptor_nro_doc text NOT NULL,
    receptor_razon_social text NOT NULL,
    receptor_direccion text,
    moneda moneda_enum DEFAULT 'PEN',
    tipo_cambio numeric(5,3) DEFAULT 1.000,
    op_gravadas numeric(12,2) DEFAULT 0.00,
    op_exoneradas numeric(12,2) DEFAULT 0.00,
    op_inafectas numeric(12,2) DEFAULT 0.00,
    monto_igv numeric(12,2) DEFAULT 0.00,
    monto_icbper numeric(12,2) DEFAULT 0.00,
    total_venta numeric(12,2) NOT NULL,
    estado_sunat estado_sunat_enum DEFAULT 'PENDIENTE',
    nota_credito_ref_id uuid REFERENCES public.comprobantes(id),
    hash_cpe text,
    external_id text,
    cdr_url text,
    xml_url text,
    pdf_url text,
    observaciones text,
    sunat_ticket_anulacion text,
    fecha_solicitud_anulacion timestamptz,
    UNIQUE(tipo_comprobante, serie, numero),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.comprobante_detalles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comprobante_id uuid REFERENCES public.comprobantes(id) ON DELETE CASCADE,
    descripcion text NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    codigo_afectacion_igv text NOT NULL DEFAULT '10',
    unidad_medida text DEFAULT 'NIU',
    codigo_producto text DEFAULT 'SERV-001'
);

-- PAGOS
CREATE TABLE public.pagos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id uuid REFERENCES public.reservas(id) NOT NULL,
    caja_turno_id uuid REFERENCES public.caja_turnos(id) NOT NULL,
    comprobante_id uuid REFERENCES public.comprobantes(id),
    metodo_pago text NOT NULL,
    moneda_pago moneda_enum DEFAULT 'PEN',
    monto numeric(10,2) NOT NULL,
    tipo_cambio_pago numeric(5,3) DEFAULT 1.000,
    referencia_pago text,
    nota text,
    fecha_pago timestamptz DEFAULT now(),
    idempotency_key text,
    CONSTRAINT check_pago_monto_no_cero CHECK (monto != 0)
);
CREATE UNIQUE INDEX idx_pagos_idempotency ON public.pagos(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_pagos_turno ON public.pagos(caja_turno_id);
CREATE INDEX idx_pagos_metodo ON public.pagos(metodo_pago);

-- =============================================
-- 4. INDICES
-- =============================================
CREATE INDEX idx_huespedes_busqueda ON public.huespedes USING gin(to_tsvector('spanish', nombres || ' ' || apellidos || ' ' || numero_documento));
CREATE INDEX idx_huespedes_documento ON public.huespedes(tipo_documento, numero_documento);
CREATE INDEX idx_comprobantes_fecha_emision ON public.comprobantes(fecha_emision DESC);
CREATE INDEX idx_caja_turnos_usuario ON public.caja_turnos(usuario_id);
CREATE INDEX idx_pagos_reserva ON public.pagos(reserva_id);
CREATE INDEX idx_reservas_habitacion_estado ON public.reservas(habitacion_id, estado);
CREATE INDEX idx_comprobantes_estado_fecha ON public.comprobantes(estado_sunat, fecha_emision DESC);
CREATE INDEX idx_turnos_estado_usuario ON public.caja_turnos(usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_reservas_periodo_entrada ON public.reservas(fecha_entrada DESC, fecha_salida);
CREATE INDEX IF NOT EXISTS idx_reservas_periodo_creacion ON public.reservas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comprobantes_periodo_mes ON public.comprobantes(fecha_emision DESC, tipo_comprobante);
CREATE INDEX IF NOT EXISTS idx_comprobantes_reserva ON public.comprobantes(reserva_id); -- CRITICAL PERFORMANCE INDEX
CREATE INDEX IF NOT EXISTS idx_pagos_periodo_fecha ON public.pagos(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_periodo ON public.caja_movimientos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comprobantes_ticket_anulacion ON public.comprobantes(sunat_ticket_anulacion) WHERE sunat_ticket_anulacion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_huespedes_activos ON public.huespedes(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reservas_activas ON public.reservas(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_habitaciones_activas ON public.habitaciones(id) WHERE deleted_at IS NULL;

-- =============================================
-- 5. FUNCIONES
-- =============================================

-- Correlativo
CREATE OR REPLACE FUNCTION obtener_siguiente_correlativo(p_serie text, p_tipo text)
RETURNS integer LANGUAGE plpgsql AS $function$
DECLARE v_correlativo integer; v_id uuid;
BEGIN
    SELECT id, correlativo_actual INTO v_id, v_correlativo
    FROM series_comprobante
    WHERE serie = p_serie AND tipo_comprobante = p_tipo::public.tipo_comprobante_enum
    FOR UPDATE;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Serie % del tipo % no encontrada', p_serie, p_tipo; END IF;
    v_correlativo := v_correlativo + 1;
    UPDATE series_comprobante SET correlativo_actual = v_correlativo WHERE id = v_id;
    RETURN v_correlativo;
END;
$function$;

-- Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ language 'plpgsql';

-- Calcular movimientos (Auxiliar)
CREATE OR REPLACE FUNCTION calcular_movimientos_turno(p_turno_id uuid)
RETURNS TABLE(total_ingresos_pen numeric, total_ingresos_usd numeric, total_egresos_pen numeric, total_egresos_usd numeric)
LANGUAGE plpgsql AS $$
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

-- Auditoría (Pagos, Comprobantes, Movimientos)
CREATE OR REPLACE FUNCTION registrar_auditoria_generic() RETURNS TRIGGER AS $$
DECLARE v_usuario_id uuid;
BEGIN
    SELECT auth.uid() INTO v_usuario_id;
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (tabla, operacion, registro_id, usuario_id, datos_despues) VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, v_usuario_id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (tabla, operacion, registro_id, usuario_id, datos_antes, datos_despues) VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, v_usuario_id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (tabla, operacion, registro_id, usuario_id, datos_antes) VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, v_usuario_id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprobante Inmutable
CREATE OR REPLACE FUNCTION proteger_comprobante_inmutable() RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.estado_sunat != 'PENDIENTE') THEN
        IF OLD.total_venta IS DISTINCT FROM NEW.total_venta OR OLD.receptor_nro_doc IS DISTINCT FROM NEW.receptor_nro_doc OR OLD.serie IS DISTINCT FROM NEW.serie OR OLD.numero IS DISTINCT FROM NEW.numero THEN
            RAISE EXCEPTION '⛔ PROHIBIDO: No se pueden modificar datos fiscales de un comprobante emitido.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RPC: Insertar Comprobante Atómico
CREATE OR REPLACE FUNCTION insertar_comprobante_atomico(
    p_serie text,
    p_tipo_comprobante text,
    p_turno_caja_id uuid,
    p_reserva_id uuid,
    p_receptor_tipo_doc text,
    p_receptor_nro_doc text,
    p_receptor_razon_social text,
    p_receptor_direccion text,
    p_moneda text,
    p_tipo_cambio numeric,
    p_op_gravadas numeric,
    p_op_exoneradas numeric,
    p_monto_igv numeric,
    p_total_venta numeric,
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

-- RPC: Registrar Cobro Completo (VERSIÓN CORREGIDA)
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
    
    -- Obtener código de reserva
    SELECT codigo_reserva INTO v_codigo_reserva FROM public.reservas WHERE id = p_reserva_id;
    
    -- Insertar movimiento de caja (CORRECCIÓN: Motivo limpio)
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

-- RPC: Validar y Cerrar Caja
CREATE OR REPLACE FUNCTION validar_y_cerrar_caja(p_turno_id uuid, p_efectivo_declarado_pen numeric, p_efectivo_declarado_usd numeric, p_limite_descuadre numeric DEFAULT 10.00)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_turno record; v_efectivo_teorico_pen numeric; v_efectivo_teorico_usd numeric; v_descuadre_pen numeric; v_descuadre_usd numeric; v_requiere_autorizacion boolean := false;
BEGIN
    SELECT * INTO v_turno FROM public.caja_turnos WHERE id = p_turno_id AND estado = 'ABIERTA' FOR UPDATE;
    IF v_turno IS NULL THEN RETURN jsonb_build_object('success', false, 'error', '⚠️ Turno no encontrado o ya fue cerrado por otro usuario (race condition detectada)'); END IF;
    -- Teórico efectivo: Apertura + (Pagos Efectivo) - (Movimientos Egreso Efectivo)
    v_efectivo_teorico_pen := v_turno.monto_apertura_efectivo + 
        COALESCE((SELECT SUM(monto) FROM public.pagos WHERE caja_turno_id = p_turno_id AND metodo_pago = 'EFECTIVO'), 0) -
        COALESCE((SELECT SUM(monto) FROM public.caja_movimientos WHERE caja_turno_id = p_turno_id AND tipo = 'EGRESO' AND anulado = false AND moneda = 'PEN'), 0);
    v_efectivo_teorico_usd := v_turno.monto_apertura_usd + 
        COALESCE((SELECT SUM(monto) FROM public.pagos WHERE caja_turno_id = p_turno_id AND metodo_pago = 'EFECTIVO' AND moneda_pago = 'USD'), 0) -
        COALESCE((SELECT SUM(monto) FROM public.caja_movimientos WHERE caja_turno_id = p_turno_id AND tipo = 'EGRESO' AND anulado = false AND moneda = 'USD'), 0);
    v_descuadre_pen := p_efectivo_declarado_pen - v_efectivo_teorico_pen;
    v_descuadre_usd := p_efectivo_declarado_usd - v_efectivo_teorico_usd;
    IF ABS(v_descuadre_pen) > p_limite_descuadre OR ABS(v_descuadre_usd) > 5 THEN v_requiere_autorizacion := true; END IF;
    UPDATE public.caja_turnos SET estado = 'CERRADA', fecha_cierre = now(), monto_cierre_teorico_efectivo = v_efectivo_teorico_pen, monto_cierre_real_efectivo = p_efectivo_declarado_pen, monto_cierre_teorico_usd = v_efectivo_teorico_usd, monto_cierre_real_usd = p_efectivo_declarado_usd, requiere_autorizacion = v_requiere_autorizacion WHERE id = p_turno_id;
    RETURN jsonb_build_object('success', true, 'descuadre_pen', v_descuadre_pen);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END; $$;

-- RPC: Procesar Devolución Atómica (VERSIÓN CORREGIDA)
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
    
    -- Descripción unificada
    v_motivo_texto := 'Devolución por acortamiento de estadía (' || p_dias_devueltos || ' noches)';
    
    -- Insertar pago (negativo)
    INSERT INTO public.pagos (
        reserva_id, caja_turno_id, comprobante_id, metodo_pago, moneda_pago, 
        monto, tipo_cambio_pago, nota, fecha_pago
    ) VALUES (
        p_reserva_id, p_turno_id, NULL, v_metodo_pago_final, v_reserva.moneda_pactada, 
        -p_monto_devolucion, 1.0, v_motivo_texto, now()
    ) RETURNING id INTO v_pago_id;
    
    -- Solo crear movimiento si NO es PENDIENTE
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

-- RPC: Marcar Devolución Procesada (VERSIÓN CORREGIDA)
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
    v_motivo_movimiento := v_pago.nota;
    IF v_motivo_movimiento IS NULL OR v_motivo_movimiento = 'Devolución: PENDIENTE' THEN
        v_motivo_movimiento := 'Devolución diferida completada';
    END IF;

    -- 4. Actualizar el pago
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

-- Soft Delete Helper
CREATE OR REPLACE FUNCTION soft_delete(p_tabla text, p_id uuid) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = %L AND deleted_at IS NULL', p_tabla, p_id); RETURN FOUND; END; $$;

-- Check-in Atómico
CREATE OR REPLACE FUNCTION realizar_checkin_atomico(
    p_habitacion_id UUID, p_fecha_entrada TIMESTAMP WITH TIME ZONE, p_fecha_salida TIMESTAMP WITH TIME ZONE, p_precio_pactado DECIMAL, p_huespedes JSONB,
    p_reserva_id UUID DEFAULT NULL, p_moneda_pactada public.moneda_enum DEFAULT 'PEN', p_canal_venta_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_reserva_id UUID; v_huesped_id UUID; v_habitacion RECORD; huesped_item JSONB;
BEGIN
    SELECT * INTO v_habitacion FROM habitaciones WHERE id = p_habitacion_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Habitación no encontrada'); END IF;
    IF p_reserva_id IS NULL AND v_habitacion.estado_ocupacion != 'LIBRE' THEN RETURN jsonb_build_object('success', false, 'error', 'La habitación no está disponible'); END IF;
    IF v_habitacion.estado_servicio != 'OPERATIVA' OR v_habitacion.estado_limpieza != 'LIMPIA' THEN RETURN jsonb_build_object('success', false, 'error', 'Habitación no apta para check-in'); END IF;

    IF p_reserva_id IS NOT NULL THEN
        UPDATE reservas SET estado = 'CHECKED_IN', check_in_real = NOW(), huesped_presente = TRUE WHERE id = p_reserva_id RETURNING id INTO v_reserva_id;
    ELSE
        INSERT INTO reservas (codigo_reserva, habitacion_id, fecha_entrada, fecha_salida, precio_pactado, moneda_pactada, canal_venta_id, estado, check_in_real, huesped_presente)
        VALUES ('RSV-' || to_char(NOW(), 'YYMMDD') || '-' || substring(md5(random()::text) from 1 for 4), p_habitacion_id, p_fecha_entrada, p_fecha_salida, p_precio_pactado, p_moneda_pactada, p_canal_venta_id, 'CHECKED_IN', NOW(), TRUE) RETURNING id INTO v_reserva_id;
    END IF;

    DELETE FROM reserva_huespedes WHERE reserva_id = v_reserva_id;
    FOR huesped_item IN SELECT * FROM jsonb_array_elements(p_huespedes) LOOP
        SELECT id INTO v_huesped_id FROM huespedes WHERE tipo_documento = huesped_item->>'tipo_documento' AND numero_documento = huesped_item->>'numero_documento';
        IF v_huesped_id IS NOT NULL THEN
            UPDATE huespedes SET nombres = COALESCE(huesped_item->>'nombres', nombres), apellidos = COALESCE(huesped_item->>'apellidos', apellidos), correo = COALESCE(huesped_item->>'correo', correo) WHERE id = v_huesped_id;
        ELSE
            INSERT INTO huespedes (tipo_documento, numero_documento, nombres, apellidos, nacionalidad, correo, telefono)
            VALUES (huesped_item->>'tipo_documento', huesped_item->>'numero_documento', huesped_item->>'nombres', huesped_item->>'apellidos', COALESCE(huesped_item->>'nacionalidad', 'PE'), huesped_item->>'correo', huesped_item->>'telefono') RETURNING id INTO v_huesped_id;
        END IF;
        INSERT INTO reserva_huespedes (reserva_id, huesped_id, es_titular) VALUES (v_reserva_id, v_huesped_id, (huesped_item->>'es_titular')::boolean);
    END LOOP;

    UPDATE habitaciones SET estado_ocupacion = 'OCUPADA', estado_limpieza = 'LIMPIA' WHERE id = p_habitacion_id;
    RETURN jsonb_build_object('success', true, 'reserva_id', v_reserva_id);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END; $$;

-- Confirmar Check-in
CREATE OR REPLACE FUNCTION confirmar_checkin_reserva(p_reserva_id UUID, p_usuario_id UUID DEFAULT NULL) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_reserva RECORD; v_habitacion_id UUID;
BEGIN
    SELECT * INTO v_reserva FROM reservas WHERE id = p_reserva_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada'); END IF;
    UPDATE reservas SET estado = 'CHECKED_IN', check_in_real = NOW(), huesped_presente = TRUE WHERE id = p_reserva_id;
    UPDATE habitaciones SET estado_ocupacion = 'OCUPADA', estado_limpieza = 'LIMPIA' WHERE id = v_reserva.habitacion_id;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END; $$;

-- =============================================
-- 6. TRIGGERS
-- =============================================
CREATE TRIGGER update_usuarios_modtime BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_habitaciones_modtime BEFORE UPDATE ON public.habitaciones FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_reservas_modtime BEFORE UPDATE ON public.reservas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_hotel_config_modtime BEFORE UPDATE ON public.hotel_configuracion FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER trg_blindaje_fiscal BEFORE UPDATE ON public.comprobantes FOR EACH ROW EXECUTE FUNCTION proteger_comprobante_inmutable();
CREATE TRIGGER trg_audit_pagos AFTER INSERT OR UPDATE OR DELETE ON public.pagos FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_generic();
CREATE TRIGGER trg_audit_comprobantes AFTER INSERT OR UPDATE ON public.comprobantes FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_generic();
CREATE TRIGGER trg_audit_movimientos AFTER INSERT OR UPDATE ON public.caja_movimientos FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_generic();

-- =============================================
-- 7. VISTAS (VERSIÓN MEJORADA CON KARDEX)
-- =============================================
CREATE OR REPLACE VIEW public.vw_habitaciones_disponibles AS
SELECT h.id, h.numero, h.piso, t.nombre as tipo, t.capacidad_personas, c.nombre as categoria,
    CASE WHEN h.estado_servicio IN ('MANTENIMIENTO', 'FUERA_SERVICIO') THEN 'NO DISPONIBLE' WHEN h.estado_ocupacion = 'OCUPADA' THEN 'OCUPADA' WHEN h.estado_limpieza IN ('SUCIA', 'EN_LIMPIEZA') THEN 'POR LIMPIAR' ELSE 'DISPONIBLE' END as estado_visual,
    (SELECT precio_base FROM public.tarifas tar WHERE tar.tipo_habitacion_id = h.tipo_id AND tar.categoria_habitacion_id = h.categoria_id AND tar.activa = true ORDER BY tar.created_at DESC LIMIT 1) as precio_sugerido
FROM public.habitaciones h JOIN public.tipos_habitacion t ON h.tipo_id = t.id JOIN public.categorias_habitacion c ON h.categoria_id = c.id;

-- VISTA MEJORADA CON KARDEX
CREATE OR REPLACE VIEW public.vw_reservas_con_datos_basicos AS
SELECT 
    r.id, 
    r.codigo_reserva, 
    r.numero_kardex,
    r.estado, 
    r.fecha_entrada, 
    r.fecha_salida, 
    r.check_in_real, 
    r.check_out_real, 
    r.precio_pactado, 
    r.moneda_pactada, 
    r.huesped_presente,
    r.usuario_id,
    COALESCE(u.nombres || ' ' || COALESCE(u.apellidos, ''), 'RESPONSABLE RECEPCIÓN') as responsable_nombre,
    h.numero as habitacion_numero, 
    th.nombre as tipo_habitacion,
    hue.nombres || ' ' || hue.apellidos as titular_nombre,
    hue.tipo_documento as titular_tipo_doc,
    hue.numero_documento as titular_numero_doc,
    hue.procedencia_departamento as titular_procedencia
FROM public.reservas r 
JOIN public.habitaciones h ON r.habitacion_id = h.id 
LEFT JOIN public.usuarios u ON r.usuario_id = u.id
LEFT JOIN public.tipos_habitacion th ON h.tipo_id = th.id
LEFT JOIN public.reserva_huespedes rh ON r.id = rh.reserva_id AND rh.es_titular = true 
LEFT JOIN public.huespedes hue ON rh.huesped_id = hue.id
WHERE r.estado IN ('RESERVADA', 'CHECKED_IN', 'CHECKED_OUT') 
ORDER BY r.fecha_entrada DESC;

-- VISTA HISTORIAL COMPROBANTES (CON MÉTODO DE PAGO)
CREATE OR REPLACE VIEW public.vw_historial_comprobantes AS
SELECT 
    c.id,
    c.fecha_emision,
    c.tipo_comprobante,
    c.serie,
    c.numero,
    c.serie || '-' || LPAD(c.numero::text, 8, '0') as numero_completo,
    c.receptor_razon_social as cliente_nombre,
    c.receptor_tipo_doc as cliente_tipo_doc,
    c.receptor_nro_doc as cliente_doc,
    c.receptor_direccion,
    c.moneda,
    c.tipo_cambio,
    c.op_gravadas,
    c.op_exoneradas,
    c.op_inafectas,
    c.monto_igv,
    c.total_venta,
    c.estado_sunat,
    c.xml_url,
    c.cdr_url,
    c.pdf_url,
    c.hash_cpe,
    c.external_id,
    c.reserva_id,
    c.nota_credito_ref_id,
    c.turno_caja_id,
    ct.usuario_id,
    ct.caja_id,
    r.codigo_reserva,
    u.nombres || ' ' || COALESCE(u.apellidos, '') as emisor_nombre,
    u.rol as emisor_rol,
    (SELECT string_agg(DISTINCT p.metodo_pago, ', ') FROM public.pagos p WHERE p.comprobante_id = c.id) as metodo_pago
FROM public.comprobantes c
JOIN public.caja_turnos ct ON c.turno_caja_id = ct.id
JOIN public.usuarios u ON ct.usuario_id = u.id
LEFT JOIN public.reservas r ON c.reserva_id = r.id
ORDER BY c.fecha_emision DESC;

-- Vista Devoluciones Pendientes
CREATE OR REPLACE VIEW public.vw_devoluciones_pendientes AS
SELECT p.id, p.monto, p.fecha_pago, p.nota, p.reserva_id, r.codigo_reserva, (h.nombres || ' ' || h.apellidos) as huesped_nombre,
    CASE WHEN EXTRACT(DAY FROM now() - p.fecha_pago) < 3 THEN 'NORMAL' WHEN EXTRACT(DAY FROM now() - p.fecha_pago) < 7 THEN 'URGENTE' ELSE 'CRITICO' END as nivel_urgencia
FROM public.pagos p JOIN public.reservas r ON r.id = p.reserva_id LEFT JOIN public.reserva_huespedes rh ON rh.reserva_id = r.id AND rh.es_titular = true LEFT JOIN public.huespedes h ON h.id = rh.huesped_id
WHERE p.metodo_pago = 'DEVOLUCION_PENDIENTE' ORDER BY p.fecha_pago ASC;

-- Vista de Resumen de Turnos
CREATE OR REPLACE VIEW vw_resumen_turnos AS
SELECT ct.id, ct.caja_id, c.nombre as caja_nombre, ct.usuario_id, u.nombres || ' ' || u.apellidos as usuario_nombre, ct.fecha_apertura, ct.fecha_cierre, ct.estado,
    ct.monto_apertura_efectivo, ct.total_efectivo, ct.monto_cierre_teorico_efectivo, ct.monto_cierre_real_efectivo, ct.descuadre_efectivo,
    ct.total_tarjeta, ct.total_transferencia, ct.total_yape, ct.total_digital, ct.total_vendido,
    ct.requiere_autorizacion, ct.autorizado_por, ct.observaciones_cierre
FROM caja_turnos ct JOIN cajas c ON ct.caja_id = c.id JOIN usuarios u ON ct.usuario_id = u.id ORDER BY ct.fecha_apertura DESC;

-- Vistas Soft Delete
CREATE OR REPLACE VIEW public.vw_huespedes_activos AS
SELECT * FROM public.huespedes WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.vw_reservas_activas AS
SELECT r.*, h.numero as habitacion_numero, h.piso as habitacion_piso
FROM public.reservas r LEFT JOIN public.habitaciones h ON r.habitacion_id = h.id WHERE r.deleted_at IS NULL;

-- =============================================
-- 8. PERMISOS
-- =============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;

-- RLS Desactivado (Intranet)
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_configuracion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_comprobante DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turnos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_habitacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_habitacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.canales_venta DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.huespedes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserva_huespedes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobante_detalles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE habitaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE reservas;
ALTER PUBLICATION supabase_realtime ADD TABLE caja_turnos;
ALTER TABLE habitaciones REPLICA IDENTITY FULL;
ALTER TABLE reservas REPLICA IDENTITY FULL;

-- =============================================
-- 10. DATOS INICIALES (SEED)
-- =============================================
INSERT INTO public.usuarios (id, rol, nombres, apellidos, estado)
VALUES ('6446f1bc-5a30-4cf7-a537-aec3b9a09f42', 'ADMIN', 'Administrador', 'Sistema', true)
ON CONFLICT (id) DO UPDATE SET rol = 'ADMIN', estado = true;

-- =============================================
-- 11. FIN
-- =============================================
DO $$ BEGIN RAISE NOTICE '✅ SYSTEM READY: SCHEMA UNIFICADO v3.0 CREADO CON ÉXITO'; END $$;
