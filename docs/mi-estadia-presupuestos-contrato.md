# Mi Estadía — Presupuestos y conversión a reservas

## Objetivo

Separar de forma explícita tres documentos operativos:

1. Presupuesto: propuesta comercial que no ocupa inventario.
2. Reserva pendiente de pago: retiene inventario durante el plazo configurado.
3. Reserva confirmada: estadía creada, con pago registrado y acceso a Mi Estadía.

La implementación debe ampliar `tags_guest_lodging_quotes`; no debe crear un motor paralelo de cotizaciones.

## Navegación administrativa

`Presupuestos` será una solapa principal de Mi Estadía, independiente de `Grilla de ocupación`.

- La solapa siempre tendrá el botón `+ Nuevo presupuesto`.
- La grilla siempre tendrá `+ Nueva reserva`.
- La grilla podrá mostrar además `+ Presupuesto` cuando `settings.showOccupancyQuoteButton` sea verdadero.
- Al pulsar una celda disponible, el acceso rápido a presupuesto sólo se ofrecerá cuando esa configuración esté activa.

## Código del presupuesto

Formato administrativo:

`{PREFIJO}-{AÑO}-{SECUENCIA}`

Ejemplo: `ECOS-2026-0001`.

- `quoteCodePrefix` se configura por alojamiento.
- El prefijo admite letras, números y guiones, se normaliza en mayúsculas y no puede quedar vacío.
- La secuencia es independiente por `guest_app_id` y año.
- La numeración se asigna dentro de una transacción mediante bloqueo de la fila de secuencia.
- El rango anual permitido es `0001` a `9999`. Al agotarse debe bloquearse la creación y mostrar un error explícito.
- Las cotizaciones públicas existentes pueden conservar sus códigos `COT-*`; no deben renumerarse.

## Estados

Estados de presupuesto:

- `active`: vigente y disponible para enviar o convertir.
- `expired`: venció su vigencia comercial. Puede duplicarse o reactivarse mediante una acción explícita, pero no convertirse silenciosamente.
- `consumed`: convertido en reserva; se conserva como historial.
- `cancelled`: cancelado manualmente.

Los presupuestos no bloquean unidades. Antes de convertir uno se vuelve a validar unidad, capacidad, bloqueos, reservas y solicitudes vigentes.

## Datos del presupuesto

- Código.
- Cliente: nombre, email y teléfono/WhatsApp.
- Fechas, noches y pasajeros.
- Unidad interna seleccionada, sólo para cálculo y disponibilidad administrativa.
- Categoría pública que se mostrará al cliente.
- Moneda, subtotal, descuentos, total, porcentaje e importe de reserva.
- Vigencia.
- Observaciones del cliente y del operador.
- Snapshot de precios, restricciones y contenido comercial.
- Origen (`public_web` o `manual_admin`).
- Usuario creador.
- Historial de creación, edición, preview, email, WhatsApp, conversión, vencimiento y cancelación.

El documento enviado nunca debe mencionar el nombre o número interno de la unidad. Debe utilizar la categoría pública almacenada en el snapshot. Si no existe una categoría válida, se genera una descripción neutra por tipo y capacidad; nunca se usa el código interno.

## Búsqueda y listado

La solapa Presupuestos permitirá buscar por:

- Código.
- Fecha de creación o período.
- Nombre del cliente.
- Email.
- Teléfono/WhatsApp.
- Fecha de ingreso o egreso.
- Estado.

Acciones por fila o tarjeta:

- Ver detalle.
- Editar mientras no esté convertido o cancelado.
- Ver preview.
- Enviar o reenviar por email.
- Abrir WhatsApp con el texto formateado.
- Crear reserva.
- Cancelar.

## Conversión a reserva

La acción `Crear reserva` abre el formulario existente con los datos del presupuesto y exige elegir uno de estos resultados:

### Sin pago

- Revalida disponibilidad dentro de la transacción.
- Crea una solicitud administrativa `pending_payment` enlazada mediante `quote_id`.
- Retiene la unidad por `reservationPaymentHours`.
- Envía el resumen operativo, vencimiento y datos bancarios.
- No genera acceso a Mi Estadía.

### Con pago

- Revalida disponibilidad dentro de la transacción.
- Crea la estadía y su cuenta.
- Registra cargo y pago en la misma transacción.
- Marca el presupuesto como `consumed`.
- Muestra el preview de reserva confirmada.
- Al confirmar el envío genera el enlace seguro de Mi Estadía.

Una conversión debe ser idempotente: un presupuesto `consumed` no puede crear una segunda reserva.

## Comunicaciones

### Presupuesto

Inicio sugerido:

> Hola Hernán López, te enviamos el presupuesto para tu estadía en Cabañas Ecos del Valle.

Incluye contenido comercial, fechas, pasajeros, categoría, importes, condiciones, vigencia y datos de contacto.

### Pago registrado y reserva confirmada

Inicio sugerido:

> Hola Hernán, registramos correctamente tu pago. Con este pago, tu reserva quedó confirmada.

Incluye importe recibido, fecha, total abonado, saldo y acceso a Mi Estadía. La misma operación no debe producir dos mensajes redundantes.

### Nota final obligatoria

Debe ser siempre el último contenido:

> Importante: la unidad definitiva será asignada al organizar la grilla de ocupación. Siempre tendrá la capacidad, características y equipamiento correspondientes a la categoría presupuestada o reservada.

- En email se muestra en cuerpo menor y color secundario.
- En WhatsApp se coloca como último párrafo separado, porque WhatsApp no admite tamaños tipográficos.
- Nunca debe mencionar número, nombre o código interno de unidad.

## APIs previstas

- `GET /api/guest-experience/admin/quotes`: listado y filtros.
- `POST /api/guest-experience/admin/quotes`: alta administrativa.
- `PATCH /api/guest-experience/admin/quotes`: edición, cancelación o reactivación explícita.
- `POST /api/guest-experience/admin/quotes/notify`: preview, email o registro de apertura de WhatsApp.
- `POST /api/guest-experience/admin/quotes/convert`: conversión transaccional a pendiente de pago o confirmada.

Todas reutilizarán `getGuestAdminAccess`, las reglas de disponibilidad, cuentas, pagos, invitaciones y auditoría existentes.

## Configuración

En Configuración → Presupuestos:

- `quoteCodePrefix` — prefijo, inicialmente derivado del nombre del alojamiento o configurado manualmente.
- `quoteValidityDays` — vigencia predeterminada.
- `showOccupancyQuoteButton` — acceso rápido desde la grilla.
- `bookingUnitDisplay`, `bookingBudgetDetails` y `bookingQuoteSections` existentes.

No se duplicarán porcentaje de reserva, moneda, datos bancarios ni horarios ya definidos en otras secciones de configuración.

