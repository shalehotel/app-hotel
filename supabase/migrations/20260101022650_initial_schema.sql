-- =============================================
-- SISTEMA DE GESTIÓN HOTELERA - ESQUEMA COMPLETO V2
-- Incluye: Core Hotelero + Facturación + Caja Multimoneda + Movimientos
-- =============================================

-- =============================================
-- 1. CONFIGURACIÓN INICIAL Y EXTENSIONES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. DEFINICIÓN DE ENUMS
-- =============================================
-- Enums de Hotel
CREATE TYPE estado_ocupacion_enum AS ENUM ('LIBRE', 'OCUPADA');
CREATE TYPE estado_limpieza_enum AS ENUM ('LIMPIA', 'SUCIA', 'EN_LIMPIEZA');
CREATE TYPE estado_servicio_enum AS ENUM ('OPERATIVA', 'MANTENIMIENTO', 'FUERA_SERVICIO');
CREATE TYPE estado_reserva_enum AS ENUM ('RESERVADA', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELADA', 'NO_SHOW');

-- Enums Financieros y Fiscales
CREATE TYPE tipo_comprobante_enum AS ENUM ('BOLETA', 'FACTURA', 'NOTA_CREDITO', 'TICKET_INTERNO');
CREATE TYPE moneda_enum AS ENUM ('PEN', 'USD');
CREATE TYPE estado_sunat_enum AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'ANULADO');

-- Enum de Roles (Seguridad)
CREATE TYPE rol_usuario_enum AS ENUM ('ADMIN', 'RECEPCION', 'HOUSEKEEPING');

-- =============================================
-- MÓDULO 3: SEGURIDAD (USUARIOS)
-- =============================================
CREATE TABLE public.usuarios (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rol rol_usuario_enum NOT NULL DEFAULT 'RECEPCION',
    nombres text NOT NULL,
    apellidos text,
    estado boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MÓDULO 4: INFRAESTRUCTURA FINANCIERA Y FISCAL
-- =============================================

-- Configuración del Hotel (Datos del Emisor SUNAT)
CREATE TABLE public.hotel_configuracion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ruc text NOT NULL,
    razon_social text NOT NULL,
    nombre_comercial text,
    direccion_fiscal text,
    ubigeo_codigo text,
    tasa_igv numeric(5,2) DEFAULT 18.00,
    tasa_icbper numeric(5,2) DEFAULT 0.50, -- Impuesto bolsas
    es_exonerado_igv boolean DEFAULT false, -- Para Amazonía
    facturacion_activa boolean DEFAULT true,
    proveedor_sunat_config jsonb,
    
    -- Horarios de operación
    hora_checkin time DEFAULT '14:00:00',
    hora_checkout time DEFAULT '12:00:00',
    
    -- Contacto
    telefono text,
    email text,
    pagina_web text,
    
    -- Información adicional
    logo_url text,
    descripcion text,
    
    updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX only_one_config_row ON public.hotel_configuracion ((true));

CREATE TABLE public.cajas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL, -- 'Caja Recepción Principal', 'Caja Bar'
    estado boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- MOTOR DE SERIES (Gestión de concurrencia para correlativos)
CREATE TABLE public.series_comprobante (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id uuid REFERENCES public.cajas(id),
    tipo_comprobante tipo_comprobante_enum NOT NULL,
    serie text NOT NULL, -- Ej: 'F001', 'B001'
    correlativo_actual bigint NOT NULL DEFAULT 0,
    UNIQUE(serie, tipo_comprobante)
);

-- FUNCIÓN PARA OBTENER CORRELATIVO (ATÓMICA)
CREATE OR REPLACE FUNCTION obtener_siguiente_correlativo(p_serie text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
    nuevo_correlativo bigint;
BEGIN
    UPDATE public.series_comprobante
    SET correlativo_actual = correlativo_actual + 1
    WHERE serie = p_serie
    RETURNING correlativo_actual INTO nuevo_correlativo;
    RETURN nuevo_correlativo;
END;
$$;

-- TURNOS DE CAJA (Apertura y Cierre Multimoneda)
CREATE TABLE public.caja_turnos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id uuid REFERENCES public.cajas(id) NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) NOT NULL,
    
    fecha_apertura timestamptz DEFAULT now(),
    fecha_cierre timestamptz,
    
    -- MONEDA NACIONAL (PEN)
    monto_apertura numeric(12,2) DEFAULT 0,
    monto_cierre_declarado numeric(12,2),
    monto_cierre_sistema numeric(12,2),

    -- MONEDA EXTRANJERA (USD)
    monto_apertura_usd numeric(12,2) DEFAULT 0,
    monto_cierre_declarado_usd numeric(12,2) DEFAULT 0,
    monto_cierre_sistema_usd numeric(12,2) DEFAULT 0,
    
    estado text DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA'))
);

-- MOVIMIENTOS DE CAJA (Gastos Operativos / Ingresos Extras)
CREATE TABLE public.caja_movimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    caja_turno_id uuid REFERENCES public.caja_turnos(id) ON DELETE CASCADE NOT NULL,
    usuario_id uuid REFERENCES public.usuarios(id) NOT NULL,
    
    -- Clasificación
    tipo text CHECK (tipo IN ('INGRESO', 'EGRESO')) NOT NULL,
    categoria text, -- Ej: 'GASTO_OPERATIVO', 'DOTACION_SENCILLO', 'TAXI'
    
    -- Datos financieros
    moneda moneda_enum DEFAULT 'PEN',
    monto numeric(12,2) NOT NULL CHECK (monto > 0),
    
    -- Descripción y evidencia
    motivo text NOT NULL CHECK (char_length(motivo) >= 5),
    comprobante_referencia text, -- Nro de ticket o factura física
    evidencia_url text, -- Foto del recibo
    
    created_at timestamptz DEFAULT now()
);

-- Índices para Movimientos
CREATE INDEX idx_movimientos_turno ON public.caja_movimientos(caja_turno_id);
CREATE INDEX idx_movimientos_usuario ON public.caja_movimientos(usuario_id);
CREATE INDEX idx_movimientos_fecha ON public.caja_movimientos(created_at DESC);

-- =============================================
-- MÓDULO 5: CATALOGOS Y REGLAS COMERCIALES
-- =============================================

-- Tipos de Habitación (Capacidad)
CREATE TABLE public.tipos_habitacion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL, -- 'Simple', 'Matrimonial', 'Doble Twin'
    capacidad_personas int NOT NULL DEFAULT 2,
    created_at timestamptz DEFAULT now()
);

-- Categorías (Calidad - OBLIGATORIO aunque sea única)
CREATE TABLE public.categorias_habitacion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL, -- 'Estándar', 'Superior', 'Suite', 'Única'
    descripcion text,
    created_at timestamptz DEFAULT now()
);

-- Canales de Venta (Origen de reserva)
CREATE TABLE public.canales_venta (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL UNIQUE, -- 'Recepción', 'Booking.com', 'Airbnb', 'Web'
    comision_porcentaje numeric(5,2) DEFAULT 0.00,
    activo boolean DEFAULT true
);

-- Tarifas (Reglas de Precio)
CREATE TABLE public.tarifas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_habitacion_id uuid REFERENCES public.tipos_habitacion(id),
    categoria_habitacion_id uuid REFERENCES public.categorias_habitacion(id),
    
    nombre_tarifa text NOT NULL, -- 'Tarifa Base 2025', 'Feriados Patrios'
    
    precio_base numeric(12,2) NOT NULL,    -- Precio sugerido
    precio_minimo numeric(12,2) NOT NULL,  -- Precio mínimo negociable
    
    fecha_inicio date,
    fecha_fin date, -- NULL = Indefinida
    
    activa boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- =============================================
-- MÓDULO 6: INVENTARIO FÍSICO (HABITACIONES)
-- =============================================
CREATE TABLE public.habitaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero text NOT NULL UNIQUE,
    piso text,
    
    tipo_id uuid REFERENCES public.tipos_habitacion(id) NOT NULL,
    categoria_id uuid REFERENCES public.categorias_habitacion(id) NOT NULL,
    
    -- LAS 3 DIMENSIONES DE ESTADO
    estado_ocupacion estado_ocupacion_enum DEFAULT 'LIBRE',   -- ¿Hay reserva activa?
    estado_limpieza estado_limpieza_enum DEFAULT 'LIMPIA',    -- ¿Se puede vender?
    estado_servicio estado_servicio_enum DEFAULT 'OPERATIVA', -- ¿Funciona todo?
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================
-- MÓDULO 7: HUÉSPEDES
-- =============================================
CREATE TABLE public.huespedes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres text NOT NULL,
    apellidos text NOT NULL,
    tipo_documento text NOT NULL, -- 'DNI', 'CE', 'PASAPORTE'
    numero_documento text NOT NULL,
    nacionalidad text,
    correo text,
    telefono text,
    fecha_nacimiento date,
    created_at timestamptz DEFAULT now(),
    UNIQUE(tipo_documento, numero_documento)
);

-- =============================================
-- MÓDULO 8: RESERVAS (OPERACIÓN CENTRAL)
-- =============================================
CREATE TABLE public.reservas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_reserva text UNIQUE DEFAULT substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8),
    
    habitacion_id uuid REFERENCES public.habitaciones(id),
    canal_venta_id uuid REFERENCES public.canales_venta(id), 
    
    -- FECHAS
    fecha_entrada timestamptz NOT NULL,
    fecha_salida timestamptz NOT NULL,
    check_in_real timestamptz,
    check_out_real timestamptz,
    
    estado estado_reserva_enum DEFAULT 'RESERVADA',
    
    -- AUDITORÍA ECONÓMICA (Precios congelados)
    precio_base_tarifa numeric(12,2),      -- El precio original de la regla
    precio_pactado numeric(12,2) NOT NULL, -- El precio final acordado
    moneda_pactada moneda_enum DEFAULT 'PEN',
    autorizado_descuento boolean DEFAULT false, 
    
    total_estimado numeric(12,2) GENERATED ALWAYS AS (
        precio_pactado * (GREATEST(1, EXTRACT(DAY FROM (fecha_salida - fecha_entrada))))
    ) STORED,
    
    -- ESTADO DE PRESENCIA (Seguridad Operativa)
    huesped_presente boolean DEFAULT false, 
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Relación Reservas <-> Huéspedes (Muchos a Muchos)
CREATE TABLE public.reserva_huespedes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id uuid REFERENCES public.reservas(id) ON DELETE CASCADE,
    huesped_id uuid REFERENCES public.huespedes(id),
    es_titular boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    UNIQUE(reserva_id, huesped_id)
);

-- =============================================
-- MÓDULO 9: FACTURACIÓN Y PAGOS
-- =============================================

CREATE TABLE public.comprobantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_caja_id uuid REFERENCES public.caja_turnos(id) NOT NULL,
    reserva_id uuid REFERENCES public.reservas(id) NOT NULL, 
    
    -- DATOS DE EMISIÓN
    fecha_emision timestamptz DEFAULT now(),
    tipo_comprobante tipo_comprobante_enum NOT NULL,
    serie text NOT NULL,
    numero bigint NOT NULL,
    
    -- SNAPSHOT DEL RECEPTOR (Datos fiscales congelados)
    receptor_tipo_doc text NOT NULL, 
    receptor_nro_doc text NOT NULL,
    receptor_razon_social text NOT NULL,
    receptor_direccion text,
    
    -- MULTIMONEDA
    moneda moneda_enum DEFAULT 'PEN',
    tipo_cambio numeric(5,3) DEFAULT 1.000, 
    
    -- TOTALES
    op_gravadas numeric(12,2) DEFAULT 0.00,
    op_exoneradas numeric(12,2) DEFAULT 0.00,
    op_inafectas numeric(12,2) DEFAULT 0.00,
    monto_igv numeric(12,2) DEFAULT 0.00,
    monto_icbper numeric(12,2) DEFAULT 0.00,
    total_venta numeric(12,2) NOT NULL,
    
    -- ESTADO SUNAT
    estado_sunat estado_sunat_enum DEFAULT 'PENDIENTE',
    nota_credito_ref_id uuid REFERENCES public.comprobantes(id), 
    
    -- DATA PSE/OSE
    hash_cpe text,
    external_id text,
    cdr_url text,
    xml_url text,
    
    UNIQUE(serie, numero),
    created_at timestamptz DEFAULT now()
);

-- Detalles del comprobante (Líneas de factura)
CREATE TABLE public.comprobante_detalles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comprobante_id uuid REFERENCES public.comprobantes(id) ON DELETE CASCADE,
    
    descripcion text NOT NULL, 
    cantidad numeric(10,2) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    
    -- Código tributario por ítem
    codigo_afectacion_igv text NOT NULL DEFAULT '10' 
);

-- PAGOS (Cobranza)
CREATE TABLE public.pagos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id uuid REFERENCES public.reservas(id) NOT NULL,
    caja_turno_id uuid REFERENCES public.caja_turnos(id) NOT NULL, -- Auditoría de quién cobró
    comprobante_id uuid REFERENCES public.comprobantes(id), -- Opcional
    
    metodo_pago text NOT NULL, -- 'EFECTIVO', 'YAPE', 'VISA', 'MASTERCARD'
    moneda_pago moneda_enum DEFAULT 'PEN',
    monto numeric(10,2) NOT NULL,
    tipo_cambio_pago numeric(5,3) DEFAULT 1.000,
    
    referencia_pago text, -- Nro Operación
    nota text,
    
    fecha_pago timestamptz DEFAULT now()
);

-- =============================================
-- MÓDULO 10: TRIGGERS (UPDATED_AT AUTOMÁTICO)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_modtime BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_habitaciones_modtime BEFORE UPDATE ON public.habitaciones FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_reservas_modtime BEFORE UPDATE ON public.reservas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_hotel_config_modtime BEFORE UPDATE ON public.hotel_configuracion FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================
-- MÓDULO 11: SEGURIDAD RLS (BASE)
-- =============================================
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;

-- Política de ejemplo: Usuarios autenticados ven todo lo básico
CREATE POLICY "Acceso total autenticado" ON public.reservas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso total autenticado" ON public.comprobantes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso total autenticado" ON public.habitaciones FOR ALL USING (auth.role() = 'authenticated');

-- POLÍTICAS ESPECÍFICAS PARA MOVIMIENTOS DE CAJA
-- 1. Ver movimientos: Dueño del turno o Admin
CREATE POLICY "Usuarios ven sus movs o admin todo"
ON public.caja_movimientos FOR SELECT
USING (
    auth.uid() IN (SELECT usuario_id FROM public.caja_turnos WHERE id = caja_movimientos.caja_turno_id)
    OR
    auth.uid() IN (SELECT id FROM public.usuarios WHERE rol = 'ADMIN')
);

-- 2. Crear movimientos: Solo el dueño del turno si está ABIERTA
CREATE POLICY "Solo dueño turno crea movimientos"
ON public.caja_movimientos FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT usuario_id FROM public.caja_turnos 
        WHERE id = caja_turno_id AND estado = 'ABIERTA'
    )
);

-- =============================================
-- VISTAS Y FUNCIONES DE NEGOCIO
-- =============================================

-- VISTA: Disponibilidad
CREATE OR REPLACE VIEW public.vw_habitaciones_disponibles AS
SELECT 
    h.id,
    h.numero,
    h.piso,
    t.nombre as tipo,
    t.capacidad_personas,
    c.nombre as categoria,
    CASE 
        WHEN h.estado_servicio = 'MANTENIMIENTO' OR h.estado_servicio = 'FUERA_SERVICIO' THEN 'NO DISPONIBLE (MANTENIMIENTO)'
        WHEN h.estado_ocupacion = 'OCUPADA' THEN 'OCUPADA'
        WHEN h.estado_limpieza = 'SUCIA' OR h.estado_limpieza = 'EN_LIMPIEZA' THEN 'POR LIMPIAR' 
        ELSE 'DISPONIBLE'
    END as estado_visual,
    (SELECT precio_base FROM public.tarifas tar 
     WHERE tar.tipo_habitacion_id = h.tipo_id 
       AND tar.categoria_habitacion_id = h.categoria_id
       AND tar.activa = true
       AND (tar.fecha_inicio IS NULL OR tar.fecha_inicio <= CURRENT_DATE)
       AND (tar.fecha_fin IS NULL OR tar.fecha_fin >= CURRENT_DATE)
     ORDER BY tar.created_at DESC LIMIT 1
    ) as precio_sugerido
FROM public.habitaciones h
JOIN public.tipos_habitacion t ON h.tipo_id = t.id
JOIN public.categorias_habitacion c ON h.categoria_id = c.id;

-- FUNCIÓN: Sincronizar Estado Habitación
CREATE OR REPLACE FUNCTION sincronizar_estado_habitacion()
RETURNS TRIGGER AS $$
BEGIN
    -- CHECK-IN
    IF NEW.estado = 'CHECKED_IN' AND (OLD.estado IS DISTINCT FROM 'CHECKED_IN') THEN
        UPDATE public.habitaciones
        SET estado_ocupacion = 'OCUPADA',
            estado_limpieza = 'LIMPIA'
        WHERE id = NEW.habitacion_id;
        NEW.huesped_presente := true; 
        NEW.check_in_real := now();
    END IF;

    -- CHECK-OUT
    IF NEW.estado = 'CHECKED_OUT' AND (OLD.estado IS DISTINCT FROM 'CHECKED_OUT') THEN
        UPDATE public.habitaciones
        SET estado_ocupacion = 'LIBRE',
            estado_limpieza = 'SUCIA'
        WHERE id = NEW.habitacion_id;
        NEW.huesped_presente := false;
        NEW.check_out_real := now();
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_gestion_estados_reserva
BEFORE UPDATE ON public.reservas
FOR EACH ROW
EXECUTE PROCEDURE sincronizar_estado_habitacion();

-- FUNCIÓN: Validar Check-in
CREATE OR REPLACE FUNCTION validar_checkin_habitacion()
RETURNS TRIGGER AS $$
DECLARE
    estado_actual_limpieza text;
    estado_actual_servicio text;
BEGIN
    IF NEW.estado = 'CHECKED_IN' AND (OLD.estado IS DISTINCT FROM 'CHECKED_IN') THEN
        SELECT estado_limpieza::text, estado_servicio::text 
        INTO estado_actual_limpieza, estado_actual_servicio
        FROM public.habitaciones 
        WHERE id = NEW.habitacion_id;

        IF estado_actual_servicio != 'OPERATIVA' THEN
            RAISE EXCEPTION 'No se puede hacer Check-in: La habitación está en %', estado_actual_servicio;
        END IF;

        IF estado_actual_limpieza != 'LIMPIA' THEN
             RAISE EXCEPTION 'No se puede hacer Check-in: La habitación está SUCIA o EN LIMPIEZA';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_validar_checkin
BEFORE UPDATE ON public.reservas
FOR EACH ROW
EXECUTE PROCEDURE validar_checkin_habitacion();

-- FUNCIÓN: Calcular Total Movimientos Turno (Reporte Cierre)
CREATE OR REPLACE FUNCTION calcular_movimientos_turno(p_turno_id uuid)
RETURNS TABLE(
    total_ingresos_pen numeric,
    total_ingresos_usd numeric,
    total_egresos_pen numeric,
    total_egresos_usd numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' AND moneda = 'PEN' THEN monto ELSE 0 END), 0) as total_ingresos_pen,
        COALESCE(SUM(CASE WHEN tipo = 'INGRESO' AND moneda = 'USD' THEN monto ELSE 0 END), 0) as total_ingresos_usd,
        COALESCE(SUM(CASE WHEN tipo = 'EGRESO' AND moneda = 'PEN' THEN monto ELSE 0 END), 0) as total_egresos_pen,
        COALESCE(SUM(CASE WHEN tipo = 'EGRESO' AND moneda = 'USD' THEN monto ELSE 0 END), 0) as total_egresos_usd
    FROM public.caja_movimientos
    WHERE caja_turno_id = p_turno_id;
END;
$$;

-- =============================================
-- MÓDULO 12: PERMISOS Y GRANTS FINALES
-- =============================================

-- Dar permisos al rol authenticated en todas las tablas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habitaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_habitacion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_habitacion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarifas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserva_huespedes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.huespedes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprobantes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprobante_detalles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cajas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_turnos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_movimientos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_comprobante TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_configuracion TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canales_venta TO authenticated;

-- Dar permisos de ejecución en funciones
GRANT EXECUTE ON FUNCTION obtener_siguiente_correlativo(text) TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_movimientos_turno(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION sincronizar_estado_habitacion() TO authenticated;
GRANT EXECUTE ON FUNCTION validar_checkin_habitacion() TO authenticated;

-- Dar permisos en vistas
GRANT SELECT ON public.vw_habitaciones_disponibles TO authenticated;

-- Dar permisos completos al service_role (usado por Server Actions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- DESHABILITAR RLS en tablas operacionales (sistema interno de hotel)
-- El control de acceso se maneja en Server Actions
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_habitacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_habitacion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_turnos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_comprobante DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.canales_venta DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.huespedes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserva_huespedes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_configuracion DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobante_detalles DISABLE ROW LEVEL SECURITY;

-- Mantener RLS HABILITADO solo en tablas que lo necesitan
-- (ya están habilitadas arriba en MÓDULO 11)
-- - reservas (con política amplia)
-- - comprobantes (con política amplia)
-- - pagos (sin política aún, TODO futuro)
-- - caja_movimientos (con políticas específicas)

-- =============================================
-- FIN DEL ESQUEMA INICIAL COMPLETO
-- =============================================