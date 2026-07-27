# Tags Resto — Validación del circuito de Delivery

## Requisitos

- Migración `database/migrations/2026-07-27-tags-resto-delivery.sql` aplicada.
- Restaurante con modalidad Delivery habilitada.
- Caja abierta para cobros electrónicos, rendiciones y pagos de comisiones.
- Al menos un empleado activo configurado como repartidor.
- Permisos de Delivery asignados según la tarea que realizará cada usuario.

## Rutas

- Dashboard del restaurante:
  `/dashboard/businesses/[businessId]/resto`
- Operación de Delivery:
  `/dashboard/businesses/[businessId]/resto/delivery`
- Pedidos:
  `/dashboard/businesses/[businessId]/resto/orders`
- Caja:
  `/dashboard/businesses/[businessId]/resto/cash`
- Personal:
  `/dashboard/businesses/[businessId]/resto/staff`
- Seguimiento público:
  `/p/[slug]/order/[sessionToken]`

## Caso 1 — Producto sin preparación

1. Crear un pedido delivery con una bebida que no pase por Cocina.
2. Confirmar el pedido.
3. Abrir Delivery.
4. Verificar que aparezca `Listo para despachar`, no `En preparación`.
5. Asignar un repartidor.
6. Marcar `Retirar pedido`, `Iniciar viaje` y `Entregar`.
7. Verificar que el producto quede `served`.
8. Si estaba pagado, verificar que la sesión quede cerrada.

## Caso 2 — Pedido mixto

1. Crear un pedido con un plato que requiera preparación y una bebida.
2. Confirmarlo y enviar el plato a Cocina.
3. Verificar que Delivery muestre `En preparación`.
4. Marcar el plato como listo.
5. Verificar que el pedido pase a `Listo para despachar`.
6. Completar la entrega.
7. Verificar que tanto el plato como la bebida queden entregados.

## Caso 3 — Efectivo contra entrega

1. Entregar un pedido con saldo pendiente usando `Efectivo`.
2. Verificar que el pedido quede pagado y cerrado.
3. Verificar que Delivery muestre el importe en `Por rendir`.
4. Abrir la solapa Rendiciones.
5. Registrar una rendición parcial.
6. Verificar que continúe mostrando el saldo restante.
7. Rendir el resto.
8. Verificar que Caja tenga un ingreso `Rendición de delivery`.
9. Verificar que la cobranza quede completamente rendida.

## Caso 4 — Cobro electrónico al entregar

1. Mantener una Caja abierta.
2. Entregar un pedido con saldo usando Transferencia, Tarjeta o Mercado Pago.
3. Verificar que el pago quede confirmado.
4. Verificar que Caja registre un `Cobro de pedido`.
5. Verificar que no se genere dinero pendiente de rendición.
6. Repetir sin Caja abierta y comprobar que la operación sea rechazada sin cambios parciales.

## Caso 5 — Repartidor sin autorización para cobrar

1. Desactivar `Puede cobrar pedidos` en el perfil.
2. Asignarle un pedido con saldo.
3. Verificar que no pueda marcarlo entregado cobrando.
4. Registrar el pago desde una pantalla autorizada.
5. Verificar que luego pueda finalizar la entrega sin cobrar.

## Caso 6 — Incidencia y reasignación

1. Asignar una entrega y comenzar el viaje.
2. Informar una entrega fallida indicando el motivo.
3. Verificar que aparezca la alerta de incidencia.
4. Filtrar entregas fallidas.
5. Reasignar la entrega.
6. Verificar que vuelva a `Repartidor asignado`.
7. Completar el nuevo intento.

## Caso 7 — Comisiones

1. Configurar un repartidor con comisión fija.
2. Completar dos entregas.
3. Abrir Liquidaciones.
4. Crear una liquidación para el período correspondiente.
5. Verificar cantidad de entregas y total.
6. Pagar la liquidación con Caja abierta.
7. Verificar el egreso `Comisión de repartidor`.
8. Verificar que las entregas no vuelvan a aparecer como pendientes de liquidar.

## Caso 8 — Permisos

1. Ingresar como administrador y comprobar acceso completo.
2. Ingresar como repartidor.
3. Verificar que sólo vea sus entregas asignadas.
4. Verificar que no pueda asignar, cancelar, rendir o liquidar.
5. Quitar `delivery.status` y comprobar que conserve lectura sin acciones.
6. Quitar `delivery.view` y comprobar que desaparezca el acceso del dashboard.

## Caso 9 — Seguimiento del cliente

1. Mantener abierta la URL pública del pedido.
2. Cambiar los estados desde Delivery.
3. Verificar, sin recarga manual:
   - preparación;
   - listo para despachar;
   - repartidor asignado;
   - pedido retirado;
   - en camino;
   - entregado.
4. Verificar nombre y teléfono del repartidor.
5. Verificar el importe a pagar al recibir.

## Caso 10 — Alertas

Verificar alertas nuevas para:

- pedido listo sin repartidor;
- pedido listo para retirar;
- entrega en camino;
- incidencia;
- cobranza pendiente de rendición.

Marcar cada alerta como visualizada y comprobar que no vuelva a mostrarse hasta que exista una nueva transición.
