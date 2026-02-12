# 🚨 CAMBIOS TEMPORALES - REVERTIR DESPUÉS

## ⚠️ Este documento lista todos los cambios temporales que deben eliminarse una vez resueltos los casos especiales.

---

## 📋 CAMBIOS IMPLEMENTADOS:

### 1. **Rack: Mostrar 4 días anteriores (en vez de 3)**
**Archivo**: `hooks/use-rack-data.ts`  
**Línea**: ~62  
**Cambio**:
```typescript
// TEMPORAL: Cambiar de 3 a 4 días para ver reservas antiguas (revertir después)
const PAST_DAYS_CONTEXT = 4  // Original: 3
```

**Para revertir**:
```typescript
const PAST_DAYS_CONTEXT = 3
```

---

### 2. **Corregir hora de check-in de reservas pasadas**

**NO se modificó código** - Solo ejecutar SQL directo en Supabase:

#### Para corregir hora de llegada de una reserva específica:

```sql
-- Ejemplo: Cambiar hora de check-in a las 8:00 AM del día que entró
UPDATE reservas 
SET check_in_real = '2026-02-07 08:00:00'  -- Ajustar fecha y hora
WHERE id = 'uuid-de-la-reserva';

-- O buscar por habitación y fecha:
UPDATE reservas 
SET check_in_real = '2026-02-07 08:00:00'
WHERE habitacion_id = (SELECT id FROM habitaciones WHERE numero = '101')
  AND fecha_entrada = '2026-02-07'
  AND estado = 'CHECKED_IN';
```

#### Para encontrar reservas recientes sin hora correcta:

```sql
-- Ver reservas de los últimos 5 días con su hora de check-in
SELECT 
    r.codigo_reserva,
    h.numero as habitacion,
    r.titular_nombre,
    r.fecha_entrada,
    r.check_in_real,
    DATE_PART('hour', r.check_in_real) as hora_checkin
FROM reservas r
JOIN habitaciones h ON r.habitacion_id = h.id
WHERE r.check_in_real >= NOW() - INTERVAL '5 days'
  AND r.estado = 'CHECKED_IN'
ORDER BY r.check_in_real DESC;
```

---

## 🔍 CÓMO ENCONTRAR TODOS LOS CAMBIOS TEMPORALES:

Buscar en el código el comentario: `TEMPORAL:`

```bash
grep -r "TEMPORAL:" --include="*.ts" --include="*.tsx"
```

---

## ✅ CHECKLIST DE REVERSIÓN:

- [ ] `hooks/use-rack-data.ts` - Cambiar PAST_DAYS_CONTEXT de 4 a 3
- [ ] Eliminar este archivo README

---

## 📅 FECHA DE IMPLEMENTACIÓN: 11 de Febrero de 2026
## 👤 IMPLEMENTADO POR: GitHub Copilot
