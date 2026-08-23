# Centro Integral de Suscripciones y Pagos

## Compatibilidad

El núcleo conserva como tablas operativas:

- `tags_plans`
- `tags_subscriptions`
- `tags_subscription_payments`
- `tags_business_addons`
- el resumen de suscripción de `tags_businesses`

Las tablas nuevas extienden esos registros con versiones, composición, ofertas,
términos congelados y auditoría. Ningún flujo existente necesita migrarse para
seguir funcionando.

## Fuente de verdad

1. La vigencia contractual vive en `tags_subscriptions`.
2. Los pagos viven en `tags_subscription_payments`.
3. Los derechos operativos efectivos viven en `tags_business_addons` y en las
   capacidades históricas de `tags_plans`.
4. `tags_subscription_terms` congela las condiciones contratadas.
5. `tags_businesses.plan_id` y `subscription_status` son un resumen compatible,
   no el historial contractual.

## Planes

Un registro de `tags_plans` puede ser público o privado mediante
`tags_plan_profiles`. Cada cambio comercial genera una fila nueva en
`tags_plan_versions`; nunca modifica las condiciones ya contratadas.

Los addons incluidos se declaran en `tags_plan_version_addons`. Los precios se
declaran en `tags_plan_version_prices` y admiten:

- mensual manual por mes calendario;
- packs manuales de 3, 6 y 12 meses;
- mensual recurrente de Mercado Pago;
- precios privados para un cliente.

## Ofertas

Una oferta es una propuesta inmutable con token aleatorio, vencimiento y
fotografía de condiciones. Puede estar dirigida a un negocio existente o a un
email. Mercado Pago debe vincularse por `offer_id`/`subscription_id`, nunca por
el email de la cuenta pagadora.

## Estados normalizados

- `draft`: todavía no contratada.
- `pending_payment`: creada, esperando pago.
- `trial`: habilitación temporal.
- `active`: vigente.
- `past_due`: pago automático rechazado o deuda vencida.
- `paused`: suspendida de forma reversible.
- `cancelled`: finalizada explícitamente.
- `expired`: vencida por fecha.

Mientras se preservan los valores históricos, el servicio central traduce
`inactive` a `paused` y calcula `expired` por fecha.

## Regla de transición

Toda operación nueva debe ejecutarse en transacción y actualizar, en este orden:

1. suscripción;
2. términos congelados;
3. addons incluidos;
4. resumen del negocio;
5. pago, cuando corresponda;
6. auditoría.

