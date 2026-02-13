# Documentación de la API - PeruAPI

## Guía rápida

Documentación de la API: Autenticación por API Key, endpoints REST o por parámetros, baja latencia y límites por plan.

### Contenido

- Inicio rápido
- Autenticación
- Parámetros
- Endpoints
- Ejemplos
- Límites
- Errores
- Buenas prácticas

---

## Inicio rápido (3 pasos)

1. Regístrate y obtén tu API Key en el panel.
2. Incluye la API Key en `X-API-KEY` o como `?api_token=`.
3. Realiza tu primera llamada al endpoint deseado.

```bash
curl -H "X-API-KEY: TU_KEY" "https://peruapi.com/api/tipo_cambio"
```

**Tip:** si pruebas desde el navegador, usa la variante con `?api_token=`.

### Latencia y disponibilidad

Endpoints optimizados para respuesta rápida y consistencia de datos. Diseñados para integrarse con tus flujos de onboarding, facturación y conciliación contable sin fricción.

---

## Autenticación

### En cabecera HTTP (X-API-KEY):

```http
GET /api/dni/12345678
X-API-KEY: TU_KEY
```

### O mediante querystring:

```http
GET /api.php?json=dni&id=12345678&api_token=TU_KEY
```

### Seguridad

- API Key única por usuario, con reset desde el panel.
- Control por IP según plan (Free: 2 · Pro: 10 · Business: ilimitadas).
- Registros de uso y trazabilidad de llamadas.

---

## Parámetros permitidos

| Nombre | Dónde | Tipo / Validación | Obligatorio | Descripción |
|--------|-------|-------------------|-------------|-------------|
| `X-API-KEY` | Cabecera | Cadena (32–128), caracteres visibles | Sí* | API Key del usuario. Alternativa: `?api_token=` en querystring. |
| `api_token` | Query | Cadena (32–128) | Sí* | Usar si no envías cabecera X-API-KEY. |
| `json` | Query | Enum: `ruc` \| `dni` \| `tipo_cambio` \| `ruc_suc` | Depende | Solo en el modo api.php por parámetros. En REST no se usa. |
| `id` | Query | RUC: 11 dígitos · DNI: 8 dígitos | Depende | Requerido para `json=ruc`, `json=ruc_suc` y `json=dni`. No aplicable a tipo_cambio. |
| `fecha` | Query | Date · `YYYY-MM-DD` \| `DD/MM/YYYY` \| `hoy` | No | Aplica a tipo_cambio. Si no se envía, se asume la fecha del día. |
| `summary` | Query | Enum: `1\|0` · `true\|false` · `enabled\|disabled` (y aliases) | No | Controla la inclusión del bloque resumen. Para deshabilitar: `?summary=0` o `?summary=disabled`. |
| `plan` | Query | Enum: `1\|0` · `true\|false` · `enabled\|disabled` (y aliases) | No | Controla la inclusión del bloque plan. Para deshabilitar: `?plan=0` o `?plan=disabled`. |

**\*Es obligatorio proveer API Key** ya sea en cabecera (`X-API-KEY`) o en query (`?api_token=`).

**Notas:**
- En el modo REST (`/api/ruc/{ruc}`, `/api/dni/{dni}` y `/api/tipo_cambio`) no se usa `json` ni `id` por query.
- `summary` y `plan` se controlan por valor (por ejemplo, `?summary=0`), no por presencia del parámetro.

---

## Endpoints

### RUC

```http
GET /api/ruc/{ruc}?api_token=TU_KEY
GET /api.php?json=ruc&id={ruc}&api_token=TU_KEY
```

**Respuesta (ejemplo):**

```json
{
  "ruc": "20100017491",
  "razon_social": "INTEGRATEL PERÚ S.A.A.",
  "estado": "ACTIVO",
  "condicion": "HABIDO",
  "direccion": "JR. DOMINGO MARTINEZ LUJAN NRO. 1130",
  "ubigeo": "150141",
  "departamento": "LIMA",
  "provincia": "LIMA",
  "distrito": "SURQUILLO",
  "fecha_actualizacion": "2025-09-02 03:18:59",
  "mensaje": "OK",
  "code": "200"
  /* Opcional: "resumen" y/o "plan" */
}
```

### DNI

```http
GET /api/dni/{dni}?api_token=TU_KEY
GET /api.php?json=dni&id={dni}&api_token=TU_KEY
```

**Respuesta (ejemplo):**

```json
{
  "dni": "60012345",
  "cliente": "QUISPE PEREZ JULIO FERNANDO",
  "nombres": "JULIO FERNANDO",
  "apellido_paterno": "QUISPE",
  "apellido_materno": "PEREZ",
  "mensaje": "OK",
  "code": "200"
  /* Opcional: "resumen" y/o "plan" */
}
```

### Tipo de cambio

```http
GET /api/tipo_cambio?api_token=TU_KEY
GET /api.php?json=tipo_cambio&api_token=TU_KEY[&fecha=YYYY-MM-DD|DD/MM/YYYY|hoy]
```

**Respuesta (ejemplo):**

```json
{
  "fecha": "2025-03-27",
  "compra": "3.764",
  "venta": "3.773",
  "moneda": "USD",
  "fuente": "SUNAT",
  "updated_at": "2025-03-27 08:10:00",
  "mensaje": "OK",
  "code": "200"
  /* Opcional: "resumen" y/o "plan" */
}
```

### RUC + Sucursales (ruc_suc)

```http
GET /api.php?json=ruc_suc&id={ruc}&api_token=TU_KEY
```

**Respuesta (resumen):**

```json
{
  "ruc": "20100017491",
  "razon_social": "INTEGRATEL PERÚ S.A.A.",
  "total_sucursales": 3,
  "has_sucursales": true,
  "sucursales": [ /* ... */ ],
  "mensaje": "OK",
  "code": "200"
  /* Opcional: "resumen" y/o "plan" */
}
```

---

## Ejemplos

### Ejemplo PHP (cURL)

```php
<?php
$token = 'TU_KEY';
$ruc   = '20100017491';
$url   = 'https://peruapi.com/api/ruc/'.$ruc;

// Opt-out (para deshabilitar resumen/plan por request)
// $url .= '?summary=0&plan=0';

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER     => ['X-API-KEY: '.$token],
  CURLOPT_TIMEOUT        => 8
]);

$res = curl_exec($ch);
if ($res === false) { http_response_code(502); exit; }
curl_close($ch);
header('Content-Type: application/json; charset=utf-8');
echo $res;
?>
```

### Ejemplo cURL / JS

**cURL:**

```bash
curl "https://peruapi.com/api/dni/60012345?plan=0" \
  -H "X-API-KEY: TU_KEY"
```

**Browser/Node (fetch):**

```javascript
// Browser/Node (fetch)
const res = await fetch("https://peruapi.com/api/tipo_cambio?summary=0", {
  headers: { "X-API-KEY": "TU_KEY" }
});
const data = await res.json();
console.log(data);
```

---

## Límites por plan

| Plan | Límite diario | Límite mensual | IPs autorizadas | Rate-limit |
|------|---------------|----------------|-----------------|------------|
| **Free** | 500/día | 3000/mes | 2 IPs | 30 rpm |
| **Pro** | 4000/día | 120000/mes | 10 IPs | 150 rpm |
| **Business** | 10000/día | 300000/mes | IPs ilimitadas | 400 rpm |

**Consulta tu consumo** en tiempo real desde el panel de control.

### IPs autorizadas

La IP debe estar autorizada para el token. En planes con allowlist, la validación es estricta. Puedes administrar tu lista de IPs permitidas en tu panel según tu plan.

---

## Documentación del objeto `resumen`

El objeto `resumen` se incluye cuando está habilitado el summary (por configuración o parámetro). Esta API procesa una sola solicitud por request, por lo que `solicitadas` es 1.

**Campos:**

- **`endpoint`**: endpoint consultado (`ruc`, `dni`, `ruc_suc`, `tipo_cambio`).
- **`solicitadas`**: cantidad de solicitudes contabilizadas en este request. En esta API siempre es 1.
- **`procesadas`**: `1` cuando el resultado fue exitoso (HTTP 2xx) y se devolvió data, o `0` cuando no hubo procesamiento exitoso (ej. 404, 429, 401, 500).
  - **Nota:** no representa "cantidad de registros", sino "éxito del request".
- **`creditos_usados`**: créditos descontados en esta operación.
  - Costos actuales: `ruc=1`, `dni=1`, `tipo_cambio=1`, `ruc_suc=2`. En 404 el valor será 0.
- **`ip`**: IP efectiva que realizó la consulta (la que tu API determina como cliente).
- **`nota`**: etiqueta corta de estado para el panel. Valores típicos en el flujo:
  - `OK` (éxito)
  - `NOT_FOUND` (404)
  - `LIMIT` (cuota diaria/mensual)
  - `RATE_LIMIT` (rpm)
  - `ERROR` (otros)

---

## Documentación del objeto `plan`

El objeto `plan` se incluye cuando está habilitada la respuesta de plan (por configuración o parámetro). Este bloque entrega el código del plan y sus límites/consumos, calculados con base en el estado "antes del request" y los créditos usados.

**Campos:**

- **`codigo`**: nombre/código del plan del usuario (por ejemplo: `free`, `pro`, `business`).
- **`limite_diario`**: límite diario del plan.
  - Si el plan no tiene tope diario (o se maneja como ilimitado), puede venir como `null`.
- **`limite_mensual`**: límite mensual del plan.
  - Si el plan no tiene tope mensual (o se maneja como ilimitado), puede venir como `null`.
- **`restante_diario`**: cuota diaria restante después de aplicar los créditos de esta operación.
  - Se calcula como: `limite_diario - (consumido_diario_antes + creditos_usados)`, con mínimo 0. Si no hay límite diario, puede ser `null`.
- **`restante_mensual`**: cuota mensual restante después de aplicar los créditos de esta operación.
  - Se calcula como: `limite_mensual - (consumido_mensual_antes + creditos_usados)`, con mínimo 0. Si no hay límite mensual, puede ser `null`.

**Importante:** si el resultado es 404 (no encontrado), es posible que `creditos_usados` sea 0, por lo que `restante_diario` y `restante_mensual` pueden mantenerse sin cambios.

---

## Respuestas y errores

Todas las respuestas incluyen `code` (string) y generalmente `mensaje`. Opcionalmente el servidor puede incluir `resumen` y `plan` (configurable). Puedes forzar deshabilitarlos por request con `?summary=0` y/o `?plan=0`.

### 200 · OK

```json
{
  "mensaje": "OK",
  "code": "200",
  "resumen": {
    "endpoint": "ruc",
    "solicitadas": 1,
    "procesadas": 1,
    "creditos_usados": 1,
    "ip": "192.168.0.100",
    "nota": "OK"
  },
  "plan": {
    "codigo": "free",
    "limite_diario": 500,
    "limite_mensual": 10000,
    "restante_diario": 488,
    "restante_mensual": 9988
  }
}
```

**Todo correcto**

La solicitud fue procesada y se devolvieron datos válidos. En endpoints con costo variable, `creditos_usados` refleja el consumo real.

---

### 400 · Parámetros inválidos

```json
{
  "mensaje": "Valor de 'json' inválido. Use ruc|dni|tipo_cambio|ruc_suc",
  "code": "400"
}
```

**¿Por qué puede fallar?**

- Faltan parámetros requeridos (`json` o `id` en api.php por query).
- Formato inválido (RUC ≠ 11 dígitos, DNI ≠ 8 dígitos, json desconocido).
- Se envía un formato de fecha no reconocido en tipo_cambio.

---

### 401 · No autorizado

```json
{
  "mensaje": "Token inválido o plan inactivo.",
  "code": "401"
}
```

```json
{
  "mensaje": "IP 192.168.0.100 no autorizada para este token.",
  "code": "401"
}
```

**¿Por qué puede fallar?**

- No se envió API Key (ni en `X-API-KEY` ni en `?api_token=`).
- API Key inválida o plan inactivo.
- La IP de origen no está autorizada para ese token.

---

### 404 · No encontrado

```json
{
  "mensaje": "No encontrado",
  "code": "404",
  "resumen": {
    "endpoint": "ruc",
    "solicitadas": 1,
    "procesadas": 0,
    "creditos_usados": 0,
    "ip": "192.168.0.100",
    "nota": "NOT_FOUND"
  }
}
```

**¿Se consume saldo si no existe?**

Si el recurso no se encuentra (404), `creditos_usados` será 0.

---

### 429 · Límite alcanzado

```json
{
  "mensaje": "Cuota excedida (daily/monthly)",
  "code": "429"
}
```

```json
{
  "mensaje": "Rate limit excedido (30 rpm). Intente en 12s.",
  "rate_limit": {
    "limit": 30,
    "remaining": 0,
    "reset": 1730000000
  },
  "code": "429"
}
```

**Cuota vs Rate-limit**

- **Cuota:** excediste el máximo diario o mensual del plan.
- **Rate-limit:** demasiadas solicitudes por minuto (rpm). Respeta `Retry-After`.

---

### 500 · Error

```json
{
  "mensaje": "ERROR",
  "code": "500"
}
```

**Recomendación**

Implementa reintentos con backoff y registra el contexto (endpoint, id, timestamp). Si persiste, contáctanos con tu API Key (sin compartirla públicamente).

---

## Buenas prácticas

1. Configura timeouts y reintentos con backoff exponencial.
2. Evita llamadas repetitivas; aplica cacheo en tu sistema cuando sea posible.
3. Registra el endpoint y el identificador consultado (RUC/DNI/fecha) y correlaciónalo con tus logs internos.
4. Respeta los límites por plan y monitorea el consumo desde el panel.
5. Si necesitas respuestas "limpias" sin metadata, usa `?summary=0` y/o `?plan=0`.

---

**Fuente:** https://peruapi.com/documentacion