# Tags Fidelización
## Especificación funcional y técnica del MVP escalable — base para implementación en Codex

**Objetivo:** construir un addon genérico, vendible e independiente de CalamuchitAr, capaz de funcionar en cualquier `business` de Tags y, simultáneamente, operar como red de fidelización dentro de un Directorio.

> **REGLA CENTRAL:** implementar un MVP simple y comercial sin cerrar el modelo. Todo lo que se construya debe permitir agregar niveles, campañas, automatizaciones, referidos, QR dinámico, integraciones y eventualmente puntos compartidos sin rehacer el núcleo.

## 1. Principios obligatorios de implementación

- El módulo debe ser **Tags Fidelización / Loyalty** y existir como addon asignable a cualquier `business`.
- **CalamuchitAr Beneficios** es una implementación de red sobre el mismo motor; no hardcodear el producto para `calamuchita.ar`.
- Una misma persona debe tener una identidad única de fidelización y poder participar en múltiples programas.
- Cada negocio mantiene inicialmente su propia economía: puntos, sellos, visitas y recompensas **NO son transferibles entre comercios**.
- La red puede ofrecer beneficios de membresía generales sin puntos.
- El historial debe ser auditable. No cambiar saldo sin registrar la transacción que lo origina.
- MVP: **manual + QR primero**. Store/Resto/Stay/otros quedan preparados para integración posterior.
- No implementar cashback monetario, niveles, campañas, referidos, automatizaciones, QR dinámico ni puntos compartidos en V1.
- No duplicar usuarios, negocios, addons, autenticación, branding, canales ni estructuras existentes.

### Reglas de trabajo para Codex

1. Antes de crear tablas, rutas, APIs o componentes, inspeccionar el proyecto existente.
2. No inventar nombres de tablas/campos/APIs si ya existe una estructura equivalente.
3. Revisar `tags_addons`, `tags_business_addons`, `tags_businesses`, autenticación, Directorios/canales, Store, Resto, Reviews y sistemas de usuarios/contactos.
4. No romper compatibilidad.
5. Bootstrap sólo para layout; identidad visual con el sistema actual y variables `--qr-*`.
6. No crear CSS paralelo innecesario ni componentes duplicados.
7. Todo archivo conserva encabezado con ruta y descripción.
8. Definir migraciones sólo después de confirmar el esquema real.
9. No hardcodear `calamuchita.ar` en el motor Loyalty.

## 2. Productos

### Tags Fidelización
Addon transversal para cualquier comercio, alojamiento, restaurante, prestador, tienda o servicio. Permite crear un programa propio, gestionar miembros, acreditar operaciones, emitir recompensas, registrar canjes e historial.

### CalamuchitAr Beneficios
Primera implementación de red. Una persona se registra una vez y utiliza la misma identidad/QR en todos los comercios adheridos. Cada comercio conserva su programa independiente.

Ruta pública propuesta:
```text
calamuchita.ar/beneficios
```

## 3. MVP V1

**Incluye**
- Addon por business.
- Identidad única del miembro.
- Puntos.
- Sellos.
- Visitas.
- Recompensas.
- Beneficios de membresía.
- QR personal.
- Acreditación manual.
- Escaneo QR.
- Canjes.
- Auditoría.
- Métricas básicas.
- Red/Directorio.

**No incluye todavía**
- Puntos transferibles.
- Cashback.
- Niveles.
- Campañas.
- Referidos.
- Automatizaciones WhatsApp/email.
- QR dinámico.
- Wallet.
- Conciliación entre negocios.
- Puntos globales de red.
- Segmentación avanzada.

## 4. Mecánicas

### Puntos
```text
Cada $1.000 = 10 puntos
500 puntos -> 10% descuento
1.000 puntos -> producto/servicio gratis
```

### Sellos
```text
Cada consumo válido = 1 sello
10 sellos = premio
```

### Visitas
```text
3 visitas -> 10% descuento
5 visitas -> beneficio especial
```

Cada programa selecciona una modalidad principal. La lógica de cálculo debe centralizarse en un servicio reutilizable.

## 5. Recompensas

Tipos iniciales:
- porcentaje de descuento;
- monto fijo;
- producto gratis;
- servicio gratis;
- beneficio personalizado.

La recompensa está desacoplada de la mecánica que la dispara.

## 6. Identidad única del consumidor

No crear una cuenta por comercio. Reutilizar una entidad de consumidor/contacto existente si el proyecto ya la posee.

Ejemplo:
```text
MI FIDELIZACIÓN

Cabañas Ecos del Valle
1.250 puntos

Restaurante X
7 / 10 sellos

Excursiones Y
3 visitas
```

## 7. QR del miembro

El QR representa al **miembro**, no al comercio.

```text
CLIENTE muestra QR
       ↓
COMERCIO escanea
       ↓
Tags identifica miembro
       ↓
empleado carga importe / sello / visita
       ↓
CONFIRMAR
       ↓
transacción + saldo + recompensa
```

V1: sólo usuarios autenticados del comercio pueden acreditar.

## 8. Dashboard del comercio

```text
FIDELIZACIÓN
├── Resumen
├── Clientes
├── Acreditar
├── Recompensas
├── Movimientos
└── Configuración
```

### Resumen
Miembros, activos, emisión, recompensas disponibles/canjeadas, actividad reciente.

### Clientes
Listado buscable + saldo/progreso + recompensa + última actividad.

### Acreditar
QR o búsqueda manual.

### Recompensas
CRUD simple.

### Movimientos
Ledger filtrable. No borrar para corregir: revertir/compensar.

### Configuración
Tipo de programa + regla principal.

## 9. Experiencia consumidor

```text
CALAMUCHITAR BENEFICIOS

Hola, Juan
[ MI QR ]

MIS BENEFICIOS
- Ecos del Valle: 1.250 puntos
- Café X: 7/10 sellos
- Excursiones Y: 3 visitas

RECOMPENSAS
BENEFICIOS DE LA RED
COMERCIOS ADHERIDOS
```

En Directorio usar branding, dominio, logo y colores del canal. No duplicar themes.

## 10. Capa Directorio/red

Responsabilidades:
- adhesión de businesses;
- métricas agregadas;
- beneficios generales de membresía;
- comercios adheridos;
- branding del Directorio.

No hace:
- transferencias de puntos;
- canjes cruzados;
- conciliación económica;
- alteración opaca de balances locales.

## 11. Beneficios de membresía

Función V1 separada de puntos/sellos/visitas.

```text
Ecos del Valle -> 10% para miembros
Restaurante X -> copa de bienvenida
Excursiones Y -> 15% lunes a jueves
```

Un business puede participar en la red sólo mediante beneficios aunque no use acumulación.

## 12. Modelo conceptual

**NO crear estas tablas sin revisar primero el esquema real.**

Responsabilidades conceptuales:
- `loyalty_programs`
- `loyalty_members`
- `loyalty_accounts`
- `loyalty_transactions`
- `loyalty_rewards`
- `loyalty_redemptions`
- `network_benefits`

### Ledger obligatorio
Todo cambio debe generar una transacción:
```text
CREDIT_POINTS
DEBIT_POINTS
ADD_STAMP
REMOVE_STAMP
ADD_VISIT
REMOVE_VISIT
REDEEM
ADJUSTMENT
REVERSAL
```

Puede existir saldo materializado en account por rendimiento, pero el ledger es la fuente auditable. Actualización + movimiento deben ser atómicos.

## 13. Hooks para integraciones futuras

Preparar `source` / `reference` para:
```text
manual
qr
store
resto
stay
reviews
admin
campaign
referral
```

Reviews sólo puede premiar participación neutral, nunca una review positiva.

## 14. Futuro sin rehacer núcleo

Preparar arquitectura para:
- niveles;
- campañas;
- email/WhatsApp;
- referidos;
- QR dinámico;
- integraciones automáticas;
- puntos compartidos de red como capa económica separada.

## 15. Seguridad e integridad

- Validar addon y permisos.
- Cliente no autoacredita.
- Guardar `performed_by`.
- Idempotencia para integraciones automáticas.
- Operaciones de saldo atómicas.
- No permitir saldo negativo salvo regla futura explícita.
- No borrar movimientos; compensar.
- Scope estricto por business.
- Directorio no filtra datos privados entre businesses.

## 16. Addon

Integrar con el mecanismo real de addons:
- registrar Loyalty según patrón existente;
- asignar por business;
- mostrar dashboard sólo si corresponde;
- adhesión a red como relación adicional;
- no agregar flags redundantes si addons ya resuelve habilitación.

## 17. APIs y rutas

Los siguientes son **responsabilidades**, no paths definitivos:

**Admin business**
- get/save programa;
- listar/detalle miembros;
- acreditar;
- movimientos;
- CRUD recompensas;
- canje.

**Consumidor**
- identidad/perfil;
- programas/saldos;
- QR/token;
- recompensas;
- movimientos;
- beneficios de red;
- comercios.

**Directorio**
- adhesiones;
- métricas;
- CRUD beneficios de membresía.

## 18. Flujo mínimo vendible

### Comercio
1. Configura programa.
2. Selecciona Puntos/Sellos/Visitas.
3. Crea recompensas.
4. Busca/escanea miembro.
5. Acredita.
6. Sistema actualiza progreso y libera recompensas.
7. Canje.
8. Historial/métricas.

### Consumidor
1. Una identidad.
2. QR personal.
3. Múltiples programas.
4. Saldos/progresos.
5. Recompensas.
6. Beneficios de red.
7. Comercios adheridos.

### Directorio
1. Adhiere businesses.
2. Beneficios de membresía.
3. Métricas agregadas.
4. Branding propio.

## 19. Criterios de aceptación

- Business con addon puede configurar Points/Stamps/Visits.
- Miembro pertenece a múltiples programas sin duplicar identidad.
- QR o búsqueda identifica al miembro.
- Acreditación crea transacción y actualiza saldo/progreso de forma atómica.
- Recompensa disponible y canjeable.
- Canje auditable.
- Saldos independientes entre comercios.
- Directorio muestra comercios y beneficios.
- CalamuchitAr usa el motor genérico.
- El módulo funciona también fuera de CalamuchitAr.
- No rompe Store, Resto, Reviews, QR-Page, Tags ID, autenticación ni addons.
- UI respeta themes actuales.
- El modelo permite sources automáticos/niveles/campañas sin rehacer account/ledger.

## 20. Orden de implementación

1. Relevar addons, businesses, usuarios/contactos, Directorios, roles y auth.
2. Definir modelo físico reutilizando entidades reales.
3. Migración mínima.
4. Registrar addon.
5. Servicios de dominio: programa, account, ledger, acreditación, recompensas y canjes.
6. APIs admin.
7. Dashboard.
8. Identidad + QR.
9. Portal consumidor.
10. Capa Directorio/red.
11. Configurar CalamuchitAr Beneficios.
12. E2E con dos negocios + un mismo miembro.
13. Regresión módulos existentes.
14. Documentar hooks futuros.

## 21. Escenario obligatorio

```text
Miembro: Juan

Programa A: Ecos del Valle
type: points
$1.000 = 10
Compra $50.000 -> +500

Programa B: Café X
type: stamps
7/10

Programa C: Excursiones Y
type: visits
3 visitas
```

Juan:
- una identidad;
- tres cuentas;
- un QR;
- no transfiere puntos;
- ve recompensas locales y beneficios CalamuchitAr.

Cada comercio administra sólo su programa.
El Directorio administra adhesión/beneficios/métricas, no balances locales.

## 22. Definición comercial

**Tags Fidelización**  
“Convertí compradores en clientes frecuentes.”

V1:
- puntos;
- sellos;
- visitas;
- QR;
- acreditación móvil;
- recompensas;
- canjes;
- historial;
- clientes;
- estadísticas básicas;
- beneficios de membresía para redes.

**CalamuchitAr Beneficios**  
Una sola cuenta y un solo QR para programas y beneficios de múltiples comercios del Valle, manteniendo independiente la economía de cada prestador.

## 23. Instrucción final para Codex

**No comenzar generando código en masa.** Primero relevar el proyecto real y devolver un mapa concreto de integración:
- archivos existentes a reutilizar/modificar;
- tablas confirmadas;
- migraciones necesarias;
- rutas existentes;
- permisos;
- componentes reutilizables.

Si falta información o hay una duda que pueda romper funcionalidad actual, preguntar antes de inventar.

Luego implementar el MVP completo de forma incremental y coherente, sin parches temporales, preservando compatibilidad y dejando el núcleo preparado para niveles, campañas, integraciones automáticas, referidos, QR dinámico y una eventual economía de red.
