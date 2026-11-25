# Ruta 100 Córdoba — Auditoría del modelo geográfico y turístico existente

**Fecha:** 1 de noviembre de 2026  
**Estado:** Ítem 2 cerrado — análisis solamente, sin SQL ni cambios de base de datos

## 1. Objetivo

Determinar qué infraestructura actual de Tags puede reutilizarse para Ruta 100 Córdoba y qué conceptos nuevos necesita el corredor, evitando modelos paralelos.

## 2. Infraestructura reutilizable

### 2.1 Sitios y aislamiento

`tags_directory_sites` ya ofrece:

- `site_id` independiente;
- código y hostname;
- branding;
- SEO;
- configuración del directorio;
- estado de activación.

**Decisión:** Ruta 100 continuará como un sitio del Directorio Network. No necesita una tabla de proyecto ni autenticación propia.

### 2.2 Lugares geográficos

`tags_geo_places` ya representa una jerarquía global con:

- país;
- provincia o estado;
- departamento;
- región;
- valle;
- localidad;
- barrio;
- otros tipos;
- jerarquía padre/hijo;
- slug;
- coordenadas de referencia;
- estado activo.

**Decisión:** las localidades, valles y regiones de Ruta 100 deben reutilizar estos registros. No se duplicarán localidades por sitio.

**Limitación:** la tabla contiene identidad geográfica básica, pero no una presentación editorial diferente para cada sitio. Ruta 100 necesitará una extensión editorial por `site_id + place_id`, sin modificar el significado global del lugar.

### 2.3 Prestadores

Las tablas existentes ya resuelven:

- prestadores (`tags_directory_listings`);
- publicación por canal (`tags_directory_site_listings`);
- rubros (`tags_directory_taxonomy_nodes` y relaciones);
- ubicación y área de servicio (`tags_directory_listing_places`);
- medios (`tags_directory_media`).

**Decisión:** alojamientos, gastronomía, comercios y servicios seguirán siendo prestadores del directorio. No se copiarán dentro del modelo turístico.

### 2.4 Fuentes turísticas

`tags_ai_tourism_sources` ya registra:

- sitio;
- fuente municipal, oficina de turismo, editorial, prestador u otra;
- localidad;
- sitio web y contacto;
- estado.

**Decisión:** reutilizar esta tabla para fuentes oficiales, municipales y editoriales de Ruta 100.

### 2.5 Contenido turístico

`tags_ai_tourism_contents` ya admite:

- atractivos;
- paseos;
- experiencias;
- excursiones;
- eventos;
- balnearios;
- accesos al río;
- miradores;
- museos;
- circuitos o recorridos;
- servicios públicos;
- recomendaciones;
- contenido genérico.

También posee:

- aislamiento por sitio;
- fuente;
- slug único por sitio;
- resumen y descripción;
- público;
- condiciones y restricciones;
- disponibilidad, horarios, temporada y duración;
- contacto, reserva y precios orientativos;
- datos prácticos y accesibilidad;
- localidad y coordenadas;
- imágenes con créditos y autorización;
- publicación y vigencia;
- verificación y fecha de control;
- inclusión en mapa y asistente;
- texto de búsqueda;
- clasificación mediante taxonomía.

**Decisión:** reutilizar este contenido para atractivos, lugares, actividades, eventos y servicios esenciales de Ruta 100. No crear tablas nuevas para cada uno.

### 2.6 Puntos QR

`tags_directory_points` y sus tablas relacionadas ya resuelven:

- tipos de punto por sitio;
- QR y clave pública;
- autorización del anfitrión;
- instalación y mantenimiento;
- ubicación;
- fotografías;
- destino;
- métricas de escaneo.

**Decisión:** reutilizar esta infraestructura en la futura etapa Pasaporte Ruta 100. No debe formar parte del núcleo inicial.

## 3. Conceptos que no cubre el modelo actual

### 3.1 Corredor

No existe una entidad que represente un recorrido longitudinal con:

- nombre e identidad;
- punto inicial y final;
- longitud;
- geometría completa;
- fuente cartográfica;
- estado editorial.

### 3.2 Tramos ordenados

El contenido turístico puede representar un “recorrido”, pero no resuelve correctamente:

- orden dentro de un corredor;
- continuidad anterior/siguiente;
- geometría lineal;
- localidades atravesadas;
- distancia y duración verificadas;
- servicios asociados al tramo.

### 3.3 Perfil editorial de una localidad por sitio

`tags_geo_places` identifica la localidad, pero no contiene:

- presentación para Ruta 100;
- imagen de portada;
- relación con el corredor;
- orden dentro del recorrido;
- estado editorial;
- SEO propio del proyecto;
- fuentes y revisión.

Estos datos no deben agregarse directamente a la localidad global porque otros directorios podrían describirla de manera diferente.

### 3.4 Diez experiencias oficiales

La taxonomía actual clasifica rubros y contenido, pero las diez experiencias necesitan además:

- identidad editorial;
- orden estable;
- color e iconografía;
- presentación pública;
- capa de mapa;
- SEO;
- fuentes;
- estado de publicación;
- relaciones con tramos, localidades y contenido.

**Decisión:** no tratarlas como simples rubros comerciales. El próximo diseño deberá decidir una extensión editorial genérica para experiencias, manteniendo sus relaciones con la taxonomía cuando sea útil para búsqueda.

### 3.5 Itinerarios

No existe un modelo para:

- itinerario;
- días;
- paradas ordenadas;
- tiempos;
- variantes;
- viajes compartidos.

Se incorporará en una etapa posterior, no en la primera migración territorial.

## 4. Separación conceptual obligatoria

```text
Lugar geográfico
  tags_geo_places

Prestador comercial
  tags_directory_listings
  + publicación por sitio

Contenido turístico
  tags_ai_tourism_contents
  + fuente y verificación

Corredor y tramos
  nueva extensión territorial

Experiencia temática
  nueva extensión editorial
  + relación con contenido y territorio
```

## 5. Qué no debe hacerse

- No crear otra tabla de localidades.
- No convertir cada atractivo en un prestador.
- No copiar prestadores dentro de las páginas de localidad.
- No usar rubros comerciales como sustituto de las diez experiencias.
- No guardar todo el corredor en un único documento JSON imposible de consultar.
- No agregar descripción de Ruta 100 directamente a `tags_geo_places`.
- No crear otro sistema de fuentes, medios, eventos o puntos QR.
- No alterar registros de CalamuchitAr para que funcionen en Ruta 100.
- No crear claves foráneas contra tablas legacy sin verificar sus tipos reales.

## 6. Extensión mínima que deberá diseñarse

Sin definir todavía nombres finales ni SQL, el núcleo necesita solamente:

1. **Corredor por sitio.**
2. **Tramos ordenados del corredor.**
3. **Relación de tramos con lugares geográficos.**
4. **Perfil editorial de una localidad dentro de un sitio.**
5. **Experiencias editoriales del sitio.**
6. **Relaciones entre experiencias y contenido turístico.**
7. **Relaciones entre experiencias, localidades y tramos cuando no puedan derivarse.**

Los lugares, eventos, servicios, imágenes, fuentes y prestadores permanecerán en las tablas actuales.

## 7. Riesgos detectados

### 7.1 Nombre técnico heredado

Las tablas turísticas se llaman `tags_ai_tourism_*`, pero actualmente ya alimentan la web, el mapa y el buscador, no solamente la IA. Renombrarlas sería un refactor riesgoso e innecesario.

**Tratamiento:** reutilizarlas sin renombrar.

### 7.2 Localidad por texto y por ID

El contenido turístico permite `locality_id` y `locality_name`. Algunos flujos pueden depender del texto cuando falta una relación normalizada.

**Tratamiento:** para Ruta 100 exigir `locality_id` cuando la localidad exista en el catálogo, conservando el nombre solamente como apoyo o para parajes aún no normalizados.

### 7.3 Taxonomía comercial y temática

Mezclar experiencias oficiales con rubros puede producir filtros incorrectos o tarjetas duplicadas.

**Tratamiento:** mantener identidad editorial separada y relacionarla explícitamente con categorías o contenidos.

### 7.4 Geometría

El modelo actual guarda puntos, no líneas. El formato de geometría debe ser portable a MariaDB 10.11 y utilizable por el mapa.

**Tratamiento:** definirlo en el diseño lógico antes del SQL; no asumir funciones espaciales específicas sin comprobar instalaciones.

## 8. Conclusión

El modelo existente cubre aproximadamente toda la información de prestadores, atractivos, eventos, servicios, fuentes, verificación, medios y puntos QR. El desarrollo nuevo debe concentrarse en la **estructura del corredor**:

- corredor;
- tramos;
- perfil territorial por sitio;
- experiencias temáticas;
- relaciones ordenadas.

Esto reduce considerablemente el alcance y el riesgo de la primera etapa.

## 9. Siguiente ítem propuesto

Diseñar el **modelo lógico mínimo del corredor**, todavía sin ejecutar SQL:

- entidades y campos;
- relaciones;
- índices;
- estados editoriales;
- formato de geometría;
- reglas de publicación;
- compatibilidad con MariaDB 10.11;
- estrategia de reversibilidad.

