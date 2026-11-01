# Tags Alojamiento — Motor público de disponibilidad, cotización y reservas

**Estado:** diseño técnico y funcional aprobado; Etapa 0 iniciada  
**Caso inicial de validación:** Cabañas Ecos del Valle  
**Alcance del producto:** hoteles, cabañas, hosterías, posadas, departamentos temporarios y otros alojamientos  
**Fecha del documento:** 2026-10-27

## 1. Propósito

Este documento define lo que se implementará para incorporar a Tags un motor público y multi-tenant de disponibilidad, cotización y reservas de alojamiento, utilizando Cabañas Ecos del Valle como primera implementación real.

El motor debe reutilizar el inventario, las estadías, los huéspedes, las cuentas, los pagos, las comunicaciones y la grilla de ocupación existentes en Tags Guest Experience. No debe crear un sistema paralelo de unidades o reservas.

Ecos del Valle permitirá validar las políticas de un complejo de cabañas, pero sus reglas comerciales serán configuración inicial de ese establecimiento y no comportamiento fijo del producto. Cada alojamiento podrá definir políticas diferentes.

No se implementará código, SQL, configuración productiva ni integraciones externas hasta que este diseño sea aprobado expresamente.

## 2. Conclusiones de la auditoría que originan el desarrollo

El sistema existente ya resuelve administrativamente:

- unidades de alojamiento;
- huéspedes titulares y acompañantes;
- estadías con fecha de ingreso y egreso;
- grilla de ocupación;
- control básico de superposición;
- check-in y checkout;
- no presentación y reprogramación;
- cuentas, cargos, pagos y señas registradas;
- comunicaciones y acceso seguro a Mi Estadía;
- auditoría de determinadas operaciones.

Las siguientes capacidades no existen todavía o son insuficientes para una venta pública:

- disponibilidad pública de alojamiento;
- cotización automática por reglas;
- estadía mínima configurable;
- protección de huecos residuales;
- bloqueos de unidades por mantenimiento o uso interno;
- reservas tentativas con vencimiento;
- validación completa de capacidad al crear o modificar reservas;
- protección fuerte contra dos reservas simultáneas;
- cancelación lógica con conservación integral del historial;
- integración del chatbot con disponibilidad y cotización reales;
- reserva online con seña;
- sincronización con Booking.com, Airbnb, iCal o channel managers;
- pruebas automatizadas específicas del dominio de alojamiento.

## 3. Principios obligatorios

### 3.1 Un único inventario y una única fuente de verdad

Las unidades y estadías existentes de Guest Experience serán la fuente de verdad. La página pública, el chatbot, WhatsApp y la administración deben consumir el mismo servicio de disponibilidad y cotización.

Ninguna interfaz podrá calcular disponibilidad o precio por su cuenta.

### 3.2 Producto genérico y políticas configurables

El núcleo no supondrá que todos los establecimientos funcionan como Ecos del Valle. Debe permitir políticas distintas para un hotel, una hostería, un complejo de cabañas o un departamento temporario.

### 3.3 Automatización graduable

Cada establecimiento podrá elegir cuánto automatiza:

1. solo informar disponibilidad;
2. informar disponibilidad y cotización;
3. recibir solicitudes pendientes de aprobación;
4. crear reservas automáticas sin pago;
5. crear una reserva mediante seña;
6. confirmar automáticamente solo cuando se cumplan todas las reglas.

La primera configuración de Ecos del Valle utilizará disponibilidad y cotización con cierre por WhatsApp y revisión humana de los casos dudosos.

### 3.4 La disponibilidad técnica no implica aceptación comercial

Una unidad libre puede no ser comercialmente conveniente para las fechas pedidas. El motor debe distinguir:

- disponible y aceptable;
- disponible con advertencia;
- requiere revisión manual;
- no aceptable por política;
- no disponible por ocupación o bloqueo.

### 3.5 Privacidad y aislamiento multi-tenant

La disponibilidad pública nunca expondrá nombres, teléfonos, documentos, códigos de reserva, notas, pagos ni datos de otros huéspedes.

Toda consulta deberá quedar ligada al alojamiento y a su superficie pública mediante un identificador o token verificable. No se confiará en un `businessId` libre enviado por el navegador.

## 4. Separación entre Reservar y Mi Estadía

Son experiencias diferentes:

- **Reservar:** para una persona que todavía no tiene una reserva.
- **Mi Estadía:** para un huésped con una estadía existente y acceso seguro.
- **Chat de IA:** asistente transversal que orienta, consulta el mismo motor y deriva al flujo correspondiente.

Para Ecos del Valle, la página pública se mostrará en:

`https://www.cabanasecosdelvalle.com.ar/reservar`

La ruta canónica interna propuesta es:

`/p/[slug]/reservar`

Cloudflare o la infraestructura de dominios de Tags resolverá la ruta sin redirigir visiblemente a `tags.com.ar`.

La ruta actual de Mi Estadía continuará en:

`https://www.cabanasecosdelvalle.com.ar/mi-estadia`

La página completa será la integración preferida. También podrá existir un widget embebible para clientes que no puedan configurar proxy o rutas en su dominio, pero no será la opción principal para Ecos del Valle.

## 5. Integración con la web del alojamiento

La web podrá incorporar:

- un enlace **Reservar** en el menú;
- botones “Consultar disponibilidad” y “Reservá tu cabaña” dirigidos a `/reservar`;
- enlaces desde cada unidad con la unidad o el tipo de unidad preseleccionado;
- enlaces generados por campañas, QR o redes sociales;
- búsquedas precargadas desde el chatbot;
- salida a WhatsApp manteniendo fechas, pasajeros, unidad y cotización.

La página debe utilizar la identidad visual del alojamiento:

- logo;
- portada;
- nombre comercial;
- colores y tipografías;
- encabezado y pie;
- información de contacto;
- WhatsApp;
- políticas y condiciones configuradas.

## 6. Arquitectura funcional

### 6.1 Núcleo compartido

El motor común administrará:

- establecimientos;
- tipos de unidad y unidades concretas;
- capacidad;
- disponibilidad;
- ocupación;
- bloqueos;
- estadías;
- solicitudes;
- reservas tentativas;
- cotizaciones;
- reglas tarifarias;
- señas;
- estados y auditoría.

### 6.2 Políticas del establecimiento

Cada alojamiento podrá configurar:

- modalidad de capacidad;
- edad orientativa de menores;
- uso de cama o plaza;
- personas que abonan;
- máximo físico por seguridad;
- estadía mínima y máxima;
- días permitidos de ingreso y egreso;
- protección de huecos;
- anticipación mínima y máxima;
- tarifas y temporadas;
- descuentos y extras;
- porcentaje o importe de seña;
- tiempo de vencimiento de una reserva tentativa;
- nivel de automatización;
- reglas específicas por canal;
- excepciones manuales.

### 6.3 Resolución de políticas

La política efectiva se obtendrá en este orden, prevaleciendo la regla más específica:

```text
Política general del establecimiento
→ temporada o rango de fechas
→ tipo de unidad
→ unidad concreta
→ canal o superficie de venta
→ tarifa/promoción elegida
→ excepción manual para esas fechas
```

El resultado debe registrar qué reglas se aplicaron para poder explicar y auditar una cotización o rechazo.

## 7. Modelo de capacidad y huéspedes

El producto debe admitir diferentes modalidades.

### 7.1 Capacidad total

Adultos y menores que ocupan cama/plaza consumen capacidad de la unidad. Es el modo inicial previsto para Ecos del Valle.

### 7.2 Límites separados

Algunos alojamientos podrán establecer máximos diferentes de adultos y niños.

### 7.3 Camas y plazas adicionales

Podrá diferenciarse:

- camas permanentes;
- camas adicionales;
- cunas;
- plazas sin cargo;
- máximo físico por seguridad.

### 7.4 Menores y ocupación de cama

Para Ecos del Valle, el criterio comercial inicial será:

- el huésped que ocupa cama abona y consume una plaza;
- un niño menor de la edad configurada puede no abonar si no ocupa cama;
- la edad funcionará como orientación;
- la pregunta determinante será si ocupa cama;
- podrá existir un máximo físico que incluya también bebés o menores sin cargo.

Ejemplo:

```text
2 adultos
1 niño que ocupa cama
1 bebé que no ocupa cama
= 3 plazas ocupadas y 3 huéspedes tarifados
```

La administración podrá autorizar una excepción, que deberá quedar auditada.

## 8. Estadía mínima y restricciones de fechas

El motor debe soportar:

- mínimo general de noches;
- máximo general de noches;
- mínimo por temporada;
- mínimo por unidad o tipo de unidad;
- mínimo por rango especial o feriado;
- mínimo según el día de ingreso;
- días habilitados de ingreso;
- días habilitados de egreso;
- duración exacta para determinados períodos;
- anticipación mínima y máxima;
- excepciones manuales.

Las reglas deben evaluarse en servidor y no solamente en el formulario público.

## 9. Protección de huecos residuales

El motor debe analizar los períodos libres que quedarían antes y después de aceptar una reserva.

Ejemplo:

```text
Período disponible: 10 al 31 de enero
Solicitud:          10 al 29 de enero
Hueco posterior:    29 al 31 de enero
```

Aunque exista disponibilidad técnica, aceptar la solicitud puede dejar dos noches difíciles de vender.

### 9.1 Modos configurables

- `disabled`: no se controla el hueco;
- `warn`: se permite continuar y se muestra una advertencia;
- `manual_review`: se recibe la solicitud, pero requiere aprobación;
- `block`: se rechaza esa combinación y se ofrecen alternativas;
- `auto_adjust`: se proponen fechas que aprovechan mejor el período.

### 9.2 Variables de la regla

- mínimo residual anterior;
- mínimo residual posterior;
- temporada;
- día de la semana;
- fin de semana;
- proximidad de la fecha de ingreso;
- unidad o tipo de unidad;
- posibilidad real de vender ese hueco;
- canal de venta.

### 9.3 Alternativas

Ante una solicitud inconveniente, el motor podrá proponer:

- extender el egreso;
- adelantar el ingreso;
- desplazar la estadía;
- elegir otra unidad;
- enviar el caso a revisión;
- contactar por WhatsApp.

No deberá responder simplemente “sin disponibilidad” cuando exista una alternativa válida.

## 10. Bloqueos operativos

Debe incorporarse un concepto independiente de reserva para bloquear una unidad por:

- mantenimiento;
- limpieza profunda;
- reparación;
- uso del propietario;
- desinfección;
- margen operativo entre estadías;
- indisponibilidad manual;
- otra causa configurable.

Los bloqueos tendrán unidad o alcance, fechas, motivo, estado, responsable y auditoría. No se crearán huéspedes ni reservas ficticias para representar mantenimiento.

## 11. Estados de reserva

Se deberá unificar el significado de los estados. Modelo preliminar:

- `hold`: disponibilidad retenida temporalmente;
- `pending_confirmation`: solicitud recibida y pendiente;
- `reserved`: reserva confirmada;
- `active`: check-in confirmado;
- `checked_out`: estadía concluida;
- `cancelled`: reserva cancelada conservando historial;
- `no_show_rebooking`: no presentación pendiente de reprogramación.

El uso actual de `upcoming` deberá auditarse y decidirse si se migra, se conserva como alias o se elimina. No se cambiarán estados existentes sin una estrategia de compatibilidad.

## 12. Cancelación y conservación del historial

La operación normal de cancelación no eliminará físicamente:

- reserva;
- huésped asociado;
- pagos;
- movimientos de cuenta;
- comunicaciones;
- accesos;
- auditoría.

Una cancelación deberá registrar:

- fecha;
- responsable;
- motivo;
- política aplicada;
- importe retenido, reintegrado o acreditado;
- liberación de la unidad;
- notificación enviada.

La eliminación física quedará reservada a datos de prueba o correcciones administrativas excepcionales, con permisos y confirmación específicos.

## 13. Disponibilidad y concurrencia

La comprobación debe considerar:

- unidad activa;
- capacidad;
- reservas que bloquean inventario;
- holds vigentes;
- bloqueos operativos;
- fechas contiguas válidas;
- estadía mínima y máxima;
- huecos residuales;
- políticas aplicables;
- zona horaria del establecimiento.

Para impedir doble reserva, la confirmación o creación de un hold deberá ser transaccional y poseer una estrategia explícita de serialización o bloqueo. No será suficiente con consultar y luego insertar sin una protección común.

Las consultas públicas podrán cachearse únicamente si el cache no se usa como autoridad al confirmar. Toda confirmación deberá recalcular la disponibilidad dentro de la transacción.

## 14. Fechas y zona horaria

Para noches de alojamiento se propone tratar conceptualmente:

- ingreso como fecha local;
- egreso como fecha local exclusiva;
- hora de check-in como configuración independiente;
- hora de checkout como configuración independiente;
- zona horaria por establecimiento.

Antes de modificar columnas existentes deberá estudiarse la compatibilidad con los `DATETIME` actuales. No se ejecutará una migración de fechas sin pruebas de conversión y reversión.

## 15. Tarifas y cotización

El motor tarifario deberá permitir:

- precio base por unidad o tipo de unidad;
- temporada alta, media y baja;
- rangos especiales;
- fines de semana y feriados;
- precio según ocupación;
- huésped adicional;
- menores con o sin cargo;
- cama adicional;
- mascotas;
- limpieza y otros extras;
- descuentos;
- promociones;
- estadía mínima asociada a una tarifa;
- seña porcentual o fija;
- prioridad y compatibilidad entre reglas.

Toda cotización deberá incluir:

- fechas;
- noches;
- ocupación;
- unidad o tipo de unidad;
- desglose de importes;
- total;
- seña requerida;
- moneda;
- vigencia;
- reglas aplicadas;
- aclaración sobre confirmación o revisión.

La cotización se recalculará antes de crear una reserva o cobrar una seña.

## 16. Página pública `/reservar`

### 16.1 Flujo inicial

1. Seleccionar ingreso y egreso.
2. Indicar adultos y menores.
3. Informar edades y ocupación de cama cuando la política lo requiera.
4. Validar fechas, capacidad y estadía mínima.
5. Consultar disponibilidad real.
6. Evaluar restricciones comerciales y huecos.
7. Mostrar unidades y alternativas.
8. Calcular cotización.
9. Elegir unidad u opción.
10. Continuar por WhatsApp o enviar solicitud, según la configuración.

### 16.2 Estados de respuesta pública

- disponible;
- disponible con advertencia;
- requiere revisión;
- fechas alternativas disponibles;
- unidad alternativa disponible;
- no disponible;
- consulta temporalmente no disponible.

### 16.3 Experiencia móvil

La interfaz será mobile-first, con:

- campos táctiles claros;
- resumen persistente de la búsqueda;
- precios legibles;
- botones de WhatsApp y continuar visibles;
- carga y errores explícitos;
- conservación de datos ante una interrupción de red;
- accesibilidad mediante teclado y lectores de pantalla.

## 17. Integración con WhatsApp

En la primera etapa comercial de Ecos del Valle, WhatsApp seguirá siendo el canal de cierre.

El mensaje se generará con datos estructurados:

- alojamiento;
- identificador de consulta o cotización;
- ingreso y egreso;
- noches;
- adultos y menores;
- plazas ocupadas;
- unidad seleccionada;
- importe estimado;
- seña requerida, si corresponde;
- advertencias o necesidad de revisión.

La administración debe poder recuperar la consulta y convertirla en reserva utilizando los formularios existentes.

## 18. Integración con el chatbot

El chatbot no calculará disponibilidad ni precio a partir de texto o conocimiento estático.

Debe utilizar el mismo servicio que `/reservar`:

```text
Página /reservar ─┐
                  ├─ servicio de disponibilidad y cotización
Chat de IA ───────┘
Administración ───┘
```

Flujo conversacional esperado:

1. interpretar fechas y pasajeros;
2. pedir los datos faltantes;
3. consultar el motor;
4. explicar resultados reales;
5. ofrecer alternativas cuando corresponda;
6. abrir `/reservar` con la búsqueda precargada;
7. derivar a WhatsApp o revisión.

La integración deberá utilizar un token de superficie o contrato firmado que vincule dominio, negocio y configuración. No se confiará en un `businessId` modificable por el usuario.

## 19. Rutas y APIs propuestas

Los nombres definitivos se confirmarán contra los contratos existentes antes de implementar.

### 19.1 Ruta pública

- `/p/[slug]/reservar`
- opcionalmente estados internos representativos como `/resultados` o `/cotizacion/[token]`, manteniendo una experiencia SPA.

### 19.2 APIs públicas preliminares

- `GET /api/guest-experience/public/lodging/availability`
- `POST /api/guest-experience/public/lodging/quote`
- `POST /api/guest-experience/public/lodging/inquiries`
- en una etapa posterior, `POST /api/guest-experience/public/lodging/holds`
- en una etapa posterior, confirmación y pago de una reserva.

### 19.3 Administración preliminar

Se incorporará una sección identificable como **Reservas online** o equivalente dentro de Guest Experience, con:

- publicación y URL pública;
- apariencia;
- capacidad;
- estadía mínima;
- protección de huecos;
- bloqueos;
- tarifas y temporadas;
- automatización;
- WhatsApp;
- consultas recibidas;
- analítica.

## 20. Evolución de datos propuesta

Las siguientes entidades son propuestas y requieren revisar el esquema real antes de escribir SQL:

- `tags_guest_unit_blocks`;
- `tags_guest_rate_plans`;
- `tags_guest_rate_rules`;
- `tags_guest_quote_requests`;
- `tags_guest_booking_inquiries`;
- `tags_guest_reservation_holds`.

Posibles ampliaciones de `tags_guest_stays`:

- cancelación y motivo;
- responsable de cancelación;
- vencimiento del hold;
- referencia de cotización pública;
- canal y referencia externa.

No se declararán claves foráneas contra tablas legacy sin verificar tipos, signo, tamaño y motor en desarrollo y producción. El SQL exacto se presentará para aprobación antes de ejecutarlo.

## 21. Booking.com, Airbnb y canales externos

No se implementará una integración nominal o simulada.

La sincronización se evaluará únicamente cuando exista un proveedor o API real con contratos conocidos para:

- disponibilidad;
- tarifas;
- reservas;
- modificaciones;
- cancelaciones;
- webhooks;
- reconciliación;
- idempotencia;
- conflictos;
- errores y reintentos.

Un channel manager será una etapa opcional posterior. El núcleo interno debe ser suficientemente sólido antes de exponer inventario a canales automáticos.

## 22. Configuración inicial prevista para Ecos del Valle

Esta configuración valida el producto, pero no será codificada como regla global:

- seis unidades cargadas y verificadas contra la realidad operativa;
- capacidad total por plazas ocupadas;
- huésped que ocupa cama abona;
- menor por debajo de la edad configurada puede no abonar si no ocupa cama;
- máximo físico por unidad configurable;
- estadía mínima variable por temporada;
- protección de huecos activa;
- propuesta de fechas alternativas;
- disponibilidad y cotización públicas;
- cierre por WhatsApp;
- revisión manual de casos dudosos;
- sin confirmación automática inicial;
- sin Booking.com ni channel manager inicial;
- sin cobro online en la primera etapa.

Antes de activar el flujo público se deberá verificar en producción el nombre, código y capacidad de las seis cabañas.

## 23. Etapas de implementación

### Etapa 0 — contrato y endurecimiento del núcleo

Objetivos:

- centralizar los estados y las reglas de ocupación;
- validar capacidad en altas y modificaciones;
- reemplazar la cancelación destructiva por cancelación lógica;
- definir fechas y zona horaria;
- crear un servicio único de disponibilidad;
- fortalecer concurrencia e idempotencia;
- conservar compatibilidad con la administración actual.

Criterios de aceptación:

- no se puede superar la capacidad sin una excepción autorizada;
- no se puede crear una superposición;
- dos solicitudes simultáneas no pueden confirmar la misma unidad;
- una cancelación libera inventario sin borrar historial;
- estadías concluidas permanecen visibles;
- la grilla y el servicio de disponibilidad interpretan estados de igual manera.

### Etapa 1 — bloqueos y políticas de estadía

Objetivos:

- bloqueos de unidades;
- estadía mínima y máxima;
- días de ingreso/egreso;
- anticipación;
- protección de huecos;
- reglas y excepciones por establecimiento.

Criterios de aceptación:

- una unidad bloqueada no se ofrece;
- el motor explica la restricción aplicable;
- los huecos se evalúan según la política configurada;
- se generan alternativas razonables;
- la política de Ecos del Valle no afecta a otros clientes.

### Etapa 2 — motor tarifario y cotización

Objetivos:

- planes y reglas tarifarias;
- temporadas y fechas especiales;
- ocupación y menores;
- extras, descuentos y seña;
- cotización auditable y con vencimiento.

Criterios de aceptación:

- web, chatbot y administración producen el mismo total;
- cada cálculo informa las reglas aplicadas;
- no se cotiza una unidad no disponible;
- una modificación recalcula el precio;
- los importes usan la moneda del establecimiento.

### Etapa 3 — página pública y WhatsApp

Objetivos:

- ruta `/reservar`;
- integración con dominio propio;
- diseño mobile-first;
- disponibilidad, alternativas y cotización;
- consulta estructurada por WhatsApp;
- administración de consultas;
- analítica del embudo.

Criterios de aceptación:

- el usuario permanece en el dominio del alojamiento;
- el proceso no expone datos privados;
- la búsqueda puede retomarse desde el chatbot;
- WhatsApp conserva todos los datos relevantes;
- la consulta puede convertirse en reserva existente sin duplicar datos.

### Etapa 4 — chatbot conectado al motor

Objetivos:

- herramienta de disponibilidad;
- herramienta de cotización;
- preguntas aclaratorias;
- alternativas;
- apertura de `/reservar` precargado;
- firma de superficie y aislamiento de negocio.

Criterios de aceptación:

- el chatbot nunca inventa disponibilidad ni precios;
- no puede consultar otro establecimiento alterando el payload;
- una caída del motor genera una respuesta controlada;
- las consultas quedan atribuidas a la superficie correcta.

### Etapa 5 — holds y solicitudes pendientes

Objetivos:

- reservas tentativas;
- vencimiento automático;
- revisión y aprobación administrativa;
- liberación segura del inventario;
- comunicaciones asociadas.

Criterios de aceptación:

- un hold vigente bloquea la unidad;
- un hold vencido la libera;
- los procesos son idempotentes;
- la aprobación vuelve a comprobar disponibilidad y precio.

### Etapa 6 — seña y reserva online

Objetivos:

- Mercado Pago;
- enlaces de pago;
- webhook idempotente;
- confirmación transaccional;
- vencimiento por falta de pago;
- conciliación y comprobantes.

Criterios de aceptación:

- ningún pago confirma una unidad ocupada;
- un webhook repetido no duplica pagos ni reservas;
- el fracaso de pago libera el hold según política;
- administración y huésped ven el mismo estado.

### Etapa 7 — canales externos opcionales

Objetivos:

- seleccionar proveedor real;
- sincronización de inventario, tarifas y reservas;
- reconciliación;
- alertas y resolución de conflictos.

No se inicia esta etapa sin proveedor, contratos, documentación y estrategia de recuperación aprobados.

## 24. Analítica

Se registrarán, respetando privacidad:

- inicio de búsqueda;
- fechas y composición agregada de pasajeros;
- resultados disponibles;
- restricciones encontradas;
- alternativas ofrecidas;
- cotización generada;
- unidad seleccionada;
- clic en WhatsApp;
- solicitud enviada;
- conversión a reserva;
- abandono por paso;
- origen, campaña y superficie.

No se enviarán documentos, notas privadas ni datos sensibles a analítica.

## 25. Pruebas obligatorias

### Disponibilidad y concurrencia

- dos solicitudes simultáneas sobre una unidad;
- fechas contiguas;
- cambio de unidad;
- cancelación y liberación;
- no show y reprogramación;
- checkout histórico;
- bloqueos parciales y completos;
- holds vigentes y vencidos;
- reintentos de red.

### Capacidad

- adultos y menores;
- menor que ocupa cama;
- menor que no ocupa cama;
- máximo físico;
- cama adicional;
- excepción administrativa.

### Políticas

- mínimos por temporada;
- fines de semana y feriados;
- días de ingreso y egreso;
- hueco anterior y posterior;
- alternativas;
- políticas diferentes entre dos establecimientos.

### Fechas

- cruce de mes y año;
- febrero bisiesto;
- fechas pasadas;
- estadía excesivamente larga;
- navegador en otra zona horaria;
- horario de verano de un establecimiento de otro país.

### Seguridad

- manipulación de negocio o slug;
- acceso cruzado entre alojamientos;
- enumeración de reservas;
- exposición de datos privados;
- abuso del chatbot;
- rate limiting;
- tokens vencidos o alterados.

### Tarifas y pagos

- prioridad de reglas;
- descuentos incompatibles;
- modificación de fechas;
- cotización vencida;
- webhook duplicado;
- pago aprobado después del vencimiento del hold;
- conciliación manual.

## 26. Condiciones antes de comenzar cada etapa

Antes de cada implementación se deberá:

1. revisar los contratos reales afectados;
2. identificar componentes y servicios reutilizables;
3. presentar cualquier SQL exacto;
4. obtener autorización antes de modificar la base;
5. preservar la administración y datos existentes;
6. evitar cambios innecesarios en Store, Resto, Turnos o Reviews;
7. validar sin ejecutar build si el usuario no lo autoriza;
8. documentar cambios y pruebas pendientes de producción.

## 27. Decisiones que se consideran acordadas

- El producto será genérico y multi-tenant.
- Ecos del Valle será el primer caso real, no una implementación especial rígida.
- La página pública principal será `/reservar` en el dominio del alojamiento.
- Mi Estadía seguirá siendo la experiencia posterior a la reserva.
- El chatbot y la página pública utilizarán el mismo motor.
- La capacidad inicial de Ecos del Valle se basará en plazas/camas ocupadas.
- La estadía mínima será configurable.
- La protección de huecos será una política de primer nivel.
- Los casos comercialmente dudosos podrán requerir revisión humana.
- La primera etapa comercial cerrará por WhatsApp.
- La reserva con seña y los canales externos serán etapas posteriores.
- No se inventará una integración con Booking.com ni con otros canales.

## 28. Aprobación requerida

La aprobación de este documento autoriza comenzar la **Etapa 0**, pero no autoriza automáticamente:

- ejecutar migraciones;
- modificar producción;
- activar la página pública;
- cobrar señas;
- integrar canales externos.

Cada operación de base de datos o despliegue conservará su instancia de revisión y autorización correspondiente.

## 29. Registro de implementación

### 2026-10-27 — primer bloque de Etapa 0

Implementado sin migraciones ni cambios de producción:

- contrato central de estados que ocupan o liberan inventario;
- modos de capacidad total y límites separados;
- normalización y validación de adultos y menores;
- validación de capacidad en creación y modificación de reservas;
- validación estricta de fechas calendario y cálculo de noches;
- servicio transaccional compartido para bloquear la instancia, cargar una unidad y buscar superposiciones;
- serialización explícita de altas y modificaciones por instancia de alojamiento;
- cancelación lógica conservando reserva, huéspedes, cuenta, pagos, pre-check-in y comunicaciones;
- revocación de sesiones y enlaces al cancelar;
- auditoría de la cancelación con estado anterior y motivo;
- filtro administrativo para consultar reservas canceladas;
- uso del mismo contrato de ocupación en la grilla y en la API.

La cancelación no altera todavía importes, devoluciones, créditos ni retenciones. Esa decisión se incorporará mediante políticas financieras configurables y no debe inferirse automáticamente.

### 2026-10-27 — configuración inicial de Etapa 1

Implementado sin modificar la base de datos:

- política normalizada dentro de `tags_guest_apps.settings_json`;
- capacidad total o límites separados para adultos y menores;
- edad comercial hasta la que un menor no abona;
- consulta configurable sobre ocupación de cama;
- noches mínimas y máximas;
- anticipación mínima y máxima;
- protección de huecos residuales anterior y posterior;
- modos desactivado, advertencia, revisión manual, bloqueo y propuesta de fechas;
- niveles de automatización desde consulta de disponibilidad hasta reserva automática;
- interfaz administrativa responsive para editar esas reglas;
- compatibilidad con la clave anterior `lodgingCapacityMode`.

Se preparó la migración `database/migrations/2026-10-27-tags-guest-unit-blocks.sql` para bloqueos operativos de inventario. Permanece pendiente de aprobación y no fue ejecutada. Las APIs y pantallas de bloqueos no deben conectarse hasta que la tabla exista.

### 2026-10-27 — bloqueos operativos habilitados

Después de la confirmación de que la migración fue ejecutada en desarrollo y producción, se implementó:

- API administrativa para listar, crear y levantar bloqueos;
- bloqueos por unidad o para todo el alojamiento;
- motivos de mantenimiento, uso del propietario, fuera de servicio y bloqueo manual;
- fechas tratadas como intervalos de noches, con fecha final exclusiva;
- rechazo de bloqueos que se superpongan con reservas vigentes;
- rechazo de bloqueos activos superpuestos;
- validación de bloqueos al crear o modificar una reserva;
- bloqueo transaccional de la instancia y las unidades afectadas;
- auditoría de creación y cancelación de bloqueos;
- historial de bloqueos levantados;
- administración dentro de `Unidades / Habitaciones`;
- representación visual de los días bloqueados en la grilla de ocupación;
- actualización inmediata de la grilla después de crear o levantar un bloqueo.

La estadía mínima, anticipación y protección de huecos están configuradas y normalizadas, pero su aplicación pública se incorporará junto con el endpoint único de disponibilidad. No se aplican rígidamente a la carga administrativa porque esa operación debe admitir excepciones autorizadas y auditadas.

### 2026-10-27 — evaluador público único de disponibilidad

Se incorporó `GET /api/guest-experience/public/lodging-availability` como contrato compartido para la futura página de reservas y Muchi. Recibe slug, ingreso, egreso, adultos y menores, y devuelve decisiones estructuradas por unidad.

El evaluador aplica:

- publicación vigente del alojamiento;
- fechas válidas y cantidad de noches;
- estadía mínima y máxima;
- anticipación mínima y máxima;
- capacidad total o límites separados;
- reservas que ocupan inventario;
- bloqueos por unidad y por propiedad;
- huecos residuales antes y después de la solicitud;
- decisiones `available`, `available_with_warning`, `review_required`, `unavailable` y `alternative_suggested`;
- propuesta de extensión de fechas cuando la política es automática y existe un límite vecino conocido.

El endpoint no crea reservas ni holds. Su responsabilidad es responder disponibilidad verificable; la mutación de inventario continuará utilizando el mismo bloqueo transaccional empleado por la administración.

### 2026-10-27 — primera página pública de reservas

Se incorporó la ruta canónica `/p/[slug]/reservar` con una interfaz pública mobile-first que:

- muestra identidad, logo y portada del alojamiento;
- solicita ingreso, egreso, adultos y menores;
- consume exclusivamente el evaluador público compartido;
- diferencia disponibilidad directa, advertencias, revisión manual, alternativas y falta de disponibilidad;
- explica los huecos residuales sin afirmar una confirmación inexistente;
- permite continuar la consulta por WhatsApp cuando el alojamiento configuró teléfono de recepción;
- no crea reservas, pagos ni retenciones de inventario;
- admite resolución desde dominio propio cuando exista una ruta de dominio `/reservar` asociada a `guest_experience`.

El siguiente paso de mutación —solicitudes y holds— requiere diseño y migración específica para conservar vencimiento, idempotencia, auditoría y concurrencia. No debe implementarse reutilizando estados ambiguos ni reservas incompletas.

### 2026-10-27 — propuesta de solicitudes y holds

Se preparó, sin ejecutar, `database/migrations/2026-10-27-tags-guest-booking-requests.sql`.

La propuesta utiliza una entidad independiente de la estadía confirmada para evitar crear huéspedes, cuentas y reservas incompletas. Incluye:

- solicitud asociada a una unidad concreta;
- código público e identificador idempotente;
- token almacenado únicamente como hash;
- datos de contacto y ocupación solicitada;
- decisión de disponibilidad que originó la solicitud;
- hold con vencimiento configurable entre 5 y 120 minutos;
- relación con la estadía solamente después de confirmar;
- estados `held`, `review_required`, `confirmed`, `expired`, `cancelled` y `rejected`;
- historial inmutable de transiciones y responsables;
- índices específicos para inventario, vencimientos, contacto e idempotencia;
- ausencia deliberada de claves foráneas contra tablas legacy no verificadas.

Los registros vencidos no se borrarán. Dejarán de ocupar inventario mediante su estado y vencimiento, conservando la trazabilidad de la consulta.

### 2026-10-27 — creación pública de solicitudes habilitada

Después de confirmarse la migración en desarrollo y producción se implementó:

- formulario de contacto desde cada resultado reservable;
- revalidación completa dentro de una transacción antes de retener;
- serialización mediante el mismo bloqueo de instancia usado por reservas administrativas;
- idempotencia de reintentos del navegador;
- token público almacenado únicamente como hash;
- vencimiento automático de holds anteriores antes de evaluar inventario;
- inclusión de holds activos en todas las consultas del evaluador;
- solicitudes `review_required` sin ocupación automática de inventario;
- holds solamente para decisiones que permiten continuar;
- registro de evento inicial y auditoría general;
- comprobante con código, estado y hora de vencimiento;
- continuación opcional por WhatsApp después de registrar la solicitud.
- notificación Web Push al alojamiento y administradores habilitados, con acceso directo a la bandeja operativa.

Queda pendiente la bandeja administrativa con acciones de aprobar, rechazar y convertir transaccionalmente la solicitud en una estadía formal.

### 2026-10-27 — bandeja y resolución administrativa

Se incorporó la solapa `Solicitudes online` dentro de Reservas / Estadías con:

- botón propio para habilitar Web Push;
- apertura directa desde la notificación mediante `?tab=booking_requests`;
- contactos, unidad, fechas, ocupación, observaciones y vencimiento;
- estados de retención, revisión, confirmación, rechazo y vencimiento;
- aprobación y rechazo sujetos al permiso `guest.stays.manage`;
- revalidación transaccional del inventario al aprobar;
- exclusión del propio hold durante esa revalidación;
- creación de huésped, estadía, vínculo del titular y cuenta;
- generación serializada del código de reserva;
- vínculo irreversible entre solicitud confirmada y estadía;
- auditoría e historial de la transición;
- liberación inmediata del inventario al rechazar.

### 2026-10-27 — notificación opcional al resolver solicitudes

Las acciones de confirmar y rechazar incorporan el control `Notificar al cliente`, activado por defecto. La resolución administrativa se completa primero y luego se procesa el aviso por email, de modo que una falla del proveedor de correo no revierte la reserva ni vuelve a ocupar inventario.

El historial de la solicitud registra tanto el envío y sus errores como la decisión explícita del operador de no notificar. Si la solicitud no posee email, la resolución continúa y la omisión también queda auditada.

## 30. Diseño propuesto para calendario tarifario y restricciones

### 30.1 Alcance funcional

La administración ofrecerá un calendario operativo comparable con el de una extranet hotelera, pero mantendrá políticas configurables por establecimiento. Permitirá seleccionar uno o varios días, un rango y una o varias unidades para aplicar:

- apertura o cierre de venta;
- precio por noche;
- precios por bandas de ocupación;
- estadía mínima y máxima;
- anticipación mínima y máxima;
- cierre para llegadas;
- cierre para salidas;
- política de huecos residuales;
- revisión manual obligatoria.

`Cerrado` significa que la noche no se vende. `Cerrado para llegadas` permite que una estadía atraviese la fecha pero impide comenzar allí. `Cerrado para salidas` permite ocuparla pero impide finalizar allí. Estas restricciones comerciales no se registrarán como ocupación ni como bloqueo de mantenimiento.

### 30.2 Plan tarifario y unidades

Un plan tarifario contiene los valores predeterminados: moneda, modalidad de precio, tarifa base, noches mínimas y máximas, anticipación, seña y estado. Las unidades se asocian explícitamente a uno o más planes; inicialmente la interfaz administrará un plan principal por unidad, sin impedir una futura tarifa reembolsable o promocional.

Las modalidades iniciales serán:

- `per_unit`: precio fijo de la unidad por noche;
- `occupancy`: precio nocturno según cantidad de huéspedes que abonan.

La cantidad cobrable será calculada por la política vigente de capacidad y menores. El navegador no podrá decidir cuántos huéspedes pagan.

### 30.3 Temporadas, fechas especiales y excepciones

Una temporada será una regla nombrada aplicada a un rango de fechas, no una estructura rígida. Una regla podrá limitarse a determinados días de la semana y a una unidad concreta. El mismo mecanismo representará enero, vacaciones, un fin de semana largo o una excepción de un solo día.

Los extremos `starts_on` y `ends_on` de una regla son inclusivos. Una regla sin plan tarifario se aplica a todos los planes compatibles y permite cerrar una unidad o propiedad sin duplicar la misma restricción en cada tarifa.

Los campos no informados se heredan. La resolución se realizará campo por campo con este orden:

1. excepción de unidad y fecha más específica;
2. regla del plan para la fecha;
3. valores predeterminados del plan;
4. políticas generales del alojamiento cuando el plan no defina el campo.

Ante dos reglas del mismo nivel ganará la prioridad mayor; si también coincide, la regla actualizada más recientemente. El motor devolverá los identificadores y nombres de todas las reglas aplicadas.

`price_adjustment_type` admitirá inicialmente `fixed`, `amount_delta` y `percentage_delta`. Las bandas de ocupación específicas de una regla reemplazan, para esa fecha, las bandas predeterminadas del plan.

### 30.4 Evaluación de una estadía

Las noches ocupadas son las fechas desde el ingreso inclusive hasta el egreso exclusive. El motor:

1. valida capacidad y huéspedes cobrables;
2. verifica inventario, bloqueos y holds;
3. comprueba apertura de cada noche;
4. valida llegada sobre la fecha de ingreso;
5. valida salida sobre la fecha de egreso;
6. resuelve mínimos, máximos, anticipación y huecos;
7. calcula cada noche de forma independiente;
8. suma importes, descuentos y seña;
9. genera una cotización inmutable con desglose y reglas aplicadas.

Una cotización no ocupa inventario. El hold continúa siendo la única retención temporal. Al crear una solicitud se copiarán el total, la seña y el snapshot de cálculo para evitar que un cambio posterior en el calendario altere silenciosamente lo ofrecido al cliente.

### 30.5 Calendario administrativo

La pantalla tendrá vista por unidades y días, selección masiva y un editor lateral/modal. Cada celda mostrará como mínimo:

- estado abierto/cerrado;
- precio desde o precio aplicable a la ocupación seleccionada;
- mínimo de noches;
- indicadores de sin llegada y sin salida;
- ocupación, bloqueo o hold cuando corresponda.

El editor mostrará el valor efectivo y su origen antes de guardar. Guardar un rango creará o actualizará reglas, no filas de reservas. Los cambios se auditarán mediante la infraestructura de auditoría de Guest Experience.

### 30.6 APIs previstas

Administración:

- `GET/POST/PATCH /api/guest-experience/admin/rate-plans`;
- `GET/POST/PATCH/DELETE /api/guest-experience/admin/rate-rules`;
- `GET /api/guest-experience/admin/rate-calendar`;
- `POST /api/guest-experience/admin/rate-calendar/bulk`.

Públicas e internas:

- el endpoint existente de disponibilidad incorporará restricciones efectivas;
- `POST /api/guest-experience/public/lodging-quotes` generará la cotización;
- el chatbot consumirá una herramienta interna que reutilice disponibilidad y cotización, sin acceso libre a otros negocios.

Las escrituras requerirán `guest.settings.manage` o un permiso tarifario específico si la infraestructura de permisos se amplía. Las lecturas operativas respetarán `guest.stays.view`.

### 30.7 Integración con chatbot

El asistente enviará fechas, adultos, menores y ocupantes de cama al motor. Recibirá unidades disponibles, restricciones, precio, seña, alternativas y evidencia. El modelo solamente redactará esos resultados; no calculará ni inventará importes o disponibilidad. Podrá abrir `/reservar` con los datos precargados.

### 30.8 Migración propuesta

El archivo `database/migrations/2026-10-27-tags-guest-lodging-rates.sql` propone:

- planes tarifarios;
- asignación explícita de planes a unidades;
- bandas de ocupación predeterminadas;
- reglas por rango, día de semana y unidad;
- bandas de ocupación específicas de una regla;
- cotizaciones con vencimiento y snapshot auditable;
- vínculo del precio cotizado con solicitudes y estadías.

No contiene claves foráneas contra tablas legacy y es compatible con MariaDB 10.11. No debe ejecutarse hasta recibir aprobación expresa.

### 30.9 Orden de implementación posterior a la migración

1. Servicio puro y testeable de resolución de reglas.
2. Incorporación de restricciones al evaluador de disponibilidad.
3. Servicio de cotización y snapshots.
4. APIs administrativas de planes, reglas y calendario.
5. Interfaz de calendario y edición masiva.
6. Precio y seña en `/reservar` y solicitudes.
7. Herramienta segura para el chatbot.
8. Notificaciones Web Push de cambios operativos relevantes, con habilitación visible en el módulo.

### 2026-10-27 — motor tarifario y calendario implementados

Después de ejecutarse la migración en desarrollo y producción se incorporó:

- resolución determinista, campo por campo, de reglas generales, por plan y por unidad;
- rangos inclusivos, máscara semanal, prioridad y excepciones de fechas concretas;
- apertura y cierre de venta, sin llegada, sin salida, estadía mínima/máxima y anticipación;
- precios por unidad, bandas de ocupación y ajustes fijos, nominales o porcentuales;
- desglose diario con identificación de la fuente de cada precio;
- integración de restricciones y revisión manual con el evaluador de disponibilidad existente;
- compatibilidad legacy: una unidad sin plan mantiene el comportamiento anterior;
- API administrativa de planes, asignaciones, bandas de ocupación y reglas;
- calendario administrativo de hasta 120 días con ocupación, bloqueos, holds, precios y restricciones;
- solapa `Tarifas y disponibilidad` con edición por día o rango y habilitación de Web Push;
- cotizaciones inmutables con vencimiento, total, seña y snapshot de reglas;
- vinculación de la cotización con la solicitud pública;
- conservación del precio cotizado al confirmar la estadía;
- creación del cargo de alojamiento en la cuenta de la estadía confirmada;
- presentación de total, promedio nocturno y seña en `/reservar`.

La resolución pura fue validada con superposición de reglas, prioridad por unidad, mínimo de noches, cierre de salida, banda de cuatro ocupantes, ajuste porcentual y precio excepcional de una sola fecha. No se ejecutó el build.

### 2026-10-27 — carga tarifaria por período y unidad

La operación principal del calendario se ajustó al modelo de extranet hotelera:

1. primero se define el nombre y el rango de fechas del período;
2. se seleccionan una o varias unidades declaradas;
3. para cada unidad se exige una tarifa nocturna exacta desde un huésped hasta su capacidad total declarada;
4. opcionalmente se aplican restricciones propias del período: apertura de venta, llegadas, salidas, estadía mínima/máxima y revisión manual.

El guardado es transaccional: crea una regla específica por unidad y persiste su matriz completa de ocupación. Si falta cualquier precio requerido, no se guarda parcialmente. No existen precios de respaldo: una fecha sin precio explícito no se ofrece públicamente.

El porcentaje de seña, la anticipación, la duración predeterminada y las demás políticas generales se leen exclusivamente desde Configuración del motor de reservas. Para mantener el contrato interno de las cotizaciones se crea automáticamente una tarifa técnica estándar, invisible para el usuario y sin valores comerciales propios. No hay un paso administrativo de “Plan base”.

La moneda también se define una sola vez en Configuración del motor. Las opciones iniciales son pesos argentinos (`ARS`, símbolo `$`) y dólares estadounidenses (`USD`, representación `U$S`). El cambio redefine la moneda de los precios configurados y se aplica a las cotizaciones nuevas; los documentos financieros ya emitidos conservan la moneda registrada en su snapshot.

#### Invariante de seguridad comercial

El motor no presume, completa ni hereda importes. Una unidad sólo es vendible cuando todas las noches solicitadas están abiertas y cada una posee un precio explícito, positivo y aplicable a la ocupación consultada. Una fecha sin precio, con precio cero, cerrada o con una matriz incompleta se devuelve como no disponible. Tampoco puede crearse una solicitud de reserva sin una cotización válida. Esta validación se realiza nuevamente en servidor al confirmar la solicitud para evitar discrepancias con el huésped.

### 2026-10-27 — refinamiento operativo del calendario

- Los selectores Desde/Hasta y ocupación utilizan valores temporales y sólo consultan al presionar `Ver calendario`; nunca se envía un rango incompleto mientras el usuario opera el datepicker.
- El calendario incorpora una fila superior agrupada por mes y encabezados fijos durante el desplazamiento.
- Una celda verde representa una unidad libre, abierta y con precio explícito para la ocupación elegida. Una celda roja representa falta de tarifa, cierre o inventario no disponible.
- El clic sobre una celda abre la matriz completa de precios de esa unidad, desde una persona hasta su capacidad declarada, junto con las restricciones de esa fecha.
- Las excepciones de una fecha se guardan como reglas específicas de unidad y fecha, con precedencia sobre el período general, y el calendario se recarga después del guardado para reflejar inmediatamente la estadía mínima y las demás restricciones.
