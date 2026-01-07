-- =============================================
-- SEED DATA - Solo lo esencial
-- =============================================

-- =============================================
-- 1. CATEGORÍA (Solo Estándar)
-- =============================================
INSERT INTO public.categorias_habitacion (nombre, descripcion) VALUES
('Estándar', 'Habitación con servicios esenciales')
ON CONFLICT DO NOTHING;

-- =============================================
-- 2. TIPOS DE HABITACIÓN
-- =============================================
INSERT INTO public.tipos_habitacion (nombre, capacidad_personas) VALUES
('Simple', 1),
('Doble', 3),
('Doble 4P', 4),
('Matrimonial', 2),
('Triple', 3),
('Triple 5P', 5)
ON CONFLICT DO NOTHING;

-- =============================================
-- 3. TARIFAS BASE (Tipo + Categoría Estándar)
-- =============================================
INSERT INTO public.tarifas (
    tipo_habitacion_id,
    categoria_habitacion_id,
    nombre_tarifa,
    precio_base,
    precio_minimo,
    activa
)
SELECT 
    t.id,
    c.id,
    CONCAT('Tarifa Base - ', t.nombre),
    CASE 
        WHEN t.nombre = 'Simple' THEN 50.00
        WHEN t.nombre = 'Doble' THEN 90.00
        WHEN t.nombre = 'Doble 4P' THEN 100.00
        WHEN t.nombre = 'Matrimonial' THEN 70.00
        WHEN t.nombre = 'Triple' THEN 110.00
        WHEN t.nombre = 'Triple 5P' THEN 120.00
    END,
    CASE 
        WHEN t.nombre = 'Simple' THEN 30.00
        WHEN t.nombre = 'Doble' THEN 80.00
        WHEN t.nombre = 'Doble 4P' THEN 90.00
        WHEN t.nombre = 'Matrimonial' THEN 50.00
        WHEN t.nombre = 'Triple' THEN 100.00
        WHEN t.nombre = 'Triple 5P' THEN 110.00
    END,
    true
FROM public.tipos_habitacion t
CROSS JOIN public.categorias_habitacion c
WHERE c.nombre = 'Estándar'
ON CONFLICT DO NOTHING;

-- =============================================
-- 4. USUARIO ADMINISTRADOR
-- =============================================
INSERT INTO public.usuarios (id, rol, nombres, apellidos, estado)
VALUES (
    '0930db09-44f0-4f3b-bc74-1209bbbe7b32',
    'ADMIN',
    'Administrador',
    'Sistema',
    true
)
ON CONFLICT (id) DO UPDATE 
SET rol = 'ADMIN', estado = true;

SELECT 'Seed completado' AS message;
