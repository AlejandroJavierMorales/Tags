# Tests pendientes en producción

Última actualización: 4 de agosto de 2026.

Este documento registra circuitos que no pueden validarse completamente en el entorno local y funcionalidades relacionadas que todavía deben implementarse. No debe confundirse una prueba pendiente con una funcionalidad inexistente.

## Tags Store

### Compra y pago online con Mercado Pago

Estado: **implementado; prueba pendiente en producción**.

Validar:

- creación de una compra real desde la tienda pública;
- generación correcta de la preferencia de Mercado Pago;
- redirección y experiencia de pago;
- recepción del webhook;
- identificación idempotente del pago;
- actualización automática del estado del pedido y del pago;
- comportamiento ante pago aprobado, pendiente y rechazado;
- ausencia de pedidos o cobros duplicados;
- visualización administrativa del resultado.

### Envío mediante Zipnova

Estado: **implementado; prueba pendiente en producción**.

Validar:

- cotización con domicilio real;
- selección del servicio logístico;
- conservación del precio y condiciones seleccionadas;
- creación del envío asociado al pedido;
- generación de etiqueta o documentación, si corresponde;
- número de seguimiento;
- actualización de estados;
- comportamiento ante errores o indisponibilidad del proveedor.

## Tags Guest Experience

### Validación de cupones mediante escaneo de QR

Estado: **implementado; circuito manual validado localmente; escaneo físico pendiente en producción**.

Ya validado localmente:

- creación de comercio, sucursal y personal;
- publicación del beneficio;
- emisión del cupón desde Mi Estadía;
- generación de código y QR firmado;
- acceso del comercio mediante magic link;
- validación manual del código;
- confirmación del canje;
- actualización automática para el huésped;
- registro administrativo y auditoría.

Pendiente en producción:

- abrir el validador en un dispositivo con cámara;
- escanear el QR mostrado en otro dispositivo;
- verificar lectura correcta del código y su firma;
- confirmar el canje;
- comprobar que un segundo intento indique que el cupón ya fue utilizado;
- verificar fecha, hora, comercio, sucursal y personal registrados.

## Tags Resto

### Pagos online con Mercado Pago

Estado: **pendiente de implementar**.

Antes de probar en producción se debe desarrollar:

- configuración de Mercado Pago para Tags Resto;
- creación de preferencia vinculada de forma inequívoca al pedido o sesión;
- retorno del cliente después del pago;
- webhook seguro e idempotente;
- actualización del pago, pedido, sesión y caja según corresponda;
- manejo de pagos aprobados, pendientes, rechazados, cancelados y duplicados;
- conciliación y auditoría administrativa;
- tratamiento compatible con salón, takeaway y delivery;
- controles para impedir cobrar dos veces el mismo saldo.

Una vez implementado, repetir criterios equivalentes a la prueba de Mercado Pago de Tags Store, adaptados al modelo operativo de Resto.

## Regla de cierre

Cada prueba debe registrar:

- fecha y ambiente;
- negocio utilizado;
- pedido, envío o cupón involucrado;
- resultado esperado y resultado obtenido;
- referencias externas del proveedor;
- capturas o logs relevantes;
- responsable de la validación;
- incidencias encontradas y su resolución.

Un circuito se considera aprobado solamente cuando el resultado funcional y los registros administrativos coinciden, sin duplicaciones ni errores pendientes.
