Como programador, implementar un **Webhook** es la forma más eficiente de gestionar el ciclo de vida de tus comprobantes, especialmente para las **Boletas de Venta** que se envían por Resumen Diario.

A continuación, te presento el documento de implementación técnica basado en el manual de **NubeFacT**:

---

## DOCUMENTO DE IMPLEMENTACIÓN: WEBHOOK NUBEFACT

### 1. INTRODUCCIÓN Y MOTIVO

El sistema de facturación electrónica para **Boletas de Venta** no opera en tiempo real con la SUNAT; estas se envían en paquetes llamados "Resúmenes Diarios".

* 
**Problema**: Al emitir una boleta, la respuesta inicial de la API suele marcar `aceptada_por_sunat: false` porque el proceso de lote es posterior. Esto deja el comprobante en estado "Pendiente" en tu base de datos local.


* 
**Motivo**: Evitar el uso de *Cron Jobs* o consultas manuales constantes que consumen recursos de red y CPU innecesariamente. El Webhook permite que NubeFacT "notifique" a tu sistema en el momento exacto en que la SUNAT aprueba el lote.



### 2. ARQUITECTURA DEL WEBHOOK

El Webhook funciona bajo el modelo de **Inversión de Control**:

1. 
**Emisión**: Tu sistema envía el JSON a NubeFacT (Operación 1).


2. 
**Procesamiento**: NubeFacT agrupa las boletas y las envía a SUNAT.


3. 
**Notificación**: Una vez aceptadas, NubeFacT realiza una petición **POST** a una URL pública que tú definas en su panel de configuración.



### 3. ESTRUCTURA DE LA SOLICITUD (PAYLOAD)

NubeFacT enviará a tu Endpoint un JSON con la estructura de respuesta estándar:

```json
{
  "tipo_de_comprobante": 2,
  "serie": "BBB1",
  "numero": 105,
  "enlace": "https://www.nubefact.com/cpe/...",
  "aceptada_por_sunat": true,
  "sunat_description": "La Boleta de Venta numero BBB1-105, ha sido aceptada",
  "sunat_responsecode": "0",
  "enlace_del_pdf": "https://www.nubefact.com/cpe/xxx.pdf",
  "enlace_del_xml": "https://www.nubefact.com/cpe/xxx.xml",
  "enlace_del_cdr": "https://www.nubefact.com/cpe/xxx.cdr",
  "codigo_hash": "xMLFMnbgp1/bHEy572RKRTE9hPY="
}

```

### 4. RESULTADO ESPERADO EN TU SISTEMA

Al procesar este JSON, tu sistema debe realizar las siguientes acciones de forma automática:

* 
**Actualización de Estado**: Cambiar el registro de `Pendiente` a `Aceptado` en tu base de datos local.


* 
**Almacenamiento de Constancia**: Guardar el `enlace_del_cdr` (Constancia de Recepción), que es el único documento que garantiza legalmente que la boleta es válida ante la SUNAT.


* 
**Cierre de Auditoría**: Registrar el `codigo_hash` y el `sunat_responsecode` para reportes tributarios.



### 5. CONSIDERACIONES TÉCNICAS Y DE SEGURIDAD

* 
**Endpoint Público**: Tu servidor debe tener una URL accesible vía HTTPS (ej. `https://hotel.com/webhooks/nubefact`).


* 
**Manejo de Respuesta**: Tu Endpoint **DEBE** devolver un código de estado **HTTP 200** para confirmar a NubeFacT que recibiste la notificación con éxito.


* **Idempotencia**: Dado que NubeFacT podría reintentar el envío si tu servidor falla, asegúrate de que tu lógica solo actualice la boleta si el estado actual es "Pendiente".

### 6. REGULARIZACIÓN DE BOLETAS ANTIGUAS

Para las boletas que ya están "pendientes", el Webhook no actuará. Debes ejecutar un script único que use la **Operación 2: Consultar Comprobante**:

1. **Iterar** sobre las boletas pendientes en tu DB local.
2. 
**Enviar** el JSON de consulta (Serie, Correlativo, Tipo).


3. 
**Actualizar** manualmente con los datos de la respuesta de NubeFacT.
