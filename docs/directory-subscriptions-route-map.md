# Route map definitivo: Directorio, suscripciones y dominios

## Planes iniciales

- **Directorio Web**: ficha pública con contactos, redes, mapa, galería y catálogo básico de productos/servicios.
- **Directorio Web Plus**: Directorio Web más Tags Reviews y administración de reseñas.
- Los demás planes existentes permanecen sin cambios y se definirán más adelante.

El nombre público puede componerse como `Directorio Web · Calamuchita` tomando el nombre del Directorio, sin duplicar planes por dominio.

## Regla comercial

- El cliente puede pagar manualmente 1, 3, 6 o 12 meses.
- También puede elegir una suscripción automática mensual de Mercado Pago.
- El importe mensual manual puede variar según el mes calendario.
- Los packs manuales de 3, 6 y 12 meses tienen precios propios configurables.
- Mercado Pago tiene un precio mensual automático propio, independiente del precio manual.
- Mercado Pago debe crear una suscripción mensual con renovación automática.
- El importe automático queda congelado en el precio mensual configurado al contratar, salvo que la plataforma implemente una actualización explícita y notificada.
- Una renovación aprobada extiende la vigencia un mes desde el vencimiento vigente.
- Si el pago falla o la suscripción se cancela, se conserva el historial y se desactiva al vencer el período ya pago, respetando la gracia configurada.
- Las altas con “pagar luego” son excepcionales: la ficha queda activa durante 72 horas y no generan renovación automática hasta que se acredite el primer pago.

## Precios estacionales y packs

Cada combinación Directorio + plan tendrá una configuración de precios que contiene:

- mes calendario (`1` a `12`);
- importe manual para cada mes calendario;
- precio manual del pack de 3 meses;
- precio manual del pack de 6 meses;
- precio manual de la promoción anual de 12 meses;
- precio mensual de la suscripción automática de Mercado Pago;
- moneda y estado activo.

Ejemplo:

| Meses | Importe mensual |
|---|---:|
| Diciembre, enero, febrero y marzo | $40.000 |
| Abril a noviembre | $150.000 |

El panel debe mostrar claramente las cinco modalidades sin mezclarlas. Para pago manual, el cliente elige el período y la plataforma calcula el vencimiento sumando meses. Para Mercado Pago, el cliente contrata un mes y la renovación es mensual.

## Ruta de trabajo

### 1. Suscripciones definitivas y automatizadas

Extender el sistema existente, sin crear una segunda suscripción:

- configuración de precios manuales y automáticos por plan y Directorio;
- cálculo único del precio vigente;
- alta mensual con Mercado Pago;
- webhook idempotente;
- registro en `tags_subscription_payments`;
- actualización de `tags_subscriptions`, `tags_businesses` y addons;
- renovación, cancelación, rechazo y vencimiento;
- notificaciones al cliente y a administradores;
- cron de sincronización y conciliación.

La administración debe mostrar plan, mes aplicado, importe, estado, próximo vencimiento y renovación automática.

### 2. Publicar Mi Negocio

Conectar la inscripción pública con la suscripción definitiva:

- branding tomado del Directorio detectado por dominio;
- modalidad gratuita o paga;
- plan y precio del mes actual;
- pago con Mercado Pago;
- alta de la ficha solamente con el estado correspondiente;
- opción “pagar luego” por 72 horas;
- email al cliente y a administradores;
- activación posterior del Panel de Control;
- galería y contenido ampliado desde el Panel, no durante el alta.

### 3. Proxy inverso de `calamuchita.ar`

- Cloudflare recibe el dominio y deriva el tráfico a Tags.
- Tags resuelve el Directorio por `Host`.
- Las rutas públicas de CalamuchitAr conservan sus URLs.
- El dominio de correo de cPanel se mantiene separado: el proxy web no modifica MX ni la recepción de emails.
- Se verifican `/`, `/login`, `/publicar-mi-negocio`, fichas, assets y callbacks de Mercado Pago.

### 4. Login según Directorio

- El contexto se determina por dominio.
- El email debe existir en `tags_businesses`.
- El negocio debe estar habilitado para el Directorio/canal solicitado.
- El administrador general de Tags conserva acceso global desde `tags.com.ar`.
- El mismo Panel se renderiza con branding y contexto del Directorio correspondiente.
- No se duplican dashboards ni usuarios por dominio.

## Notificaciones

- Alta gratuita: email inmediato a administradores de plataforma.
- Alta paga pendiente: email inmediato a administradores y cliente.
- Pago aprobado: email al cliente y registro del pago.
- Pago rechazado o cancelado: email al cliente y aviso administrativo.
- Próximo vencimiento: recordatorio al cliente.
- Vencimiento: desactivación automática y email a cliente y administradores.

Los administradores se obtienen del sistema existente (`tags_businesses.role = 'admin'`). No se crea una bandeja paralela hasta que exista una necesidad concreta.

## Orden de implementación y validación

No avanzar al paso siguiente hasta validar el anterior:

1. reglas estacionales y cálculo de precio;
2. suscripción mensual Mercado Pago en entorno de prueba;
3. renovación, rechazo, cancelación y vencimiento;
4. inscripción gratuita y pago posterior;
5. inscripción paga con Mercado Pago;
6. proxy Cloudflare y preservación de correo;
7. login por Directorio;
8. prueba integral en CalamuchitAr y Tags.
