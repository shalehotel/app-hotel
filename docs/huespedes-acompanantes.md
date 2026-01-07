# 🧑‍🤝‍🧑 Sistema de Registro de Huéspedes con Acompañantes

## 📋 Componentes Creados

### 1. **Server Actions** (`lib/actions/huespedes.ts`)

Funciones backend para manejar huéspedes:

- `upsertHuesped()` - Crear o actualizar un huésped
- `buscarHuespedPorDocumento()` - Buscar por DNI/Pasaporte
- `registrarHuespedesEnReserva()` - Vincular múltiples huéspedes a una reserva
- `getHuespedesByReserva()` - Obtener todos los huéspedes de una reserva
- `searchHuespedes()` - Búsqueda por nombre o documento

### 2. **Componente de UI** (`components/huespedes/huespedes-form.tsx`)

Formulario completo con:
- ✅ Huésped titular (siempre 1)
- ✅ Acompañantes ilimitados
- ✅ Validación de documentos únicos
- ✅ Campos completos (nombre, apellido, documento, nacionalidad, etc.)
- ✅ Agregar/eliminar acompañantes dinámicamente

### 3. **Ejemplo de Integración** (`components/checkin/checkin-huespedes-step.tsx`)

Paso de check-in listo para usar.

---

## 🚀 Cómo Usar

### Opción 1: En un proceso de Check-in

```tsx
import { CheckinHuespedesStep } from '@/components/checkin/checkin-huespedes-step'

export default function CheckinPage() {
  const reservaId = 'uuid-de-la-reserva'
  
  return <CheckinHuespedesStep reservaId={reservaId} />
}
```

### Opción 2: Personalizado

```tsx
import { HuespedesForm } from '@/components/huespedes/huespedes-form'
import { registrarHuespedesEnReserva } from '@/lib/actions/huespedes'

export function MiComponente() {
  const handleGuardar = async (huespedes) => {
    const result = await registrarHuespedesEnReserva(
      'mi-reserva-id',
      huespedes
    )
    
    if (result.success) {
      console.log('¡Guardado!')
    }
  }

  return <HuespedesForm onSubmit={handleGuardar} />
}
```

---

## 🗄️ Estructura de Datos

### Flujo Completo:

```
1. Usuario llena formulario:
   - Titular: Juan Pérez (DNI: 12345678)
   - Acompañante 1: María Pérez (DNI: 87654321)
   - Acompañante 2: Pedro Pérez (DNI: 45678912)

2. Se ejecuta registrarHuespedesEnReserva():
   
   a) Inserta en tabla `huespedes`:
      ┌────┬─────────┬─────────┬──────────┐
      │ id │ nombres │ apellidos│ nro_doc  │
      ├────┼─────────┼─────────┼──────────┤
      │ 1  │ Juan    │ Pérez   │ 12345678 │
      │ 2  │ María   │ Pérez   │ 87654321 │
      │ 3  │ Pedro   │ Pérez   │ 45678912 │
      └────┴─────────┴─────────┴──────────┘

   b) Vincula en tabla `reserva_huespedes`:
      ┌────┬────────────┬────────────┬────────────┐
      │ id │ reserva_id │ huesped_id │ es_titular │
      ├────┼────────────┼────────────┼────────────┤
      │ 1  │ 100        │ 1          │ TRUE       │ ← Titular
      │ 2  │ 100        │ 2          │ FALSE      │ ← Acompañante
      │ 3  │ 100        │ 3          │ FALSE      │ ← Acompañante
      └────┴────────────┴────────────┴────────────┘

3. Resultado:
   - ✅ 3 huéspedes creados en BD
   - ✅ Vinculados a la reserva #100
   - ✅ Uno marcado como titular
```

---

## 📊 Consultas Útiles

### Obtener todos los huéspedes de una reserva:

```typescript
import { getHuespedesByReserva } from '@/lib/actions/huespedes'

const result = await getHuespedesByReserva('reserva-id')
// Retorna array con titular primero, luego acompañantes
```

### Buscar huésped por documento:

```typescript
import { buscarHuespedPorDocumento } from '@/lib/actions/huespedes'

const result = await buscarHuespedPorDocumento('DNI', '12345678')
// Retorna datos del huésped si existe
```

### Buscar por nombre:

```typescript
import { searchHuespedes } from '@/lib/actions/huespedes'

const result = await searchHuespedes('Juan Pérez')
// Retorna máximo 10 coincidencias
```

---

## ✅ Validaciones Incluidas

1. **Al menos 1 huésped:** No se puede enviar vacío
2. **Exactamente 1 titular:** Solo uno puede ser principal
3. **Nombres obligatorios:** Todos deben tener nombre y apellido
4. **Documentos únicos:** No se permiten duplicados en la misma reserva
5. **Documentos obligatorios:** Todos deben tener número de documento

---

## 🎨 Personalización

### Agregar campos adicionales:

1. Actualiza el tipo en `lib/actions/huespedes.ts`:
```typescript
export type HuespedData = {
  // ... campos existentes
  ciudad_origen?: string // NUEVO
}
```

2. Agrega el campo en el componente:
```tsx
<div>
  <Label>Ciudad de Origen</Label>
  <Input
    value={titular.ciudad_origen}
    onChange={(e) =>
      actualizarHuesped(titular.id, 'ciudad_origen', e.target.value)
    }
  />
</div>
```

3. Actualiza el schema SQL (si no existe):
```sql
ALTER TABLE public.huespedes ADD COLUMN ciudad_origen text;
```

---

## 📝 Ejemplo de Integración Completa

### Check-in en 3 Pasos:

```tsx
// app/(dashboard)/checkin/[reservaId]/page.tsx

'use client'

import { useState } from 'react'
import { HuespedesForm } from '@/components/huespedes/huespedes-form'
import { registrarHuespedesEnReserva } from '@/lib/actions/huespedes'

export default function CheckinPage({ params }: { params: { reservaId: string } }) {
  const [paso, setPaso] = useState(1)

  const handleHuespedes = async (huespedes) => {
    await registrarHuespedesEnReserva(params.reservaId, huespedes)
    setPaso(2) // Siguiente paso
  }

  return (
    <div>
      {paso === 1 && (
        <div>
          <h1>Paso 1: Datos de Huéspedes</h1>
          <HuespedesForm onSubmit={handleHuespedes} />
        </div>
      )}

      {paso === 2 && (
        <div>
          <h1>Paso 2: Confirmar Datos</h1>
          {/* ... */}
        </div>
      )}

      {paso === 3 && (
        <div>
          <h1>Paso 3: Check-in Completo</h1>
          {/* ... */}
        </div>
      )}
    </div>
  )
}
```

---

## 🔥 Casos de Uso

### 1. **Familia de 4 personas:**
- Titular: Padre
- Acompañantes: Madre, 2 hijos

### 2. **Pareja:**
- Titular: Esposo
- Acompañante: Esposa

### 3. **Grupo de amigos:**
- Titular: Quien reserva
- Acompañantes: 5 amigos

### 4. **Solo:**
- Titular: Único huésped
- Sin acompañantes

---

## ⚠️ Importante

- **Documentos únicos:** Si un huésped ya existe (mismo tipo + número de documento), se ACTUALIZA en lugar de crear uno nuevo
- **Limpieza de vínculos:** Al guardar, se eliminan vínculos anteriores de esa reserva
- **Titular obligatorio:** Siempre debe haber exactamente 1 titular
- **No se puede eliminar titular:** Protegido en la UI

---

## 🎯 Próximos Pasos

Para integrar en tu sistema:

1. **Agregar ruta de check-in:**
   ```
   app/(dashboard)/checkin/[reservaId]/page.tsx
   ```

2. **Botón "Check-in" en el Rack:**
   ```tsx
   <Button onClick={() => router.push(`/checkin/${reserva.id}`)}>
     Hacer Check-in
   </Button>
   ```

3. **Modificar reservas para usar este componente**

4. **Opcional:** Autocompletar con datos anteriores del huésped

---

**¿Necesitas ayuda?** El componente está listo para usar. Solo necesitas integrarlo en tu flujo de check-in o reservas.
