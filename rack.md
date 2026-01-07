**especificación funcional y de diseño** para el **Rack Definitivo**.

Aquí tienes la descripción técnica y operativa completa del "corazón" de tu sistema. Esto es lo que le entregarías a un diseñador UI/UX o a un desarrollador Frontend (React/Vue/Flutter) para que lo construya.

---

# 🏨 ESPECIFICACIÓN TÉCNICA: EL "SUPER RACK" (PMS CORE)

## 1. CONCEPTO GENERAL

El Rack no es solo un calendario; es una **SPA (Single Page Application)**. Funciona como un escritorio de control inmersivo. No recarga la página. Todo sucede en capas sobre la misma vista.

**Filosofía de Diseño:** *"Information at a Glance, Action on Click"*. (Información de un vistazo, acción al clic).

---

## 2. ANATOMÍA DE LA PANTALLA (LAYOUT)

La pantalla se divide en 4 zonas clave que conviven simultáneamente:

### 🟧 ZONA A: EL "COMMAND BAR" (Header Sticky)

Es la barra superior, siempre fija (Sticky) aunque hagas scroll.

* **Buscador Global (Omnibox):** Una barra central tipo Google o Spotlight (`Cmd+K`).
* *Funcionalidad:* Al escribir "Juan", despliega resultados flotantes: "Juan Pérez (Huésped)", "Reserva #4092", "Habitación 101".


* **KPIs "Chips":** Indicadores horizontales compactos (badges).
* `📉 Llegadas: 3` (Rojo si hay pendientes).
* `📈 Salidas: 2` (Amarillo si ya pasaron hora de checkout).
* `🧹 Sucias: 5` (Clickeable para ver lista rápida).


* **Botón Acción Primaria (FAB o Button):** "➕ Nueva Reserva".
* **User Menu:** Avatar del recepcionista (para cerrar turno/caja).

### 🟦 ZONA B: EL "SMART SIDEBAR" (Panel Lateral Derecho)

Es la evolución del Dashboard. Una columna colapsable a la derecha (ancho aprox. 300px).

* **Propósito:** Resolver la "ceguera de la grilla". Lista las tareas urgentes.
* **Tabs/Pestañas:**
* **HOY:** Muestra Check-ins y Check-outs pendientes del día.
* **ALERTAS:** Pagos vencidos, No-shows, Mensajes internos.


* **Items de la lista:** "Tarjetas" mini.
* *Ejemplo:* "Juan Pérez - Hab 102 - Check-in".
* *Interacción:* Al hacer clic en la tarjeta, el Rack hace **Scroll Automático** hasta enfocar la habitación 102 en la grilla.



### 🟩 ZONA C: EL "MAIN GRID" (La Grilla Infinita)

El área principal. Debe usar tecnología de **Virtualización (Virtual Scrolling)** si tienes muchas habitaciones, para que no se ponga lento.

* **Ejes:**
* **Eje Y (Filas):** Habitaciones físicas. Agrupadas por Pisos o Categorías (colapsables).
* *Sticky Column:* La columna con el número "101" se queda quieta a la izquierda mientras scrolleas los días.
* *Indicadores de Fila:* Íconos pequeños junto al número: "🧹 Sucia", "🔧 Mantenimiento".


* **Eje X (Columnas):** Días.
* *Columna "HOY":* Debe tener un background (fondo) sutilmente distinto o bordes resaltados para anclar la vista visualmente.





### 🟪 ZONA D: EL "SLIDE-OVER" (Hoja de Detalle)

Sustituye a las ventanas emergentes (modals) intrusivas. Es un panel que se desliza desde la derecha cubriendo el Sidebar cuando haces clic en una reserva.

* **Contenido:** Ficha completa de la reserva (Huéspedes, Cuenta, Notas).
* **Ventaja:** Permite seguir viendo parte del Rack de fondo, manteniendo el contexto.

---

## 3. EL "ATOMO" DEL SISTEMA: EL BLOQUE DE RESERVA (Card)

Es el rectángulo de color que vive dentro de la grilla. Su diseño debe ser rico en datos pero limpio.

### Diseño Visual del Bloque:

1. **Color de Fondo (Background):** Mapeado directo a `reservas.estado`.
* 🔵 `RESERVADA` (Azul tenue).
* 🟢 `CHECKED_IN` (Verde sólido).
* 🔴 `CHECKED_OUT` (Gris o tachado).
* ⚫ `BLOQUEO` (Trama rayada negra/gris).


2. **Texto Principal:** Apellido del Huésped Titular.
3. **Texto Secundario (Subtítulo):** Canal de venta (ej: ícono pequeño de Booking.com) + Cantidad Pax (👤x2).
4. **Badges/Iconos de Estado (Status Icons):** Pequeños puntos o íconos en la esquina del bloque.
* 💲 (Signo dólar verde/rojo): Pagado vs. Debe saldo.
* 🧾 (Icono recibo): Facturado.
* ⚠️ (Triángulo): Tiene observaciones importantes.



---

## 4. FUNCIONALIDADES E INTERACCIONES (UX)

### A. Creación ("Draw to Create")

* **Acción:** Clic en una celda vacía y arrastrar hacia la derecha (días).
* **Respuesta:** Se dibuja un "bloque fantasma" temporal. Al soltar el mouse, se abre el **Slide-over** de "Nueva Reserva" con las fechas y habitación ya pre-llenadas.

### B. Edición Rápida ("Drag & Drop")

* **Mover (Reasignar):** Arrastrar un bloque de la Hab 101 a la 105.
* *Validación:* El sistema verifica en tiempo real si la 105 está libre. Si no, rebota.


* **Extender/Acortar (Resize):** Agarrar el borde derecho del bloque y estirarlo.
* *Lógica:* Actualiza `fecha_salida` y recalcula el `total_estimado` automáticamente.



### C. Menú Contextual (Right Click)

Al hacer clic derecho en un bloque, aparece un menú flotante nativo con acciones atómicas (sin abrir el detalle completo):

* 🚀 **Check-in Rápido** (Si es hoy).
* 💰 **Cobrar Rápido** (Abre modal de pago).
* 🧹 **Marcar Limpia** (Si es clic en la fila de habitación).
* ❌ **Cancelar Reserva**.

### D. Tooltips (Hover)

Al pasar el mouse por encima (sin hacer clic), flota una pequeña tarjeta negra con el resumen:

* *"Juan Pérez | 3 noches | Saldo: S/ 150.00 | Notas: Alérgico al maní"*
* *Propósito:* Evitar clics innecesarios para ver información básica.

---

## 5. ASPECTOS TÉCNICOS INVISIBLES (Backend Connection)

Para que esto se sienta "vivo", necesitas:

1. **Websockets (Real-time):**
* Si el recepcionista B crea una reserva en su PC, debe aparecer **mágicamente** en la pantalla del recepcionista A sin que tenga que refrescar (F5).


2. **Lazy Loading (Carga Diferida):**
* El Rack solo carga los datos de las fechas que estás viendo. Si scrolleas al mes siguiente, recién pide esos datos a la BD.


3. **Sync de Estados:**
* El "Smart Sidebar" se alimenta de la misma fuente que la Grilla. Si haces Check-in en la lista lateral, el bloque en la grilla cambia de Azul a Verde instantáneamente.



Esta especificación cubre **diseño, interacción y lógica operativa** para un sistema de clase mundial.