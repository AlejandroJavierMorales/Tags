# Ruta 100 Córdoba — Especificación funcional del producto digital

**Documento de producto y alcance funcional para desarrollo**  
**Versión:** 1.0  
**Fecha:** 1 de noviembre de 2026  
**Estado:** propuesta funcional; no autoriza implementación ni cambios de base de datos

## 1. Propósito

Este documento define el producto digital **Ruta 100 Córdoba** desde el punto de vista funcional. Su propósito es servir como contrato de producto previo al diseño técnico detallado y al desarrollo.

La plataforma no será solamente un directorio de prestadores. Será una herramienta para **descubrir, comprender, planificar y recorrer** el corredor turístico Ruta 100, integrando:

- recorrido vial y turístico;
- localidades y comunas;
- tramos y etapas;
- lugares y atractivos;
- diez experiencias temáticas;
- comercios y prestadores;
- eventos y servicios útiles;
- planificación de viajes;
- orientación conversacional mediante Ruti;
- posicionamiento orgánico en buscadores.

La definición oficial presenta Ruta 100 como un recorrido turístico de norte a sur que conecta destinos, paisajes, pueblos y experiencias, convirtiendo el camino en parte del viaje. La implementación digital debe materializar ese concepto y no reducirlo a una lista de resultados.

Fuentes de referencia:

- [Presentación oficial de Ruta 100 — Agencia Córdoba Turismo](https://cordobaturismo.gov.ar/ruta-100/)
- [Folleto oficial de Ruta 100](https://cordobaturismo.gov.ar/wp-content/uploads/2026/10/Folleto-Ruta-100-1-1.pdf)
- Copia de trabajo: `docs/Folleto-Ruta-100-1-1.pdf`

## 2. Visión de producto

### 2.1 Propuesta principal

> La plataforma interactiva para descubrir, planificar y recorrer la Ruta 100 de Córdoba.

### 2.2 Diferencia respecto de un directorio tradicional

Un directorio responde principalmente **qué existe y dónde está**. Ruta 100 Córdoba deberá responder además:

- qué se puede vivir en el recorrido;
- qué localidades y atractivos se pueden combinar;
- cuánto tiempo requiere cada tramo;
- qué alternativas se adecuan al perfil del viajero;
- dónde detenerse, comer, dormir o abastecerse;
- cómo construir un itinerario coherente;
- qué información está confirmada y cuándo fue actualizada.

El directorio existente de Tags seguirá siendo una capacidad central, pero operará como una capa comercial y de servicios dentro de un modelo territorial más amplio.

## 3. Principios del producto

1. **El recorrido es el producto.** El mapa, los tramos y las etapas tienen la misma importancia que los destinos finales.
2. **Información comprobable.** Las distancias, condiciones, horarios, coordenadas y recomendaciones sensibles deben tener fuente y fecha de revisión.
3. **No inventar cobertura.** Una localidad, atractivo o servicio incompleto no debe presentarse como verificado.
4. **Relevancia antes que prioridad comercial.** La condición comercial nunca habilita un resultado que no responde a la consulta.
5. **Visibilidad explícita de prestadores.** Un prestador publicado no puede quedar invisible por inconsistencias de suscripción.
6. **Diseño mobile-first.** El uso principal ocurrirá durante la planificación y el viaje desde un teléfono.
7. **Accesibilidad y rendimiento.** La experiencia debe ser utilizable con conectividad limitada y dispositivos de gama media.
8. **Arquitectura multidominio.** Ruta 100 Córdoba conservará identidad, URLs, metadatos y asistente propios sin modificar el funcionamiento de CalamuchitAr.
9. **Contenido sustancial.** No se crearán páginas SEO masivas sin información útil y diferenciada.
10. **Evolución gradual.** El sistema debe permitir comenzar con un corredor editorial validado y agregar inteligencia, participación y comercialización por etapas.

## 4. Audiencias

### 4.1 Viajeros

- turistas que planifican antes de viajar;
- personas que ya se encuentran recorriendo Córdoba;
- familias, parejas, grupos y viajeros solos;
- usuarios de automóviles, motos, bicicletas o motorhomes;
- visitantes interesados en una temática específica;
- personas con necesidades de accesibilidad;
- residentes que buscan escapadas y experiencias cercanas.

### 4.2 Prestadores y comercios

- alojamientos;
- gastronomía;
- guías y operadores;
- bodegas y productores;
- parques y propuestas de aventura;
- artesanos y comercios regionales;
- estaciones de servicio, talleres, farmacias y servicios esenciales;
- organizadores de eventos.

### 4.3 Gestión pública e institucional

- Agencia Córdoba Turismo;
- Gobierno de la Provincia de Córdoba;
- municipios y comunas;
- áreas locales de turismo, cultura y producción;
- entes regionales y cámaras;
- equipos de infraestructura, seguridad y comunicación.

### 4.4 Administración de la plataforma

- administradores generales de Tags;
- editores territoriales;
- revisores de contenido;
- administradores municipales;
- administradores de prestadores;
- responsables de analítica y campañas.

## 5. Arquitectura funcional

```text
Ruta 100 Córdoba
├── Corredor
│   ├── trazado
│   ├── tramos
│   └── etapas sugeridas
├── Territorio
│   ├── regiones y valles
│   ├── localidades
│   └── lugares y atractivos
├── Experiencias
│   ├── diez ejes oficiales
│   └── actividades relacionadas
├── Oferta
│   ├── prestadores y comercios
│   ├── productos y servicios
│   ├── eventos
│   └── servicios esenciales
├── Planificación
│   ├── itinerarios editoriales
│   ├── planificador personalizado
│   └── viajes guardados
├── Orientación
│   ├── buscador
│   ├── mapa interactivo
│   └── Ruti
└── Participación
    ├── favoritos
    ├── pasaporte y QR
    └── beneficios
```

## 6. Modelo conceptual de información

Esta sección define entidades funcionales, no nombres definitivos de tablas. Antes de diseñar SQL deberá auditarse el modelo real de Tags y evitar duplicar entidades existentes.

### 6.1 Corredor

Representa Ruta 100 como producto turístico integral. Contendrá nombre, descripción, geometría, extremos, longitud documentada, fuentes, identidad visual y estado editorial.

### 6.2 Tramo

Porción ordenada del corredor entre dos puntos significativos. Podrá contener:

- origen y destino;
- geometría geográfica;
- distancia y duración estimada;
- rutas y caminos involucrados;
- localidades atravesadas;
- características generales;
- recomendaciones y advertencias;
- fuentes y fecha de revisión;
- estado de publicación.

### 6.3 Etapa sugerida

Agrupación editorial de uno o más tramos para ser recorridos dentro de una jornada o período determinado. No debe confundirse con un tramo vial.

### 6.4 Lugar geográfico

Debe reutilizar y extender, cuando corresponda, la jerarquía geográfica existente de Tags: país, provincia, región, valle, departamento, localidad, comuna, barrio u otro nivel documentado.

### 6.5 Localidad

Página territorial con identidad, presentación, ubicación, atractivos, experiencias, eventos, prestadores, servicios y relaciones con localidades anterior y siguiente.

### 6.6 Lugar o atractivo

Entidad turística no necesariamente comercial: mirador, río, sendero, iglesia, museo, patrimonio, balneario, parque, paisaje, sitio histórico u otro punto de interés.

### 6.7 Experiencia temática

Los diez ejes iniciales son:

1. Turismo Naturaleza.
2. Turismo Deportivo.
3. Caminos del Vino.
4. Camino de Brochero.
5. Turismo Cultural.
6. Senderismo.
7. Golf.
8. Turismo Religioso.
9. Ruta Motorhome.
10. Parques y Aventuras.

Una experiencia no es un rubro comercial. Podrá relacionarse con localidades, lugares, tramos, actividades, eventos y prestadores.

### 6.8 Actividad

Acción realizable: caminar, degustar, pescar, visitar, jugar golf, acampar, observar aves, navegar o participar de una experiencia cultural. Podrá definir dificultad, duración, público, temporada y requisitos.

### 6.9 Prestador

Reutilizará el directorio de Tags, su publicación, categorías, localidades, página pública, contacto, productos y servicios. Se agregarán relaciones territoriales o temáticas solamente cuando no exista un contrato equivalente.

### 6.10 Evento

Actividad con fecha, horario, ubicación y organizador. Debe poder expirar sin desaparecer del historial administrativo y diferenciar eventos confirmados de información provisoria.

### 6.11 Servicio esencial

Estaciones de servicio, carga eléctrica, talleres, gomerías, salud, farmacias, seguridad, cajeros, proveedurías y servicios para motorhomes. Requiere verificación reforzada por su importancia durante el viaje.

### 6.12 Itinerario

Secuencia ordenada de días, tramos y paradas. Puede ser editorial, personalizado por el usuario o generado con asistencia automatizada y validaciones determinísticas.

### 6.13 Fuente y revisión

La información sensible debe registrar origen, URL o documento, responsable, fecha de verificación y próxima revisión. La procedencia debe acompañar al dato y no quedar únicamente en notas editoriales.

## 7. Experiencia pública

## 7.1 Página principal

Objetivos:

- explicar Ruta 100 en pocos segundos;
- permitir comenzar por mapa, experiencia, localidad o búsqueda;
- presentar el recorrido como protagonista;
- ofrecer acceso visible a Ruti;
- destacar contenido editorial y no solamente prestadores pagos.

Componentes propuestos:

1. Encabezado de marca y navegación.
2. Presentación principal con llamada a explorar el recorrido.
3. Vista resumida del corredor de Cruz del Eje a Río Cuarto.
4. Accesos a “Ver mapa”, “Planificar viaje” y “Hablar con Ruti”.
5. Diez experiencias temáticas.
6. Tramos o etapas recomendadas.
7. Localidades destacadas.
8. Próximos eventos.
9. Prestadores relevantes según contexto.
10. Información práctica y seguridad.
11. Bloque editorial y preguntas frecuentes.
12. Pie institucional, fuentes y datos legales.

## 7.2 Mapa interactivo

El mapa deberá permitir:

- visualizar el trazado completo;
- distinguir tramos;
- navegar siguiendo el corredor;
- encender o apagar capas;
- filtrar por experiencia, localidad, lugar, prestador o servicio;
- agrupar marcadores según escala;
- usar ubicación del usuario con consentimiento;
- consultar qué hay cerca;
- abrir una ficha sin abandonar el mapa;
- agregar una parada al viaje;
- abrir navegación externa hacia el punto elegido;
- compartir una vista filtrada mediante URL.

### Comportamiento móvil

- mapa a ancho completo;
- controles reducidos y accesibles;
- ficha en panel inferior deslizable;
- filtros en modal o drawer;
- ningún control esencial debe depender de hover;
- el mapa no debe bloquear el desplazamiento normal de la página sin intención del usuario.

## 7.3 Ficha de localidad

Contenido mínimo para publicación indexable:

- nombre y presentación propia;
- ubicación y relación con el corredor;
- coordenadas verificadas;
- qué conocer;
- experiencias disponibles;
- lugares y atractivos;
- información práctica;
- prestadores y servicios;
- mapa;
- fuentes y actualización.

Contenido ampliado:

- historia y patrimonio;
- agenda;
- itinerario recomendado;
- gastronomía y productos regionales;
- accesibilidad;
- localidades cercanas y continuidad del recorrido;
- preguntas frecuentes reales.

Una ficha sin contenido suficiente podrá existir como borrador, pero no deberá indexarse.

## 7.4 Ficha de tramo

Debe mostrar:

- origen, destino, distancia y tiempo estimado;
- mapa y perfil del trayecto cuando corresponda;
- localidades y paradas;
- experiencias y atractivos;
- servicios útiles;
- recomendaciones estacionales;
- fecha y fuente de revisión;
- continuidad hacia tramos anterior y siguiente.

No se publicará como estado vial en tiempo real aquello que no provenga de una fuente autorizada y actualizada.

## 7.5 Portada de experiencia

Cada una de las diez experiencias tendrá:

- identidad visual diferenciable dentro de la marca;
- introducción editorial;
- capa temática del mapa;
- localidades, tramos y atractivos relacionados;
- recomendaciones de temporada, duración y dificultad;
- itinerarios sugeridos;
- prestadores relevantes;
- eventos;
- preguntas frecuentes;
- fuentes.

## 7.6 Ficha de atractivo

Campos funcionales posibles:

- nombre y tipo;
- resumen y descripción;
- galería;
- ubicación;
- acceso y restricciones;
- horarios y costo, cuando corresponda;
- tiempo sugerido;
- dificultad;
- accesibilidad;
- servicios disponibles;
- recomendaciones;
- contacto oficial;
- experiencias relacionadas;
- fuente, estado y fecha de revisión.

## 7.7 Directorio y búsqueda

Se conservarán:

- búsqueda por texto;
- navegación por rubros;
- filtro por localidad;
- resultados en tarjetas;
- mapa de resultados;
- páginas públicas de prestadores;
- medios de contacto y cómo llegar.

Se incorporarán progresivamente:

- filtro por tramo;
- filtro por experiencia;
- distancia desde el recorrido;
- “cerca mío”;
- productos, servicios, catálogos y módulos publicados;
- continuidad desde una búsqueda hacia el planificador.

Los resultados deberán cumplir relevancia semántica y territorial. Nunca se recomendará un negocio irrelevante solamente porque coincide con una palabra incidental o porque no existen mejores resultados.

## 8. Planificador de viajes

## 8.1 Datos de entrada

- punto de inicio y final;
- fechas o cantidad de días;
- vehículo o modalidad de viaje;
- composición del grupo;
- intereses;
- tiempo máximo de conducción diario;
- ritmo de viaje;
- necesidades de accesibilidad;
- preferencias de alojamiento y gastronomía;
- mascotas;
- presupuesto orientativo opcional.

## 8.2 Resultado

- itinerario por día;
- tramos y tiempos;
- paradas sugeridas;
- alternativas;
- advertencias por información faltante;
- prestadores relevantes;
- acceso a navegación externa;
- opción de editar, guardar y compartir.

## 8.3 Reglas

- la IA no calculará por sí sola distancias ni tiempos críticos;
- los cálculos geográficos deberán provenir de herramientas determinísticas;
- ninguna parada cerrada, no publicada o fuera de vigencia debe recomendarse como disponible;
- el usuario debe poder modificar cualquier propuesta;
- la respuesta debe distinguir hechos confirmados de sugerencias editoriales;
- cambios de clima o estado vial requerirán proveedores autorizados.

## 9. Ruti, guía virtual

Ruti será la identidad conversacional de Ruta 100 Córdoba y deberá mantenerse separada de Muchi y de los chatbots particulares de los comercios.

### 9.1 Capacidades

- buscar localidades, lugares, prestadores, productos y servicios;
- explicar el recorrido y sus experiencias;
- responder preguntas sobre contenido publicado;
- reunir preferencias para un viaje;
- consultar disponibilidad de información estructurada;
- construir o modificar itinerarios;
- abrir mapa, ficha o planificador con filtros precargados;
- mantener contexto de la conversación;
- reconocer límites y pedir precisión cuando sea necesario.

### 9.2 Arquitectura funcional de respuesta

1. Interpretar intención y entidades.
2. Consultar índices y herramientas del dominio.
3. Aplicar filtros territoriales y de publicación.
4. recuperar evidencia suficiente;
5. validar distancias, fechas y disponibilidad mediante herramientas determinísticas;
6. redactar una respuesta basada en evidencia;
7. registrar auditoría y resultados;
8. ofrecer una acción concreta.

### 9.3 Restricciones

- no inventar lugares, horarios, precios, estado vial o disponibilidad;
- no usar conocimiento general como sustituto de datos publicados;
- no mezclar datos de CalamuchitAr con Ruta 100;
- no recomendar por prioridad comercial cuando no exista relevancia;
- informar claramente cuando no haya datos suficientes;
- preservar privacidad y consentimiento de ubicación.

## 10. Pasaporte Ruta 100

Módulo posterior al núcleo inicial.

Funciones:

- puntos oficiales con QR;
- registro de visitas;
- sellos digitales;
- insignias por localidad, tramo o experiencia;
- desafíos;
- beneficios relacionados;
- historial personal;
- tarjeta compartible;
- métricas agregadas para gestión.

Los controles deben impedir canjes duplicados, falsificación básica de códigos y exposición de datos personales. Los premios o incentivos necesitarán reglas y responsables claramente definidos.

## 11. Administración y flujo editorial

### 11.1 Áreas administrativas

- Corredor y trazado.
- Tramos y etapas.
- Regiones y localidades.
- Experiencias y actividades.
- Atractivos y lugares.
- Prestadores y servicios esenciales.
- Itinerarios.
- Eventos.
- Fuentes y revisiones.
- Portada y destacados.
- SEO.
- Ruti y auditoría de consultas.
- Analítica.
- Pasaporte y beneficios, cuando se habiliten.

### 11.2 Estados editoriales

- borrador;
- pendiente de revisión;
- observado;
- aprobado;
- publicado;
- desactualizado;
- archivado.

La publicación y despublicación deberán ser acciones explícitas con confirmación. Despublicar deberá informar que el contenido quedará inaccesible al público y no indexable.

### 11.3 Roles sugeridos

- administrador general;
- coordinador editorial;
- editor territorial;
- revisor institucional;
- operador municipal;
- administrador de prestador;
- analista de métricas.

Los permisos concretos se diseñarán reutilizando la infraestructura existente.

## 12. SEO y descubrimiento orgánico

## 12.1 Objetivo

Posicionar `ruta100cordoba.com` como fuente práctica y actualizada para planificar el recorrido, sin competir mediante páginas vacías ni duplicar contenidos institucionales.

## 12.2 Arquitectura pública propuesta

```text
/
/ruta-100-cordoba
/mapa
/recorrido
/tramos/[slug]
/localidades/[slug]
/experiencias/[slug]
/lugares/[slug]
/itinerarios/[slug]
/eventos
/directorio
```

Las rutas definitivas deberán contrastarse con el enrutamiento actual de Tags antes de implementar.

## 12.3 Requisitos SEO

- título y descripción únicos;
- URL canónica del dominio correcto;
- contenido editorial propio;
- encabezados jerárquicos;
- breadcrumbs visibles y estructurados;
- enlaces internos territoriales y temáticos;
- sitemap segmentado por tipo de contenido;
- control `noindex` para borradores o páginas insuficientes;
- Open Graph y tarjetas sociales;
- imágenes optimizadas con texto alternativo;
- fecha de actualización;
- autoría o responsable editorial cuando corresponda;
- Core Web Vitals y renderizado indexable;
- monitoreo mediante Search Console.

## 12.4 Datos estructurados previstos

- `WebSite` y `Organization`;
- `TouristDestination`;
- `TouristAttraction`;
- `Place` y `GeoCoordinates`;
- `Trip`;
- `ItemList`;
- `Event`;
- `LocalBusiness` para prestadores;
- `BreadcrumbList`;
- `FAQPage` solamente para preguntas y respuestas visibles y reales.

## 12.5 Contenidos prioritarios de lanzamiento

1. Qué es Ruta 100 Córdoba.
2. Mapa y recorrido.
3. Localidades del recorrido.
4. Cómo recorrerla por etapas.
5. Diez experiencias.
6. Itinerarios de distinta duración.
7. Información para motorhomes.
8. Servicios esenciales.
9. Preguntas frecuentes.

## 13. Analítica

### 13.1 Métricas públicas

- búsquedas;
- filtros utilizados;
- aperturas de mapa y fichas;
- rutas e itinerarios consultados;
- clics en contacto, navegación y reservas;
- contenidos guardados o compartidos;
- conversaciones con Ruti;
- consultas sin respuesta;
- errores y tiempos de carga.

### 13.2 Indicadores institucionales agregados

- interés por localidad y experiencia;
- distribución territorial de consultas;
- tramos más explorados;
- localidades con demanda y poca oferta publicada;
- interacción con destinos emergentes;
- derivaciones hacia prestadores;
- participación en eventos y pasaporte;
- evolución del tráfico orgánico.

No se deberán presentar visitas digitales como llegadas turísticas reales. Cada indicador tendrá definición y fuente.

## 14. Accesibilidad, privacidad y seguridad

- conformidad progresiva con WCAG 2.2 AA;
- navegación mediante teclado;
- contraste suficiente;
- alternativas textuales para imágenes y mapa;
- reducción de movimiento según preferencia del usuario;
- consentimiento explícito para geolocalización;
- recolección mínima de datos;
- sesiones seguras;
- registros de auditoría para cambios editoriales;
- protección contra abuso de formularios y QR;
- política de privacidad específica y comprensible;
- ningún dato personal será vendido como parte del modelo comercial.

## 15. Integración con Tags

### 15.1 Capacidades reutilizables

- plataforma multidominio;
- directorio, categorías y localidades;
- páginas públicas de prestadores;
- buscador y mapas de resultados;
- catálogos, productos y servicios publicados;
- QR, beneficios y fidelización;
- autenticación y magic links;
- roles y dashboard;
- notificaciones;
- analítica;
- infraestructura de IA de destino;
- branding y SEO por proyecto.

### 15.2 Capacidades nuevas

- corredor geográfico;
- tramos y etapas;
- relaciones temáticas no comerciales;
- administración editorial territorial;
- mapa narrativo por capas;
- fichas de atractivos;
- itinerarios y planificador;
- fuentes y revisión de datos;
- pasaporte territorial;
- Ruti conectado al grafo turístico.

### 15.3 Aislamiento obligatorio

- no modificar visual ni funcionalmente Muchi;
- no cambiar el comportamiento de `calamuchita.ar`;
- no mezclar índices ni contenido entre sitios;
- resolver dominio público, branding, enlaces y correos según proyecto;
- cualquier cambio compartido deberá ser compatible, verificable y fácilmente reversible.

## 16. Etapas de desarrollo

### Etapa 0 — relevamiento y contrato de datos

- inventario oficial de localidades y trazado;
- fuentes y derechos de uso;
- auditoría de componentes reutilizables;
- prototipo de mapa;
- diseño técnico y SQL para aprobación;
- reglas de gobierno editorial.

### Etapa 1 — núcleo territorial y SEO

- corredor, tramos, localidades, experiencias y atractivos;
- administración editorial;
- nueva portada;
- guía principal;
- páginas indexables;
- mapa inicial;
- sitemap, schemas y medición;
- directorio existente integrado.

### Etapa 2 — exploración interactiva

- capas del mapa;
- fichas completas;
- etapas sugeridas;
- servicios esenciales;
- eventos;
- cerca mío.

### Etapa 3 — planificador y Ruti

- itinerarios editoriales;
- planificador personalizable;
- viajes guardados y compartidos;
- Ruti con herramientas territoriales;
- auditoría de calidad y consultas sin respuesta.

### Etapa 4 — pasaporte y beneficios

- QR territoriales;
- sellos, insignias y desafíos;
- beneficios;
- métricas agregadas.

### Etapa 5 — inteligencia territorial e integraciones

- tableros institucionales;
- integraciones autorizadas de clima, vialidad y agenda;
- campañas regionales;
- exportaciones y APIs acordadas.

## 17. Criterios de aceptación del primer lanzamiento

El primer lanzamiento se considerará funcional cuando:

1. El dominio y la identidad sean independientes de CalamuchitAr.
2. El trazado publicado provenga de datos validados.
3. El mapa funcione en escritorio y móvil.
4. Localidades, experiencias y atractivos tengan relaciones navegables.
5. El buscador encuentre prestadores y contenido turístico relevante.
6. Las páginas indexables cumplan contenido mínimo y canonical correcto.
7. Los borradores no aparezcan públicamente ni en sitemaps.
8. Las fuentes y fechas de revisión estén registradas.
9. No se altere el funcionamiento de `calamuchita.ar` ni `tags.com.ar`.
10. Existan métricas de errores, búsquedas y consultas sin respuesta.
11. El sitio cumpla pruebas básicas de accesibilidad y rendimiento móvil.
12. La despublicación sea explícita, auditable y efectiva.

## 18. Dependencias y decisiones pendientes

- listado oficial completo de localidades;
- geometría oficial o autorizada del recorrido;
- delimitación de tramos;
- licencias de fotografías, mapas y folleto;
- responsables institucionales de validación;
- fuentes de estado vial, clima y emergencias;
- reglas para uso de marca Ruta 100;
- modelo de participación de municipios y prestadores;
- alcance y reglas del pasaporte;
- presupuesto, cronograma y equipo;
- convenio de tratamiento y publicación de datos.

## 19. Fuera del alcance inicial

- navegación giro a giro propia;
- afirmaciones de estado vial en tiempo real sin fuente;
- reservas centralizadas de toda la oferta;
- aplicación nativa independiente;
- publicación automática de datos municipales no revisados;
- generación masiva de páginas SEO sin contenido;
- promesas de disponibilidad, precio u horario no verificadas;
- cambios sobre CalamuchitAr no necesarios para este proyecto.

## 20. Próximo entregable técnico

Una vez aprobado este alcance deberá elaborarse, antes de escribir código nuevo:

1. auditoría puntual de contratos existentes;
2. mapa de componentes reutilizables;
3. modelo lógico de datos;
4. route map definitivo;
5. contratos de APIs;
6. permisos;
7. wireframes de escritorio y móvil;
8. prototipo navegable del mapa;
9. migraciones SQL exactas para aprobación;
10. plan de pruebas y reversibilidad.

