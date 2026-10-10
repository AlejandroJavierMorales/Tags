# Instructivo para Work — Información turística de Muchi

## Objetivo

Relevar información pública y verificable de las localidades del Valle de Calamuchita y completar la plantilla oficial de Muchi. Work carga información encontrada en fuentes públicas; no debe afirmar que una oficina entregó directamente los datos salvo que exista confirmación expresa.

## Fuentes admitidas

Priorizar, en este orden:

1. Sitios oficiales de municipalidades y comunas.
2. Sitios oficiales de oficinas o secretarías de turismo.
3. Redes sociales oficiales del organismo, únicamente para fechas o novedades no publicadas en su web.
4. Sitios oficiales de museos, parques, reservas o prestadores responsables.
5. Otras fuentes solamente para detectar información que luego deberá quedar marcada como pendiente de confirmar.

No usar como confirmación automática textos generados por IA, blogs sin autor identificado, agregadores, resultados resumidos de buscadores ni publicaciones antiguas sin fecha.

## Procedimiento

1. Descargar desde la administración del directorio la plantilla `muchi-informacion-turistica-3.0.xlsx`.
2. Trabajar únicamente en la hoja `INFORMACIÓN TURÍSTICA`.
3. Crear una fila por cada paseo, atractivo, actividad, excursión, acceso, museo o evento.
4. Asignar un `Código único` estable, en minúsculas y sin depender del año salvo que sea un evento de una edición específica. Ejemplos: `vgb-museo-historico`, `los-reartes-rio-el-chamico`, `santa-rosa-fiesta-primavera-2027`.
5. Copiar únicamente información que esté publicada. Lo que no se encuentre debe quedar vacío y anotarse en `Datos pendientes de confirmar`.
6. Indicar la URL exacta de la página consultada, no solamente la portada del sitio.
7. Registrar la fecha real de consulta.
8. Mantener `Responsable de carga` como `Work` y `Forma de obtención` como `Relevamiento web`.
9. Seleccionar el rubro desde la lista de la plantilla. No escribir rubros nuevos.
10. Ejecutar `Revisar archivo sin importar`. Corregir todas las filas con errores antes de confirmar la importación.

## Campos obligatorios y campos opcionales

El importador exige solamente estos datos generales:

- `Código único`.
- `Oficina o institución`.
- `Nombre`.
- `Tipo de contenido`.
- `Rubro principal`, seleccionado entre las hojas finales del árbol.

Para un evento también son obligatorias `Fecha y hora de inicio` y `Fecha y hora de finalización`.

Los demás campos pueden quedar vacíos cuando la fuente no publica el dato. En particular, no son obligatorios horarios, precios, coordenadas, teléfonos, imágenes, accesibilidad, duración ni capacidad. Un campo Sí/No vacío se conserva como desconocido: nunca debe interpretarse automáticamente como `No`.

## Rubros turísticos

`Tipo de contenido` y `Rubro principal` cumplen funciones distintas. El tipo indica si el registro es un paseo, evento, museo, sendero u otra clase de contenido. El rubro lo conecta con el árbol general que utiliza Muchi para buscar y filtrar.

Por ese motivo, el rubro principal no puede quedar vacío y debe ser una hoja final. Si faltan hojas como Museos, Patrimonio, Senderos, Reservas naturales o Fiestas y eventos, primero deben agregarse a la taxonomía del directorio y después volver a descargarse la plantilla. No debe elegirse un rubro comercial incorrecto solamente para poder importar.

## Formatos admitidos

- Fechas: `DD/MM/AAAA` o `AAAA-MM-DD`.
- Fechas con hora: `DD/MM/AAAA HH:MM` o `AAAA-MM-DD HH:MM`.
- Coordenadas: números decimales; se admite punto o coma decimal. Latitud y longitud deben completarse juntas.
- Teléfono y WhatsApp: texto con código de área. Se admite el prefijo internacional, por ejemplo `+54`.
- Días y horarios: texto comprensible, por ejemplo `Martes a domingo de 10:00 a 18:00`.
- Imágenes adicionales: nombres exactos de archivo separados por punto y coma (`;`).
- Fuentes: URLs exactas separadas por punto y coma (`;`) cuando más de una página respalda el mismo registro.
- Precios: solamente números, sin símbolo monetario. La moneda se selecciona en su propia columna.

## Fuente, responsable y organizador

`Oficina o institución` identifica de dónde proviene la información. No implica que esa institución opere la actividad. `Responsable o prestador` identifica a quien administra el lugar o presta el servicio. En eventos, `Organizador` identifica a quien produce u organiza la edición. Los tres datos pueden ser diferentes.

Cuando Work releva una web oficial, debe mantener `Responsable de carga = Work` y `Forma de obtención = Relevamiento web`. Esto no equivale a una confirmación directa de la oficina o del prestador.

## Actualización sin duplicados

La plantilla descargada incluye la hoja `REGISTROS EXISTENTES`, con los códigos únicos ya cargados en el directorio. Para actualizar un registro se debe copiar exactamente su código a `INFORMACIÓN TURÍSTICA` y usar `Crear o actualizar`. Para un registro nuevo se crea un código estable, en minúsculas, con números y guiones.

El código no debe modificarse por un cambio de nombre, descripción o fuente. Los eventos de ediciones independientes sí pueden incluir el año, por ejemplo `los-reartes-fiesta-patronal-2027`.

## Reglas para no inventar información

- No inferir horarios, precios, accesibilidad, dificultad, duración, edades, reservas ni coordenadas.
- No convertir recomendaciones de terceros en afirmaciones oficiales.
- No presentar como vigente un evento de años anteriores.
- No asumir que una actividad es gratuita porque no se encontró un precio.
- No copiar descripciones promocionales extensas: resumir hechos útiles y conservar la URL de origen.
- No marcar `Confirmado por la institución` si la información solamente fue encontrada en la web.

## Estados de verificación

- `Fuente oficial`: información encontrada en una web o red oficial vigente.
- `Pendiente de confirmación`: fuente incompleta, ambigua o no oficial.
- `Confirmado por la institución`: confirmación directa y documentada.
- `Confirmado por el prestador`: confirmación directa del responsable.
- `Desactualizado`: la fuente existe, pero sus datos dejaron de ser confiables o vigentes.

## Eventos

Un evento debe tener fecha de inicio y finalización. Si solamente se encuentra una edición anterior, no debe cargarse como próximo. Puede archivarse como antecedente, pero no publicarse. Si fue cancelado, suspendido o reprogramado, completar el estado correspondiente y conservar la fuente que lo informa.

## Imágenes

Escribir el nombre exacto de cada archivo, por ejemplo `museo-historico.jpg`. No pegar imágenes dentro del Excel. En la pantalla de importación, seleccionar el Excel y luego todas las imágenes mencionadas. La vista previa informará si falta algún archivo. Al confirmar, la plataforma corrige la orientación, limita cada imagen a 1200 × 1200 px, la convierte a WebP y la asocia al registro correspondiente. Si no hay autorización clara de uso, dejar el campo vacío y anotarlo como pendiente.

## Resultado esperado

Cada fila debe permitir que Muchi responda qué es el lugar, dónde queda, qué se puede hacer, para quién es recomendable, cuándo está disponible, cuánto cuesta si está publicado, cómo contactar o reservar y cuál es la fuente que respalda la respuesta.

## Primera prueba: Los Reartes

- Completar exclusivamente registros de Los Reartes y conservar sin cambios las hojas auxiliares.
- No usar `z_calamuchita` como localidad de un atractivo.
- Dejar desconocido vacío y detallarlo en `Datos pendientes de confirmar`.
- Entregar todos los registros con `Estado de publicación = En revisión`.
- Incluir coordenadas únicamente cuando una fuente las respalde. Sin ambas coordenadas el contenido no se muestra como punto del mapa.
- Dejar imágenes pendientes cuando no exista autorización clara de publicación.
- Cargar como próximos solamente eventos con fechas futuras verificadas. Una edición vencida puede conservarse como antecedente, pero no publicarse como vigente.
