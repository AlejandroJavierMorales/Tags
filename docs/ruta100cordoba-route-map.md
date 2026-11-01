# Ruta 100 Córdoba — Route map funcional y orden de desarrollo

**Versión:** 1.0  
**Fecha:** 1 de noviembre de 2026  
**Estado:** propuesta para aprobación previa al desarrollo  
**Documentos relacionados:**

- `docs/ruta100cordoba-especificacion-funcional.md`
- `docs/ruta100cordoba-propuesta-institucional.md`
- `docs/Folleto-Ruta-100-1-1.pdf`

## 1. Objetivo

Definir las rutas públicas, administrativas y de API necesarias para construir Ruta 100 Córdoba sin:

- duplicar el directorio de Tags;
- modificar innecesariamente CalamuchitAr;
- mezclar Ruti con Muchi;
- generar URLs ambiguas;
- crear páginas SEO vacías;
- inventar contratos antes de auditar los existentes.

Este documento organiza el desarrollo. No autoriza todavía migraciones, APIs ni componentes.

## 2. Criterios adoptados

### 2.1 Un proyecto multidominio, no una aplicación paralela

`ruta100cordoba.com` seguirá resolviendo dentro de Tags mediante el contexto de canal existente. Las páginas nuevas deberán obtener el sitio desde el hostname público y operar únicamente cuando el código sea `ruta100cordoba`.

### 2.2 URLs públicas limpias

El usuario verá:

```text
https://ruta100cordoba.com/mapa
https://ruta100cordoba.com/localidades/la-cumbrecita
https://ruta100cordoba.com/experiencias/senderismo
```

No verá prefijos técnicos como `/api`, `/modules`, `/site/1` o `/ruta100`.

### 2.3 El directorio existente se conserva

Las siguientes rutas existentes continúan siendo la capa comercial:

- `/directorio`
- `/directorio/[slug]`
- `/directorio/prestador/[slug]`
- `/publicar-mi-negocio`
- `/programas-de-fidelizacion`
- `/beneficios`

Las páginas territoriales enlazarán resultados del directorio. No se crearán copias de comercios dentro de tramos, experiencias o localidades.

### 2.4 Páginas públicas renderizadas en servidor

Localidades, experiencias, tramos, lugares e itinerarios editoriales deben ser páginas indexables renderizadas por servidor. Las APIs públicas se reservarán para interacciones dinámicas como mapa, cercanía, planificación, guardado o Ruti.

### 2.5 Acceso condicionado por sitio

Toda ruta exclusiva de Ruta 100 deberá:

1. resolver el hostname mediante el contexto existente;
2. comprobar `site.code === "ruta100cordoba"`;
3. devolver `notFound()` fuera de ese sitio, salvo que en el futuro se generalice expresamente;
4. generar canonical usando el dominio público resuelto;
5. impedir que contenido de otro directorio ingrese en consultas o sitemaps.

## 3. Auditoría de colisiones actuales

| Ruta propuesta | Estado actual | Decisión |
|---|---|---|
| `/` | En Ruta 100 actualmente termina utilizando la portada del directorio | Evolucionar esa portada por contexto, sin cambiar CalamuchitAr |
| `/directorio` | Existe y funciona | Conservar |
| `/mapa` | Existe y utiliza puntos del directorio/IA de destino | Extender por sitio; no duplicar |
| `/ruti` | Existe | Conservar y conectar gradualmente con herramientas territoriales |
| `/eventos/[slug]` | Existe como ruta pública general | No usar como raíz territorial nueva |
| `/experiencia` | Existe | No reutilizar para las diez experiencias |
| `/experiencias-digitales` | Existe como producto comercial | No modificar |
| `/alojamientos` | Existe | Conservar como acceso comercial/turístico |
| `/actividades-turisticas` | Existe | Conservar hasta definir posible integración con experiencias |
| `/[directorySlug]` | Captura páginas públicas de prestadores | Las rutas estáticas nuevas tendrán precedencia; revisar slugs reservados |

### Slugs reservados

Los siguientes nombres no podrán asignarse como slug raíz de un prestador:

```text
agenda
experiencias
itinerarios
localidades
lugares
mapa
planificar
recorrido
ruti
servicios-en-ruta
tramos
```

Antes de implementar se deberá revisar si alguno está usado actualmente por una página pública y definir una migración o excepción sin romper URLs existentes.

## 4. Route map público definitivo

## 4.1 Navegación primaria

| URL | Nombre visible | Función | Fase |
|---|---|---|---|
| `/` | Inicio | Portada narrativa, resumen del recorrido y accesos principales | 1 |
| `/mapa` | Mapa | Exploración geográfica por capas | 1–2 |
| `/recorrido` | Recorrido | Presentación de los 536 km, tramos y etapas | 1 |
| `/experiencias` | Experiencias | Índice de las diez propuestas | 1 |
| `/localidades` | Localidades | Índice territorial del corredor | 1 |
| `/planificar` | Planificá tu viaje | Constructor de itinerarios | 3 |
| `/agenda` | Agenda | Eventos vigentes a lo largo del recorrido | 2 |
| `/directorio` | Prestadores | Buscador comercial existente | existente |
| `/ruti` | Ruti | Guía virtual de Ruta 100 | existente / 3 |

### Navegación secundaria

| URL | Función | Fase |
|---|---|---|
| `/lugares` | Índice de lugares y atractivos | 2 |
| `/itinerarios` | Recorridos editoriales listos para usar | 2 |
| `/servicios-en-ruta` | Servicios esenciales para el viajero | 2 |
| `/publicar-mi-negocio` | Alta de prestadores | existente |
| `/beneficios` | Beneficios vigentes | existente |
| `/programas-de-fidelizacion` | Programas comerciales | existente |

## 4.2 Portada `/`

### URL pública

`https://ruta100cordoba.com/`

### Responsabilidades

- presentar la propuesta Ruta 100;
- mostrar el corredor de forma resumida;
- enlazar mapa, recorrido, experiencias y localidades;
- ofrecer búsqueda general;
- mostrar itinerarios, localidades y eventos destacados;
- dar acceso a Ruti;
- conservar acceso al directorio y publicación de negocios;
- generar metadata exclusiva del dominio.

### Implementación prevista

La resolución actual de la raíz deberá conservarse para `calamuchita.ar`. Para Ruta 100 se adaptará la portada del directorio o se extraerá una composición específica reutilizando sus componentes. La decisión de archivo se tomará después de revisar la guía de la versión instalada de Next.js y el Worker vigente.

## 4.3 Recorrido

### Índice

`/recorrido`

Contenido:

- presentación del corredor;
- mapa simplificado;
- extremos;
- tramos ordenados;
- etapas sugeridas;
- información práctica;
- preguntas frecuentes;
- enlaces a mapa y planificador.

### Detalle de tramo

`/tramos/[slug]`

Ejemplo conceptual:

`/tramos/cruz-del-eje-capilla-del-monte`

Contenido:

- origen y destino;
- distancia y duración verificadas;
- geometría;
- localidades y paradas;
- experiencias;
- lugares;
- servicios esenciales;
- continuidad anterior/siguiente;
- fuente y fecha de actualización.

### Índice opcional visible

`/tramos`

Se implementará si aporta navegación propia. Si `/recorrido` resuelve completamente el índice, `/tramos` redirigirá permanentemente a `/recorrido` para evitar duplicación SEO.

## 4.4 Localidades

### Índice

`/localidades`

Funciones:

- explorar por nombre, tramo, región o experiencia;
- alternar lista y mapa;
- destacar destinos emergentes sin ocultar los consolidados;
- mostrar estado de contenido sin indexar páginas incompletas.

### Detalle

`/localidades/[slug]`

Ejemplo:

`/localidades/cruz-del-eje`

Subsecciones internas mediante anclas, no rutas nuevas en la primera fase:

```text
#que-conocer
#experiencias
#agenda
#donde-dormir
#donde-comer
#servicios
#mapa
```

Esto evita multiplicar páginas finas. Solo se crearán subrutas cuando exista contenido suficiente y una necesidad SEO comprobada.

## 4.5 Experiencias

### Índice

`/experiencias`

### Detalle

`/experiencias/[slug]`

Slugs iniciales normalizados:

```text
turismo-naturaleza
turismo-deportivo
caminos-del-vino
camino-de-brochero
turismo-cultural
senderismo
golf
turismo-religioso
ruta-motorhome
parques-y-aventuras
```

Cada página relacionará localidades, tramos, lugares, actividades, eventos e integrantes del directorio. No se crearán categorías comerciales duplicadas para representar estas experiencias.

## 4.6 Lugares y atractivos

### Índice

`/lugares`

Filtros:

- experiencia;
- localidad;
- tramo;
- tipo de lugar;
- accesibilidad;
- dificultad, cuando aplique.

### Detalle

`/lugares/[slug]`

El slug deberá ser único dentro del sitio. Si aparecen colisiones reales, se resolverán mediante slug editorial y no agregando identificadores internos visibles salvo necesidad.

## 4.7 Itinerarios

### Índice editorial

`/itinerarios`

### Detalle editorial

`/itinerarios/[slug]`

Ejemplos conceptuales:

```text
/itinerarios/ruta-100-en-7-dias
/itinerarios/fin-de-semana-en-familia
/itinerarios/ruta-100-en-motorhome
```

### Planificador

`/planificar`

Estados internos mediante query string o estado de sesión:

```text
/planificar?origen=cruz-del-eje&dias=3&experiencia=senderismo
```

No se indexarán combinaciones de parámetros.

### Viaje compartido

`/viaje/[shareToken]`

Fase 3. El token será aleatorio y no revelará IDs secuenciales. La página compartida tendrá `noindex` por defecto y no expondrá datos personales.

## 4.8 Agenda

### Índice

`/agenda`

Se elige `/agenda` para evitar colisiones con las rutas de eventos ya existentes.

### Detalle

`/agenda/[slug]`

Los eventos de prestadores que ya se publiquen mediante la infraestructura existente podrán enlazarse, pero no se duplicarán registros sin una relación explícita.

### Histórico

Los eventos vencidos podrán conservarse administrativamente. Públicamente se decidirá por evento si permanecen accesibles; no deberán aparecer como próximos.

## 4.9 Servicios en ruta

### Índice

`/servicios-en-ruta`

Funciones:

- estaciones de servicio;
- carga eléctrica;
- talleres y gomerías;
- salud y farmacias;
- seguridad y emergencias;
- cajeros y abastecimiento;
- infraestructura para motorhomes.

En la primera versión no se crearán páginas SEO individuales para cada servicio esencial salvo que sea también un prestador publicado o exista contenido público suficiente.

## 4.10 Directorio

Se conservan sin redefinir contratos:

```text
/directorio
/directorio/[slug]
/directorio/prestador/[slug]
/alojamientos
/donde-comer
/actividades-turisticas
/regalos-artesanias-regionales
/publicar-mi-negocio
```

La navegación territorial construirá enlaces hacia estas rutas con filtros. Cuando sea posible, se utilizarán identificadores estables y URLs amigables sin romper los parámetros actuales.

## 4.11 Ruti

### Página

`/ruti`

### Acciones profundas

Ruti deberá poder devolver enlaces públicos como:

```text
/mapa?experiencia=senderismo&localidad=la-cumbre
/localidades/la-cumbre
/lugares/[slug]
/planificar?dias=3&experiencia=turismo-naturaleza
/directorio?q=bodega
```

La conversación no debe incrustar páginas completas dentro del chat. Las acciones abrirán la ruta correspondiente conservando el dominio público.

## 5. Route map administrativo

## 5.1 Criterio de ubicación

La administración territorial pertenecerá al administrador del directorio, no al panel de un negocio individual. Se propone extender:

`/dashboard/directory`

con un área específica:

`/dashboard/directory/ruta100`

No se creará un dashboard independiente ni un nuevo sistema de autenticación.

## 5.2 Rutas administrativas propuestas

| URL | Función | Fase |
|---|---|---|
| `/dashboard/directory/ruta100` | Resumen y estado editorial | 1 |
| `/dashboard/directory/ruta100/corredor` | Datos generales y trazado | 1 |
| `/dashboard/directory/ruta100/tramos` | Listado y orden de tramos | 1 |
| `/dashboard/directory/ruta100/tramos/[id]` | Edición de tramo | 1 |
| `/dashboard/directory/ruta100/localidades` | Cobertura territorial | 1 |
| `/dashboard/directory/ruta100/localidades/[id]` | Edición editorial | 1 |
| `/dashboard/directory/ruta100/experiencias` | Diez experiencias | 1 |
| `/dashboard/directory/ruta100/experiencias/[id]` | Edición de experiencia | 1 |
| `/dashboard/directory/ruta100/lugares` | Lugares y atractivos | 2 |
| `/dashboard/directory/ruta100/lugares/[id]` | Edición integral | 2 |
| `/dashboard/directory/ruta100/itinerarios` | Itinerarios editoriales | 2 |
| `/dashboard/directory/ruta100/itinerarios/[id]` | Editor de días y paradas | 2 |
| `/dashboard/directory/ruta100/agenda` | Eventos territoriales | 2 |
| `/dashboard/directory/ruta100/servicios` | Servicios esenciales | 2 |
| `/dashboard/directory/ruta100/fuentes` | Fuentes, revisiones y vencimientos | 1–2 |
| `/dashboard/directory/ruta100/destacados` | Portada y destacados | 1 |
| `/dashboard/directory/ruta100/seo` | Cobertura e indexación | 1 |
| `/dashboard/directory/ruta100/ruti` | Cobertura, preguntas y auditoría | 3 |
| `/dashboard/directory/ruta100/analitica` | Métricas territoriales | 3–5 |
| `/dashboard/directory/ruta100/pasaporte` | QR, sellos y desafíos | 4 |
| `/dashboard/directory/ruta100/configuracion` | Ajustes del proyecto | 1 |

## 5.3 Diseño de navegación administrativa

Para evitar una barra inmanejable, la navegación se agrupará:

```text
Resumen
Territorio
  Corredor
  Tramos
  Localidades
Contenido
  Experiencias
  Lugares
  Itinerarios
  Agenda
  Servicios
Publicación
  Destacados
  Fuentes y revisión
  SEO
Inteligencia
  Ruti
  Analítica
Participación
  Pasaporte
Configuración
```

En móvil se utilizará un selector o drawer, no una hilera horizontal de solapas.

## 6. Route map de APIs

## 6.1 Convención

Las capacidades nuevas se incorporarán debajo del módulo de directorio existente:

```text
/api/directory/admin/ruta100/...
/api/directory/public/ruta100/...
```

Esto evita inventar un servicio paralelo y deja explícita la pertenencia al directorio territorial.

## 6.2 APIs administrativas — fase 1

| Endpoint | Métodos previstos | Función |
|---|---|---|
| `/api/directory/admin/ruta100/bootstrap` | GET | Contexto, permisos, catálogos y resumen |
| `/api/directory/admin/ruta100/corridor` | GET, PATCH | Datos generales y trazado |
| `/api/directory/admin/ruta100/segments` | GET, POST, PATCH, DELETE | Tramos |
| `/api/directory/admin/ruta100/localities` | GET, PATCH | Extensión editorial de lugares existentes |
| `/api/directory/admin/ruta100/experiences` | GET, POST, PATCH | Experiencias |
| `/api/directory/admin/ruta100/features` | GET, PATCH | Destacados y orden de portada |
| `/api/directory/admin/ruta100/sources` | GET, POST, PATCH, DELETE | Fuentes y revisiones |
| `/api/directory/admin/ruta100/publication` | POST | Publicar, despublicar o enviar a revisión |
| `/api/directory/admin/ruta100/seo` | GET, PATCH | Metadata y diagnóstico editorial |

Los métodos exactos se confirmarán contra el estilo actual de las APIs y la versión instalada de Next.js antes de implementar.

## 6.3 APIs administrativas — fases posteriores

```text
/api/directory/admin/ruta100/attractions
/api/directory/admin/ruta100/itineraries
/api/directory/admin/ruta100/events
/api/directory/admin/ruta100/road-services
/api/directory/admin/ruta100/reviews-due
/api/directory/admin/ruta100/analytics
/api/directory/admin/ruta100/passport
```

No se utilizará un endpoint genérico que acepte nombres de tabla o SQL desde el navegador.

## 6.4 APIs públicas interactivas

| Endpoint | Función | Fase |
|---|---|---|
| `/api/directory/public/ruta100/map` | Datos de mapa por viewport y filtros | 1–2 |
| `/api/directory/public/ruta100/nearby` | Lugares cercanos con consentimiento | 2 |
| `/api/directory/public/ruta100/planner/options` | Opciones válidas del planificador | 3 |
| `/api/directory/public/ruta100/planner/quote` | Propuesta determinística de recorrido | 3 |
| `/api/directory/public/ruta100/trips` | Guardar o recuperar viaje mediante sesión/token | 3 |
| `/api/directory/public/ruta100/passport` | Consultar y registrar interacciones QR | 4 |

### Contenido SEO

Las páginas públicas no deberán depender de estas APIs para entregar a buscadores el título, descripción y contenido principal.

## 6.5 IA

Se conservará la infraestructura actual:

`/api/ai/chat`

La ampliación prevista será mediante herramientas del dominio y contexto de sitio, no mediante una segunda API de chat exclusiva de Ruti.

Herramientas conceptuales futuras:

- buscar corredor y tramos;
- buscar localidades;
- buscar lugares y atractivos;
- buscar experiencias;
- buscar prestadores y productos;
- calcular ruta/distancia con proveedor autorizado;
- proponer itinerario;
- abrir mapa filtrado.

## 7. Sitemap, indexación y aliases

## 7.1 Sitemaps por colección

El generador existente se extenderá por sitio para producir:

```text
sitemap principal
├── páginas estáticas
├── localidades
├── experiencias
├── tramos
├── lugares
├── itinerarios
├── agenda vigente/indexable
└── prestadores publicados
```

No se incorporarán:

- búsquedas parametrizadas;
- mapas filtrados;
- planes personales;
- contenido en borrador;
- contenido sin cobertura mínima;
- eventos que no deban conservarse públicamente.

## 7.2 Canonical

Cada página deberá generar canonical con `https://ruta100cordoba.com`, aunque la aplicación se ejecute físicamente en Tags.

## 7.3 Redirecciones

- `www.ruta100cordoba.com` → `ruta100cordoba.com` mediante redirección permanente en la capa pública.
- variantes de slug anteriores → slug canónico mediante registro explícito, no heurísticas peligrosas;
- `/tramos` → `/recorrido` solamente si no se implementa un índice independiente;
- no redirigir URLs inexistentes a la portada: deben devolver 404.

## 8. Jerarquía de navegación pública

### Escritorio

```text
Inicio | Mapa | Recorrido | Experiencias | Localidades | Planificá | Prestadores | Ruti
```

Los accesos menos frecuentes quedarán en menú secundario:

```text
Agenda | Lugares | Servicios en ruta | Beneficios | Publicar mi negocio
```

### Móvil

Navegación principal reducida:

```text
Inicio | Mapa | Planificá | Buscar | Ruti
```

El resto estará en drawer. Ruti no debe tapar acciones, avisos legales ni contenido final.

## 9. Mapa de relaciones entre rutas

```text
Inicio
├── Mapa
│   ├── Tramo
│   ├── Localidad
│   ├── Lugar
│   └── Prestador
├── Recorrido
│   └── Tramo
│       ├── Localidad
│       ├── Experiencia
│       ├── Lugar
│       └── Servicios en ruta
├── Experiencias
│   └── Experiencia
│       ├── Localidad
│       ├── Lugar
│       ├── Itinerario
│       └── Prestador
├── Localidades
│   └── Localidad
│       ├── Lugar
│       ├── Agenda
│       ├── Itinerario
│       └── Directorio filtrado
├── Planificar
│   └── Viaje compartido
├── Directorio
│   └── Prestador
└── Ruti
    └── cualquiera de las rutas anteriores
```

## 10. Orden concreto de implementación

## Bloque 0 — comprobaciones previas

1. Leer documentación de la versión instalada de Next.js para routing, metadata, caché y handlers.
2. Auditar Worker y resolución de la raíz de `ruta100cordoba.com`.
3. Verificar slugs reservados contra páginas existentes.
4. Auditar modelo geográfico, contenidos turísticos y permisos.
5. Conseguir trazado y listado oficial de localidades.
6. Definir SQL exacto y pedir aprobación antes de ejecutarlo.

## Bloque 1 — esqueleto público sin datos falsos

1. Contexto y guard de sitio reutilizable.
2. Navegación Ruta 100.
3. `/recorrido`.
4. `/experiencias` y detalle.
5. `/localidades` y detalle.
6. Portada Ruta 100.
7. Metadata y sitemap.
8. Estados vacío, borrador, no publicado y 404.

## Bloque 2 — administración territorial

1. Resumen.
2. Corredor.
3. Tramos.
4. Localidades.
5. Experiencias.
6. Fuentes y publicación.
7. Destacados.
8. SEO.

## Bloque 3 — mapa

1. Trazado.
2. Tramos.
3. Localidades.
4. Filtros de experiencias.
5. Integración con lugares y prestadores.
6. Panel móvil.
7. URLs compartibles.

## Bloque 4 — contenido ampliado

1. Lugares y atractivos.
2. Servicios en ruta.
3. Itinerarios editoriales.
4. Agenda.
5. Integraciones del directorio.

## Bloque 5 — planificador y Ruti

1. Reglas y opciones.
2. Planificador determinístico.
3. Guardado y uso compartido.
4. Herramientas de Ruti.
5. Auditoría de respuestas.
6. Pruebas de relevancia, evidencia y aislamiento.

## Bloque 6 — pasaporte y analítica institucional

1. QR y puntos participantes.
2. Sellos y desafíos.
3. Beneficios.
4. Tableros agregados.
5. Exportaciones autorizadas.

## 11. Primera entrega de desarrollo propuesta

La primera entrega implementable deberá limitarse a:

- contexto aislado de Ruta 100;
- navegación pública definitiva;
- portada inicial;
- `/recorrido`;
- `/experiencias` y sus diez páginas;
- `/localidades` y fichas habilitadas;
- administración mínima de esos contenidos;
- fuentes, publicación y SEO;
- sitemap específico;
- pruebas de no regresión sobre `calamuchita.ar`.

El mapa avanzado, planificador, Ruti territorial y pasaporte no deben incluirse de forma simulada en esta entrega. Pueden mostrarse como “próximamente” solo si existe una decisión explícita de producto; preferentemente se ocultarán hasta ser funcionales.

## 12. Pruebas obligatorias por bloque

### Multidominio

- Ruta 100 muestra únicamente su identidad y contenido.
- CalamuchitAr conserva exactamente sus rutas actuales.
- Tags conserva administración y APIs.
- las URLs públicas nunca saltan a `tags.com.ar`.

### SEO

- canonical correcto;
- metadata propia;
- sitemap sin cruces de sitio;
- 404 real para contenido inexistente;
- `noindex` para borradores y viajes personales;
- datos estructurados válidos.

### Seguridad

- administración autenticada;
- permisos por acción;
- `site_id` resuelto en servidor;
- APIs públicas sin IDs arbitrarios como autoridad;
- publicación y despublicación auditadas.

### Funcionalidad

- navegación entre entidades;
- filtros persistentes y compartibles;
- estados vacíos claros;
- contenido despublicado inaccesible;
- enlaces a prestadores correctos;
- comportamiento móvil.

### No regresión

- portada y buscador de CalamuchitAr;
- Muchi;
- páginas de prestadores;
- autenticación y magic links;
- recursos estáticos y APIs a través del Worker.

## 13. Decisiones que deben cerrarse antes del SQL

1. Listado oficial de localidades incluidas.
2. Fuente y formato de la geometría del corredor.
3. División oficial o editorial de tramos.
4. Si municipios tendrán acceso directo o flujo de propuestas.
5. Reglas mínimas para indexar una localidad.
6. Alcance editorial inicial de lugares y atractivos.
7. Licencias de imágenes y mapas.
8. Responsables de validación.
9. Política para eventos provenientes de prestadores.
10. Selección del territorio piloto, si se adopta un piloto.

## 14. Próximo paso autorizado por este route map

Una vez aprobado, el siguiente trabajo será el **Bloque 0**: auditoría técnica puntual y diseño lógico de datos. El resultado deberá incluir:

- archivos existentes a reutilizar;
- componentes nuevos necesarios;
- contratos de datos;
- propuesta SQL exacta;
- matriz de permisos;
- wireframes de las primeras rutas;
- plan de reversibilidad;
- pruebas de no regresión.

No se iniciará una migración ni se crearán endpoints hasta recibir aprobación sobre ese diseño.

