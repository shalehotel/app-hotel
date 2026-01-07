# Plan de Implementación: RACK (Sistema PMS Core)

## 🎯 Stack Tecnológico Seleccionado

### Core Libraries
- **Layout & UI**: shadcn/ui (Sheet, Command, Badge, Tooltip, ContextMenu)
- **Grilla**: CSS Grid nativo (más control, mejor performance)
- **Virtual Scrolling**: @tanstack/react-virtual (moderno, mantenido)
- **Drag & Drop**: @dnd-kit/core (accesible, flexible, usado por shadcn)
- **Real-time**: Supabase Realtime (ya integrado)
- **State**: React hooks + Context API (evitar complejidad innecesaria)

### Justificación
- ✅ Sin librerías pesadas de calendario (no necesitamos eventos, solo grilla)
- ✅ DnD Kit es tipo-safe y accesible (mejor que react-beautiful-dnd)
- ✅ TanStack Virtual maneja miles de habitaciones sin lag
- ✅ CSS Grid da control pixel-perfect sobre las celdas

## 📐 Arquitectura de Componentes (Modular)

```
app/(dashboard)/rack/
├── page.tsx                      # Server component - carga datos inicial
├── rack-container.tsx            # Client wrapper - maneja estado global
├── components/
│   ├── command-bar/
│   │   ├── command-bar.tsx       # Barra superior sticky
│   │   ├── omnibox.tsx           # Buscador global
│   │   └── kpi-chips.tsx         # Indicadores (llegadas, salidas)
│   ├── smart-sidebar/
│   │   ├── smart-sidebar.tsx     # Panel lateral derecho
│   │   ├── today-tab.tsx         # Tareas del día
│   │   └── alerts-tab.tsx        # Alertas y pendientes
│   ├── main-grid/
│   │   ├── rack-grid.tsx         # Grilla principal
│   │   ├── grid-header.tsx       # Encabezado de días (sticky)
│   │   ├── room-row.tsx          # Fila por habitación
│   │   ├── reservation-block.tsx # Bloque de reserva (átomo)
│   │   └── grid-cell.tsx         # Celda vacía (día x habitación)
│   ├── slide-over/
│   │   ├── reservation-detail.tsx # Panel deslizable de detalle
│   │   └── quick-checkin.tsx      # Formulario rápido check-in
│   └── context-menu/
│       └── reservation-context-menu.tsx # Menú clic derecho
└── hooks/
    ├── use-rack-data.ts          # Fetch y cache de reservas
    ├── use-drag-drop.ts          # Lógica de arrastre
    └── use-realtime-sync.ts      # Supabase realtime

lib/actions/
└── rack.ts                       # Server actions para operaciones
```

## 🚀 Plan de Implementación (6 Fases)

### FASE 1: Foundation (Base sólida) ⭐ EMPEZAR AQUÍ
**Objetivo**: Layout funcional sin funcionalidad
**Componentes**:
- Layout con 4 zonas (Command Bar, Sidebar, Grid, Slide-over)
- Command Bar con buscador mock
- Smart Sidebar con tabs vacíos
- Grid con habitaciones hardcodeadas (sin reservas)

**Entregable**: Vista estática del Rack que se ve profesional

---

### FASE 2: Data Layer (Capa de datos)
**Objetivo**: Cargar datos reales desde Supabase
**Componentes**:
- Server actions para fetch de reservas
- Hook `use-rack-data` con cache
- Renderizar habitaciones reales desde BD
- Mostrar fechas dinámicas (hoy ± 30 días)

**Entregable**: Grilla con habitaciones reales, sin reservas visibles aún

---

### FASE 3: Reservation Blocks (Bloques de reserva)
**Objetivo**: Dibujar reservas como bloques en la grilla
**Componentes**:
- `reservation-block.tsx` con estilos por estado
- Lógica de posicionamiento (calcular columna inicio/fin)
- Tooltips en hover
- Click abre slide-over de detalle

**Entregable**: Rack visual completo con reservas de colores

---

### FASE 4: Drag & Drop (Arrastre)
**Objetivo**: Mover y redimensionar reservas
**Componentes**:
- Integrar @dnd-kit
- Drag horizontal = cambiar fechas
- Drag vertical = cambiar habitación
- Validaciones en tiempo real

**Entregable**: Sistema interactivo de gestión

---

### FASE 5: Quick Actions (Acciones rápidas)
**Objetivo**: Context menu y operaciones rápidas
**Componentes**:
- Context menu (clic derecho)
- Check-in rápido
- Cobro rápido
- Marcar limpia

**Entregable**: Recepcionista puede operar sin salir del Rack

---

### FASE 6: Real-time & Polish (Tiempo real y pulido)
**Objetivo**: Sistema productivo
**Componentes**:
- Supabase Realtime para sincronización
- Virtual scrolling con TanStack
- Optimizaciones de performance
- Loading states y error handling

**Entregable**: Sistema listo para producción

---

## 📦 Dependencias a Instalar

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @tanstack/react-virtual
npm install date-fns # Para manejo de fechas
```

## 🎨 Principios de Diseño

1. **Mobile-first NO aplica aquí**: El Rack es desktop-only (mínimo 1280px)
2. **Sticky elements**: Header y columna de habitaciones siempre visibles
3. **Color semántico**: Estados de reserva con colores claros (azul=reservada, verde=checkin, gris=checkout)
4. **Densidad de información**: Máximo info en mínimo espacio sin saturar
5. **Feedback inmediato**: Toda acción tiene respuesta visual <100ms

## ⚠️ Consideraciones Técnicas

- **Performance crítica**: Con 50 habitaciones x 60 días = 3000 celdas
- **Validaciones client-side**: Antes de enviar a servidor
- **Optimistic updates**: UI responde antes de confirmar BD
- **Error recovery**: Si falla operación, revertir cambio visual

---

## 🏁 Siguiente Paso

Implementar **FASE 1: Foundation** - Layout y estructura base del Rack
