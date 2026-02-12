-- =============================================
-- Migrar nacionalidad a país + agregar ciudad
-- Para cumplir con D.S. N° 001-2015-MINCETUR
-- Libro de Huéspedes requiere: Ciudad, Departamento, País
-- =============================================

-- 1. Agregar columnas nuevas
ALTER TABLE public.huespedes 
ADD COLUMN IF NOT EXISTS procedencia_ciudad text,
ADD COLUMN IF NOT EXISTS pais text;

-- 2. Migrar datos: convertir nacionalidad (gentilicio) a país (nombre)
UPDATE public.huespedes 
SET pais = CASE 
    -- Gentilicios en español
    WHEN nacionalidad ILIKE '%peruana%' OR nacionalidad = 'PE' THEN 'Perú'
    WHEN nacionalidad ILIKE '%argentina%' OR nacionalidad = 'AR' THEN 'Argentina'
    WHEN nacionalidad ILIKE '%boliviana%' OR nacionalidad = 'BO' THEN 'Bolivia'
    WHEN nacionalidad ILIKE '%brasileña%' OR nacionalidad = 'BR' THEN 'Brasil'
    WHEN nacionalidad ILIKE '%chilena%' OR nacionalidad = 'CL' THEN 'Chile'
    WHEN nacionalidad ILIKE '%colombiana%' OR nacionalidad = 'CO' THEN 'Colombia'
    WHEN nacionalidad ILIKE '%ecuatoriana%' OR nacionalidad = 'EC' THEN 'Ecuador'
    WHEN nacionalidad ILIKE '%paraguaya%' OR nacionalidad = 'PY' THEN 'Paraguay'
    WHEN nacionalidad ILIKE '%uruguaya%' OR nacionalidad = 'UY' THEN 'Uruguay'
    WHEN nacionalidad ILIKE '%venezolana%' OR nacionalidad = 'VE' THEN 'Venezuela'
    WHEN nacionalidad ILIKE '%estadounidense%' OR nacionalidad = 'US' THEN 'Estados Unidos'
    WHEN nacionalidad ILIKE '%canadiense%' OR nacionalidad = 'CA' THEN 'Canadá'
    WHEN nacionalidad ILIKE '%mexicana%' OR nacionalidad = 'MX' THEN 'México'
    WHEN nacionalidad ILIKE '%española%' OR nacionalidad = 'ES' THEN 'España'
    WHEN nacionalidad ILIKE '%francesa%' OR nacionalidad = 'FR' THEN 'Francia'
    WHEN nacionalidad ILIKE '%italiana%' OR nacionalidad = 'IT' THEN 'Italia'
    WHEN nacionalidad ILIKE '%alemana%' OR nacionalidad = 'DE' THEN 'Alemania'
    WHEN nacionalidad ILIKE '%portuguesa%' OR nacionalidad = 'PT' THEN 'Portugal'
    WHEN nacionalidad ILIKE '%china%' OR nacionalidad = 'CN' THEN 'China'
    WHEN nacionalidad ILIKE '%japonesa%' OR nacionalidad = 'JP' THEN 'Japón'
    WHEN nacionalidad ILIKE '%australiana%' OR nacionalidad = 'AU' THEN 'Australia'
    -- Códigos ISO
    WHEN nacionalidad = 'GB' THEN 'Reino Unido'
    WHEN nacionalidad = 'NL' THEN 'Países Bajos'
    WHEN nacionalidad = 'BE' THEN 'Bélgica'
    WHEN nacionalidad = 'CH' THEN 'Suiza'
    WHEN nacionalidad = 'KR' THEN 'Corea del Sur'
    WHEN nacionalidad = 'IN' THEN 'India'
    WHEN nacionalidad = 'NZ' THEN 'Nueva Zelanda'
    -- Default
    ELSE 'Perú'
END
WHERE pais IS NULL;

-- 3. Migrar datos: ciudad desde departamento si no existe
UPDATE public.huespedes 
SET procedencia_ciudad = procedencia_departamento 
WHERE procedencia_ciudad IS NULL AND procedencia_departamento IS NOT NULL;

-- 4. Establecer default para registros sin país
UPDATE public.huespedes 
SET pais = 'Perú' 
WHERE pais IS NULL;

-- 5. Hacer pais NOT NULL con default
ALTER TABLE public.huespedes 
ALTER COLUMN pais SET DEFAULT 'Perú',
ALTER COLUMN pais SET NOT NULL;

-- 6. Eliminar vista que depende de nacionalidad
DROP VIEW IF EXISTS public.vw_huespedes_activos CASCADE;

-- 7. Eliminar columna nacionalidad (ya no se usa)
ALTER TABLE public.huespedes 
DROP COLUMN IF EXISTS nacionalidad;

-- 8. Recrear vista sin nacionalidad, con pais
CREATE OR REPLACE VIEW public.vw_huespedes_activos AS
SELECT * FROM public.huespedes WHERE deleted_at IS NULL;

-- 9. Crear índices
CREATE INDEX IF NOT EXISTS idx_huespedes_pais ON public.huespedes(pais);
CREATE INDEX IF NOT EXISTS idx_huespedes_ciudad ON public.huespedes(procedencia_ciudad);

-- 10. Comentarios
COMMENT ON COLUMN public.huespedes.procedencia_ciudad IS 'Ciudad de procedencia del huésped (requerido por MINCETUR)';
COMMENT ON COLUMN public.huespedes.pais IS 'País del huésped (requerido por MINCETUR)';

DO $$ 
BEGIN 
    RAISE NOTICE '✅ Migración completada: nacionalidad → país, ciudad agregada'; 
END $$;
