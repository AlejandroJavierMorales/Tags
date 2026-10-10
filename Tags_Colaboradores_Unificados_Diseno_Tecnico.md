# Tags — Colaboradores unificados y permisos por módulo

## Objetivo

Permitir que cada negocio cargue a una persona una sola vez y luego le otorgue acceso a uno o varios módulos: Mi Estadía, Turnos, Store, Resto, Events y futuras aplicaciones.

El colaborador tendrá una identidad única dentro del negocio, un acceso de inicio de sesión unificado y permisos independientes para cada módulo. No se crearán empleados duplicados por aplicativo.

## Situación actual relevada

Ya existe una base preparada para esta funcionalidad:

- `tags_business_staff`: identidad central del colaborador.
- `tags_business_staff_app_access`: acceso por módulo, instancia y rol.
- `tags_business_staff_legacy_links`: vínculo temporal con registros antiguos.
- `tags_business_staff_auth_tokens`: invitaciones y accesos por token.

Los módulos todavía conservan estructuras propias:

- Turnos: `tags_turnos_staff`, roles y permisos propios.
- Resto: `tags_resto_staff`, roles y permisos propios.
- Events: `tags_events_staff` y asignación por evento.
- Mi Estadía: debe integrarse con la identidad del negocio y no crear una cuenta paralela.

La implementación debe utilizar las tablas centrales y mantener compatibilidad durante la transición con las tablas existentes.

## Modelo funcional

### Identidad central

Un colaborador se identifica por negocio y email. La ficha central contiene nombre, email, teléfono, estado, fecha de invitación y último acceso.

El estado puede ser activo, pendiente, suspendido o revocado. Revocar el acceso central impide ingresar a todos los módulos del negocio.

### Acceso por módulo

Cada fila de acceso indica:

- colaborador;
- negocio;
- código del módulo;
- instancia concreta, cuando corresponda;
- rol;
- permisos efectivos o excepciones;
- estado.

`app_instance_id = 0` representa todas las instancias habilitadas de ese producto. Esto permite que un colaborador trabaje en todas las agendas de Turnos o solamente en una agenda determinada.

### Alcance por recurso

Además del módulo, algunos productos necesitan limitar recursos. Ejemplos:

- una agenda o sede específica de Turnos;
- una sucursal o store de Resto;
- determinados eventos de Events;
- una unidad o establecimiento de Mi Estadía.

El permiso se evalúa siempre en este orden:

1. colaborador activo;
2. acceso al módulo;
3. instancia o recurso permitido;
4. permiso requerido para la acción.

## Roles base propuestos

Los nombres se presentan al cliente en español; internamente se conservan códigos estables.

- Administrador: acceso completo al módulo y a su configuración.
- Encargado: operación y configuración operativa, sin administrar colaboradores ni permisos.
- Recepción / Reservas: agenda, reservas, disponibilidad y bloqueos.
- Operador: tareas diarias definidas para el módulo.
- Solo lectura: consulta sin modificar.

Cada módulo podrá agregar roles específicos, pero todos se asignarán a la misma identidad central.

## Caso solicitado para Turnos

El rol “Recepción / Reservas” tendrá por defecto:

- ver la grilla;
- consultar el detalle de una reserva;
- crear reservas desde administración;
- confirmar o rechazar reservas;
- reprogramar o cancelar según permiso otorgado;
- definir horarios disponibles;
- crear bloqueos, descansos y excepciones;
- consultar clientes necesarios para atender la reserva.

No tendrá acceso a:

- configuración general de Turnos;
- creación o modificación de servicios;
- creación o modificación de recursos;
- diseño de la página pública;
- pagos e integraciones;
- administración de colaboradores;
- reportes sensibles, salvo que se le otorgue expresamente.

La disponibilidad y los bloqueos se consideran operación de agenda, no configuración estructural del módulo. Por eso se habilitan para Recepción / Reservas.

## Integración por módulo

### Mi Estadía

El colaborador podrá recibir permisos para estadías, huéspedes, pre-check-in, mensajes, solicitudes, beneficios y cuenta. Los datos sensibles del huésped tendrán permisos separados.

### Turnos

Se reemplazará progresivamente la autenticación y autorización basada únicamente en `tags_turnos_staff` por un adaptador que resuelva el colaborador central y conserve el `staff_id` actual durante la transición.

### Store

Se incorporarán accesos por tienda y permisos para productos, categorías, stock, pedidos y configuración.

### Resto

Se vinculará la identidad central con `tags_resto_staff` mediante `tags_business_staff_legacy_links`. Las pantallas y APIs existentes seguirán funcionando mientras el acceso se migra gradualmente.

### Events

Se mantendrá la asignación específica por evento para limitar qué eventos puede operar una persona, pero la identidad, invitación y acceso pasarán a depender del colaborador central.

## Flujo de invitación

1. El administrador abre “Colaboradores” desde el panel del negocio.
2. Carga nombre, email y teléfono opcional.
3. Selecciona uno o varios módulos.
4. Para cada módulo selecciona rol, instancia y permisos adicionales.
5. El sistema crea o reutiliza la identidad central.
6. Se envía una invitación de un solo uso.
7. La persona acepta, define o confirma su acceso y entra al espacio de trabajo autorizado.
8. El administrador puede suspender, revocar o modificar accesos sin borrar el historial.

La invitación no debe exponer contraseñas ni guardar tokens en texto plano. El token se almacena únicamente como hash y tiene vencimiento.

## Administración propuesta

Nueva pantalla central del negocio:

`/dashboard/businesses/[id]/staff`

Solapas:

- Colaboradores.
- Invitaciones pendientes.
- Roles y permisos.
- Auditoría.

Cada colaborador tendrá una ficha con sus accesos agrupados por módulo. Desde allí se podrán activar, modificar o revocar permisos sin volver a cargar sus datos personales.

En cada módulo solo se mostrarán las pantallas autorizadas. Además, cada API validará el permiso en servidor; ocultar un menú nunca será la única protección.

## Auditoría y seguridad

Toda operación relevante registrará colaborador, módulo, acción, entidad, fecha, IP y resultado cuando corresponda. Ejemplos:

- reserva confirmada;
- horario modificado;
- bloqueo creado;
- pedido actualizado;
- huésped consultado;
- pago aprobado;
- asistente acreditado.

Los permisos de administración de colaboradores no serán heredados automáticamente por roles operativos.

## Plan de implementación

### Etapa 1 — núcleo central

- verificar la migración existente en desarrollo y producción;
- crear helpers comunes de identidad, invitación, sesión y permisos;
- crear pantalla central de colaboradores;
- permitir asignar accesos por módulo sin modificar todavía todos los módulos.

### Etapa 2 — Turnos

- adaptar acceso y sesión de Turnos;
- implementar roles base y permisos de calendario, reservas, disponibilidad y bloqueos;
- limitar recursos e instancias;
- ocultar menús y validar APIs según permisos.

### Etapa 3 — compatibilidad con Resto y Events

- enlazar registros existentes mediante `tags_business_staff_legacy_links`;
- conservar el historial y los permisos actuales;
- migrar progresivamente la autenticación sin duplicar empleados.

### Etapa 4 — Mi Estadía y Store

- aplicar el mismo acceso central;
- definir permisos de huésped, solicitudes, pedidos, catálogo, stock y configuración;
- completar auditoría transversal.

### Etapa 5 — operación y migración

- detectar duplicados por negocio y email;
- ofrecer vinculación manual cuando dos registros no deban fusionarse automáticamente;
- informar accesos heredados y conflictos;
- retirar dependencias antiguas solamente después de verificar cada módulo.

## Criterios de compatibilidad

- No se eliminan inicialmente las tablas de personal existentes.
- No se modifican contratos de Store, Resto, Turnos, Events o Mi Estadía sin adaptar primero sus APIs.
- No se declaran claves foráneas contra tablas legacy sin verificar los tipos reales en desarrollo y producción.
- Los administradores actuales mantienen acceso completo.
- Los colaboradores existentes se vinculan mediante migración controlada, sin perder historial.
- La revocación central debe invalidar sesiones activas del colaborador.

