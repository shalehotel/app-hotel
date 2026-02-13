# API CONSULTAS DNI/RUC (1.0)

Download OpenAPI specification: [Download](link)

**Apisperu:** soporte@apisperu.com

API REST consultas DNI/RUC - APIsPerú. Primero debe registrarse.
Si se siente más cómodo usando Swagger-UI, puede ingresar aquí.

---

## DNI

Consultar números de DNI

### Retorna los detalles del DNI

Obtiene la información de una persona.

**Endpoint:** `GET /dni/{numero}`

#### PATH PARAMETERS

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `numero` | number | número del DNI |
| | required | |

#### QUERY PARAMETERS

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `token` | string | Token de autenticación para acceder a la ruta |
| | required | |

#### Responses

**200** Operación exitosa

#### Response samples

**Content type:** application/json

**Example: DNI**

```json
{
  "dni": "string",
  "nombres": "string",
  "apellidoPaterno": "string",
  "apellidoMaterno": "string",
  "codVerifica": "string"
}
```

---

## RUC

Consultar números de RUC

### Retorna los detalles del RUC

Obtiene la información de una empresa.

**Endpoint:** `GET /ruc/{numero}`

#### PATH PARAMETERS

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `numero` | number | número del RUC |
| | required | |

#### QUERY PARAMETERS

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `token` | string | Token de autenticación para acceder a la ruta |
| | required | |

#### Responses

**200** Operación exitosa

#### Response samples

**Content type:** application/json

**Example: RUC**

```json
{
  "ruc": "string",
  "razonSocial": "string",
  "nombreComercial": "string",
  "telefonos": [ ],
  "estado": "string",
  "condicion": "string",
  "direccion": "string",
  "departamento": "string",
  "provincia": "string",
  "distrito": "string",
  "ubigeo": "string",
  "capital": "string"
}
```