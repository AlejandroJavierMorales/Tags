# Tags Directory Network

**Fecha:** 5 de agosto de 2026  
**Estado:** propuesta funcional y técnica inicial  
**Primer canal a migrar:** CalamuchitAr

## 1. Visión general

Tags Directory Network será el núcleo común para administrar directorios de comercios, profesionales, servicios, alojamientos, atractivos y otras organizaciones desde una única plataforma.

La misma aplicación, el mismo código y la misma base operativa podrán publicar experiencias diferentes según el dominio o subdominio desde el que ingrese el visitante.

Ejemplos:

- `tags.com.ar`: plataforma comercial Tags y directorio general sin limitación geográfica.
- `calamuchita.ar`: directorio regional CalamuchitAr, conservando su marca y sus rutas históricas.
- `punilla.tags.com.ar`: directorio del Valle de Punilla.
- `traslasierra.tags.com.ar`: directorio de Traslasierra.
- `cordoba.tags.com.ar`: directorio de Córdoba capital.

Para el visitante, cada canal se comportará como una plataforma independiente. Para la administración y el mantenimiento será un solo sistema.

```text
Tags Directory Core
├── tags.com.ar
├── calamuchita.ar
├── punilla.tags.com.ar
├── traslasierra.tags.com.ar
└── cordoba.tags.com.ar
```

## 2. Objetivo principal

Migrar la funcionalidad pública útil del directorio CalamuchitAr a Tags, preservando especialmente:

- información de los comercios y prestadores;
- logos, imágenes y galerías;
- rubros y ubicación;
- rutas públicas indexadas;
- posicionamiento SEO;
- contenido público que siga siendo relevante;
- acceso administrativo de los clientes que corresponda.

La administración anterior de CalamuchitAr será reemplazada por el dashboard de clientes de Tags. No se busca migrar indiscriminadamente todas las funciones históricas.

## 3. Una plataforma, múltiples canales

La aplicación resolverá la experiencia pública a partir del dominio de la petición.

Cada canal podrá configurar independientemente:

- dominio o subdominio;
- nombre y marca;
- logo y favicon;
- colores y theme;
- encabezado y footer;
- página inicial;
- ámbito geográfico;
- rubros disponibles;
- buscador y filtros;
- comercios destacados;
- espacios publicitarios;
- estructura de rutas;
- metadatos SEO;
- contenido institucional;
- reglas de publicación.

No se crearán copias del negocio para cada canal. Un único negocio podrá publicarse en uno o varios directorios.

```text
Negocio: Excursiones Córdoba
├── Tags general
├── CalamuchitAr
├── Punilla
└── Córdoba capital
```

## 4. Diferencia entre canal, territorio y publicación

El modelo debe separar claramente estos conceptos:

### Canal

Es una experiencia pública completa, por ejemplo CalamuchitAr o Punilla Tags.

### Dominio

Es la dirección desde la que se publica el canal, por ejemplo `calamuchita.ar` o `punilla.tags.com.ar`.

### Territorio

Es la región o conjunto de localidades alcanzadas por el canal.

### Marca

Es la identidad visual y editorial del canal.

### Publicación

Es la relación entre una ficha de negocio y un canal determinado. Define si aparece, con qué ruta, prioridad, estado y configuración SEO.

## 5. Negocios y fichas públicas

Cada comercio o prestador migrado se convertirá en:

- un negocio de `tags_businesses`;
- una ficha dentro del directorio;
- una QR-Page predeterminada;
- una publicación en CalamuchitAr cuando corresponda;
- opcionalmente una publicación en Tags u otros canales;
- un conjunto de addons según lo contratado.

La ficha pública podrá incluir:

- nombre comercial;
- logo y portada;
- descripción breve y completa;
- galería;
- dirección;
- coordenadas y mapa;
- teléfonos;
- WhatsApp;
- email;
- sitio web;
- redes sociales;
- horarios;
- rubros;
- características;
- área de cobertura;
- botones de contacto y cómo llegar.

La QR-Page será la presencia inicial autoadministrable. Luego el negocio podrá contratar addons sin cambiar su identidad ni perder sus rutas.

## 6. Addons disponibles

Según el tipo de negocio y el plan contratado podrán activarse:

- Tags Store;
- Tags Resto;
- Tags Turnos;
- Tags Reviews;
- Tags Guest Experience;
- Tags Portal;
- dominios propios;
- beneficios y cupones;
- otros módulos futuros.

Las columnas históricas como `site`, `catalog`, `is_restoran`, `is_ecommerce` o equivalentes no serán el nuevo modelo de permisos. Las capacidades se resolverán mediante planes, addons y permisos de Tags.

## 7. Página inicial de CalamuchitAr

CalamuchitAr no tendrá la landing comercial de Tags. Su página inicial continuará funcionando como un directorio regional.

Componentes previstos:

1. Encabezado y marca CalamuchitAr.
2. Buscador general.
3. Cuadrícula de rubros de primer nivel.
4. Selector o filtro de localidad cuando corresponda.
5. Comercios destacados.
6. Espacios para banners publicitarios.
7. Acceso al login o a “Administrar mi comercio”.
8. Contenido SEO regional.
9. Footer institucional.

El acceso administrativo podrá comenzar en CalamuchitAr, pero utilizará la autenticación y el dashboard unificado de Tags.

## 8. Navegación del directorio

El recorrido público principal será:

```text
Inicio
→ Rubro
→ Categoría hija
→ Resultados
→ Ficha del negocio
```

El buscador deberá encontrar resultados por:

- nombre del negocio;
- rubro;
- categoría;
- palabras clave;
- descripción;
- servicios ofrecidos;
- localidad;
- región;
- características;
- área de cobertura.

## 9. Taxonomía ilimitada

La estructura actual de `categories`, `subcategories` y `subsubcategories` limita artificialmente el directorio a tres niveles.

Se propone una taxonomía jerárquica ilimitada:

`tags_directory_taxonomy_nodes`

Campos conceptuales:

- `id`;
- `parent_id`;
- `name`;
- `slug`;
- `node_type`;
- `depth`;
- `image_url`;
- `sort_order`;
- `is_active`.

Ejemplo:

```text
Alojamiento
├── Cabañas
│   ├── Con pileta
│   ├── Con spa
│   │   └── Con sauna
│   └── Pet friendly
├── Hoteles
└── Campings
```

Para consultar ancestros y descendientes eficientemente se contempla una tabla de cierre:

`tags_directory_taxonomy_closure`

Los negocios podrán pertenecer a varios nodos mediante:

`tags_directory_listing_taxonomy`

Cada ficha podrá definir un rubro principal y varios rubros secundarios.

## 10. Geografía

La geografía será independiente de la taxonomía comercial.

Se propone:

`tags_geo_places`

Con soporte para:

- país;
- provincia o estado;
- región;
- valle;
- departamento;
- localidad;
- barrio;
- otros niveles futuros.

Ejemplo:

```text
Argentina
└── Córdoba
    └── Valle de Calamuchita
        └── Los Reartes
```

Cada negocio podrá tener:

- una ubicación física principal;
- sucursales futuras;
- múltiples áreas de cobertura.

La distinción entre ubicación y cobertura es necesaria para delivery, excursiones, transporte, profesionales y servicios técnicos.

## 11. Modelo conceptual de canales

### `tags_directory_sites`

Representará cada canal público.

Datos previstos:

- código;
- nombre;
- dominio principal;
- configuración de marca;
- theme;
- SEO general;
- alcance geográfico;
- configuración de home;
- estado.

### `tags_directory_listings`

Representará la ficha única del negocio dentro del núcleo del directorio.

### `tags_directory_site_listings`

Relacionará una ficha con uno o más canales.

Datos previstos:

- `site_id`;
- `listing_id`;
- slug público;
- ruta histórica;
- estado;
- prioridad;
- destacado;
- canonical;
- fechas de publicación;
- configuración SEO específica.

## 12. Imágenes y recursos

Las imágenes actuales están almacenadas principalmente mediante URLs absolutas de Google Cloud Storage.

Ejemplo:

```text
https://storage.googleapis.com/calamuchitar_images/...
```

Durante la primera migración se conservarán exactamente esas URLs. No será necesario volver a cargar ni mover los archivos para poner en funcionamiento el nuevo directorio.

Se propone:

`tags_directory_media`

Con:

- ficha relacionada;
- URL original;
- proveedor de almacenamiento;
- identificador legado;
- tipo: logo, portada o galería;
- texto alternativo;
- orden;
- estado de migración física.

En una etapa posterior los archivos podrán copiarse al almacenamiento estándar de Tags manteniendo compatibilidad con sus direcciones anteriores.

## 13. Preservación de rutas y SEO

Las URLs antiguas son parte crítica de los datos migrados.

Se propone:

`tags_legacy_routes`

Datos previstos:

- dominio;
- ruta histórica exacta;
- tipo de destino;
- identificador de destino;
- ruta canónica;
- modo de respuesta;
- estado de validación;
- fecha de última comprobación.

Modos posibles:

- renderizar directamente el contenido nuevo en la URL histórica;
- responder con una redirección 301 a una URL nueva.

La estrategia inicial recomendada es conservar la URL histórica y renderizar allí la ficha migrada. Las redirecciones deberán evaluarse caso por caso.

Antes del corte será obligatorio inventariar rutas mediante:

- repositorio actual de CalamuchitAr;
- sitemap;
- Google Search Console;
- logs del servidor;
- enlaces internos;
- páginas indexadas.

Como las tablas actuales no guardan un slug explícito, el inventario de URLs no puede reconstruirse con certeza únicamente desde la base de datos.

## 14. Contenido duplicado entre canales

Una ficha puede publicarse en Tags y CalamuchitAr, pero no debe generarse un espejo SEO sin reglas.

Cada publicación deberá definir:

- dominio canónico;
- metadatos específicos;
- alcance geográfico;
- contenido contextual cuando corresponda;
- reglas de indexación.

Esto evitará que los buscadores interpreten ambas versiones como duplicados sin jerarquía.

## 15. Publicidad y banners

El directorio tendrá una infraestructura de campañas reutilizable entre canales.

Conceptos previstos:

- anunciante;
- campaña;
- pieza de escritorio;
- pieza móvil;
- fecha de inicio y fin;
- prioridad;
- canal;
- rubro;
- territorio;
- espacio de publicación;
- impresiones;
- clics;
- estado.

Espacios posibles:

- home superior;
- home entre rubros;
- página de categoría;
- resultados de búsqueda;
- ficha de negocio;
- ubicaciones editoriales futuras.

## 16. Monetización posible

El modelo permitirá comercializar:

- ficha básica;
- QR-Page autoadministrable;
- publicación en un canal regional;
- publicación en varias regiones;
- presencia en Tags general;
- posición destacada;
- banners;
- dominio propio;
- addons operativos;
- estadísticas ampliadas;
- campañas y beneficios.

La contratación se resolverá mediante planes y addons de Tags, no mediante flags históricos en la ficha.

## 17. Acceso y administración

El dashboard histórico de CalamuchitAr será reemplazado por el dashboard del negocio de Tags.

No se migrarán sesiones NextAuth activas. Los usuarios válidos se vincularán con sus negocios mediante un proceso seguro de invitación o magic link.

El acceso podrá presentarse desde cada canal con su identidad, pero la autorización, permisos y administración pertenecerán a Tags.

## 18. Compatibilidad y trazabilidad

Se propone una tabla transversal:

`tags_legacy_entity_map`

Campos conceptuales:

- sistema de origen;
- tabla de origen;
- ID de origen;
- tabla de destino;
- ID de destino;
- estado de migración;
- observaciones;
- fecha de validación.

Permitirá rastrear cada publisher, suscripción, imagen, taxonomía y URL durante toda la migración.

## 19. Alcance de la migración de CalamuchitAr

La prioridad será:

1. Publishers y datos públicos.
2. Imágenes y galerías.
3. Rutas públicas.
4. Taxonomía útil.
5. Geografía.
6. Contenido público vigente.
7. Usuarios que realmente administrarán negocios.

El resto de las funcionalidades históricas será evaluado antes de migrarse. Muchas podrán descartarse y reemplazarse por módulos actuales de Tags.

## 20. Hallazgos preliminares de desarrollo

La base analizada es una base de desarrollo y producción tendrá más clientes.

Hallazgos actuales:

- existen `publishers` y `publishers_ac` con estructuras duplicadas;
- `subscriptions.publisher` puede apuntar ambiguamente a cualquiera de ellas;
- hay relaciones huérfanas y ambiguas que deberán auditarse;
- la mayoría de los usuarios no utiliza autoadministración;
- las imágenes existentes pueden conservarse por URL;
- las rutas no están persistidas mediante slugs explícitos;
- la taxonomía actual es consistente en sus tres niveles, pero no puede crecer más;
- el modelo histórico mezcla publicación, contratación y funcionalidades.

Estos hallazgos refuerzan la conveniencia de migrar selectivamente y no copiar la arquitectura anterior.

## 21. Roadmap propuesto

### Etapa 1 — Relevamiento definitivo

- documentar rutas actuales;
- relevar producción;
- identificar publishers válidos;
- identificar imágenes;
- determinar usuarios que conservarán acceso;
- definir funcionalidades históricas que se mantienen.

### Etapa 2 — Diseño técnico

- cerrar tablas y relaciones;
- definir contrato de dominios y canales;
- definir taxonomía y geografía;
- definir estrategia SEO;
- diseñar buscador;
- diseñar publicidad;
- definir integración con QR-Page y addons.

### Etapa 3 — Núcleo Tags Directory

- administración central de canales;
- CRUD de taxonomía;
- CRUD geográfico;
- fichas de negocio;
- publicaciones por canal;
- medios;
- rutas históricas;
- buscador.

### Etapa 4 — Canal CalamuchitAr

- identidad visual;
- home regional;
- cuadrícula de rubros;
- buscador;
- resultados;
- ficha pública;
- banners;
- login hacia Tags.

### Etapa 5 — Migración controlada

- crear negocios y fichas en modo de prueba;
- relacionar imágenes sin moverlas;
- migrar taxonomías;
- cargar rutas históricas;
- comparar páginas anteriores y nuevas;
- validar SEO y navegación;
- habilitar convivencia temporal.

### Etapa 6 — Corte y seguimiento

- dirigir CalamuchitAr al nuevo núcleo;
- monitorear errores y rutas 404;
- validar indexación;
- mantener tablas anteriores en modo lectura;
- corregir casos individuales;
- retirar la plataforma anterior cuando el funcionamiento esté validado.

### Etapa 7 — Nuevos directorios regionales

- Punilla;
- Traslasierra;
- Córdoba capital;
- otros canales regionales o temáticos.

## 22. Principio arquitectónico final

```text
Tags
├── Dashboard y autenticación
├── Negocios
├── QR-Page predeterminada
├── Planes y addons
└── Tags Directory Network
    ├── Fichas
    ├── Taxonomía
    ├── Geografía
    ├── Buscador
    ├── Medios
    ├── Publicidad
    ├── Rutas históricas
    └── Canales
        ├── Tags
        ├── CalamuchitAr
        ├── Punilla
        ├── Traslasierra
        └── Córdoba capital
```

El resultado será una única plataforma mantenible, capaz de operar múltiples marcas, dominios y territorios sin duplicar negocios, código ni infraestructura.

