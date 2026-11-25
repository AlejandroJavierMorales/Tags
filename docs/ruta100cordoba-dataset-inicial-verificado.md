# Ruta 100 Córdoba — conjunto inicial verificado

Fecha de verificación: **1 de noviembre de 2026**.

## Propósito

Este documento define el primer conjunto de datos reales para poner en funcionamiento el módulo territorial de Ruta 100 Córdoba en desarrollo. No autoriza por sí solo escrituras en producción ni publicación pública.

La carga se divide por nivel de evidencia para impedir que una inferencia editorial se presente como información oficial.

## Fuentes principales

1. Agencia Córdoba Turismo — página oficial de Ruta 100:  
   https://cordobaturismo.gov.ar/ruta-100/
2. Agencia Córdoba Turismo — presentación oficial del producto, 30/10/2026:  
   https://cordobaturismo.gov.ar/uncategorized/cordoba-presento-la-ruta-100-y-lanzo-su-campana-de-difusion-para-la-temporada-de-verano-2026-2027/
3. Folleto oficial descargado desde la página anterior y conservado localmente en:  
   `docs/Folleto-Ruta-100-1-1.pdf`

Fuentes secundarias utilizadas únicamente como contraste, nunca como autoridad única:

- https://www.otropunto.com.ar/rio-cuarto/ruta-100-corredor-turistico-cruz-del-eje-rio-cuarto/1248/
- https://www.elobservador.com/argentina/sociedad/536-kilometros-tres-valles-y-mas-50-localidades-asi-es-el-nuevo-circuito-que-promete-cambiar-el-mapa-del-turismo-regional-n6062320/amp
- https://www.examedia.com.ar/portada/post/88149438

## 1. Corredor cargable

| Campo | Valor inicial | Evidencia |
| --- | --- | --- |
| Código | `ruta-100-cordoba` | Identificador interno estable |
| Slug | `ruta-100-cordoba` | Identificador público propuesto |
| Nombre | Ruta 100 Córdoba | Denominación oficial |
| Resumen | Un gran recorrido turístico de norte a sur que conecta destinos, paisajes, atractivos, pueblos y experiencias de Córdoba. | Síntesis fiel de la página oficial |
| Inicio | Cruz del Eje | Presentación y folleto oficiales |
| Final | Río Cuarto | Presentación y folleto oficiales |
| Distancia | 536 km | Folleto y lanzamiento oficial |
| Alcance | Más de 50 localidades y comunas | Folleto y lanzamiento oficial |
| Propósito | Convertir el recorrido en parte de la experiencia turística y articular destinos consolidados con localidades emergentes. | Página oficial |
| Estado inicial | `draft` | No publicar hasta completar y revisar el mapa territorial |
| Fuente principal | Página oficial Ruta 100 | Agencia Córdoba Turismo |

El texto no debe afirmar una ruta vial exacta ni ofrecer navegación giro a giro hasta disponer de una geometría oficial verificable.

## 2. Diez experiencias cargables

Las diez denominaciones provienen del folleto y la presentación del producto. Sus textos iniciales son descripciones editoriales prudentes; no agregan horarios, precios, distancias ni prestadores.

| Orden | Código / slug | Nombre oficial | Descripción inicial |
| ---: | --- | --- | --- |
| 1 | `turismo-naturaleza` | Turismo Naturaleza | Paisajes, ríos, sierras y ambientes naturales para descubrir a lo largo del corredor. |
| 2 | `turismo-deportivo` | Turismo Deportivo | Propuestas vinculadas con el deporte y la actividad física en distintos destinos del recorrido. |
| 3 | `caminos-del-vino` | Caminos del Vino | Bodegas, producción vitivinícola y experiencias relacionadas con el vino cordobés. |
| 4 | `camino-de-brochero` | Camino de Brochero | Patrimonio, localidades y experiencias vinculadas con el legado del Cura Brochero. |
| 5 | `turismo-cultural` | Turismo Cultural | Historia, identidad, patrimonio y expresiones culturales de las comunidades del corredor. |
| 6 | `senderismo` | Senderismo | Caminatas y senderos para conocer paisajes serranos, con propuestas de diferente dificultad. |
| 7 | `golf` | Golf | Canchas y experiencias de golf integradas a los destinos turísticos de Córdoba. |
| 8 | `turismo-religioso` | Turismo Religioso | Templos, celebraciones, patrimonio y recorridos vinculados con la fe y la historia religiosa. |
| 9 | `ruta-motorhome` | Ruta Motorhome | Recorrido y servicios de interés para quienes viajan por Córdoba en motorhome. |
| 10 | `parques-y-aventuras` | Parques y Aventuras | Parques, actividades recreativas y propuestas de aventura para disfrutar durante el viaje. |

Todos deben crearse inicialmente con estado `draft`, fuente oficial y fecha de verificación. Las asociaciones con localidades y contenidos se agregarán únicamente cuando estén respaldadas.

## 3. Localidades mencionadas, todavía no cargables como traza oficial

Las siguientes localidades aparecen de forma consistente en el folleto resumido y en coberturas del lanzamiento, pero su orden y pertenencia exacta a la traza deben cotejarse visualmente contra el mapa oficial antes de insertarlas como segmentos:

- Cruz del Eje;
- San Marcos Sierras;
- Villa de Soto;
- San Carlos Minas;
- Salsacate;
- Taninga;
- Villa Cura Brochero;
- Mina Clavero;
- Nono;
- Villa de Las Rosas;
- Villa Dolores;
- San Javier;
- La Paz;
- San Clemente;
- Los Reartes;
- Villa General Belgrano;
- Santa Rosa de Calamuchita;
- Villa del Dique;
- Embalse;
- La Cruz;
- Río de los Sauces;
- Alpa Corral;
- Achiras;
- Río Cuarto.

Este listado sirve para organizar la siguiente verificación; **no equivale aún al listado oficial completo de más de 50 localidades**.

## 4. Primera demostración funcional

La demostración inicial puede funcionar de manera honesta con:

1. una ficha del corredor en borrador;
2. las diez experiencias oficiales;
3. la fuente oficial y la fecha de revisión visibles en administración;
4. indicadores de contenido todavía incompleto;
5. ninguna ruta pública indexable hasta aprobar la calidad territorial;
6. una segunda carga posterior con localidades, tramos y asociaciones verificadas.

Esto permite demostrar la arquitectura y la navegación temática sin fabricar un mapa incompleto o dar indicaciones viales potencialmente incorrectas.

## 5. Criterios obligatorios para las cargas siguientes

- Cada afirmación territorial debe conservar URL, organismo y fecha de verificación.
- Datos operativos variables —horarios, tarifas, accesos, estado de caminos— requieren fuente fechada y aviso de vigencia.
- No atribuir automáticamente un atractivo o prestador a Ruta 100 por proximidad geográfica.
- Un prestador comercial debe entrar mediante la publicación real del directorio, no mediante contenido turístico inventado.
- Los datos dudosos permanecen en `draft` o `review`, nunca en `published`.
- La carga de desarrollo debe ser reversible e identificable por sitio y fuente.

## Próximo paso autorizado a solicitar

Preparar un script de carga inicial idempotente para **desarrollo**, limitado al corredor y las diez experiencias anteriores. El script deberá resolver el sitio `ruta100cordoba`, registrar la fuente oficial y dejar todo en borrador. No deberá modificar CalamuchitAr ni ejecutar escrituras automáticamente.
