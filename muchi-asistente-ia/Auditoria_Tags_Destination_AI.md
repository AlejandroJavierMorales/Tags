# Auditoría inicial — Tags Destination AI / Muchi

Fecha: 2026-09-24

## Resultado

Muchi puede integrarse reutilizando el chat y el directorio existentes. No corresponde tratarlo como el chatbot de un comercio: el destino se identifica por `tags_directory_sites.code` y sólo consulta fichas públicas publicadas de ese canal.

## Existente y reutilizado

- Chat y proveedor LLM: `app/modules/ai-chat/components/ChatWidget.jsx`, `ChatWindow.jsx`, `ChatMessage.jsx`, `app/api/ai/chat/route.js` y `server/openai.js`.
- Canales: `tags_directory_sites`, resueltos por `getDirectorySiteCodeByHost` en `app/modules/directory/lib/getDirectoryPublicData.js`.
- Fichas, relación comercial y visibilidad: `tags_directory_listings` + `tags_directory_site_listings`; `is_free=0` identifica abonados y `publication_status='published'` limita la exposición pública.
- Rubros, localidades, fotos y contactos públicos: tablas y consultas ya utilizadas por `getDirectoryPublicData.js`.
- Dominio propio: proxy en `cloudflare/directory-domain-proxy-worker.js` y contexto público mediante `X-Forwarded-Host`/`X-Tags-Public-Host`.
- Control de frecuencia, proveedor y consumo: infraestructura de `app/modules/ai-chat/server`.

## Implementado en este MVP

- Motor de presentación reutilizable por canal mediante `directory_config.destinationAssistant`.
- Muchi en la portada del directorio y página independiente `/muchi`.
- Soporte del host `muchi.calamuchita.ar` en middleware y Worker.
- Selección turista/residente conservada durante la conversación y cambio de las cuatro poses/vestimenta originales del demo.
- Parpadeo, saludo y movimiento de cola del demo, respetando `prefers-reduced-motion` desde los estilos existentes.
- Recuperación servidor de fichas públicas pertinentes, con abonados antes que fichas gratuitas entre resultados pertinentes.
- Tarjetas enlazadas a la ficha canónica del directorio, usando sólo foto de portada/galería; no se usa el logo como supuesta fotografía.
- Respuestas de sólo lectura. Datos desconocidos se presentan como “a consultar”; no se afirma reserva ni disponibilidad.
- Entrada por voz en turnos: grabación temporal en navegador, transcripción servidor y misma búsqueda del directorio. Por defecto Muchi responde por escrito; la administración del canal puede habilitar también la respuesta hablada. El audio no se persiste en Tags.

## Brechas aisladas (no simuladas)

- No existe todavía un contrato público único de disponibilidad entre Turnos, Resto, Store y Guest Experience. Este MVP no afirma cupos ni ejecuta operaciones.
- No se integraron clima, Google Places ni fuentes externas: requieren proveedor, costos, licencia y reglas de atribución aprobadas.
- Falta el panel administrativo específico de Destination AI, analytics por impresión/clic/consulta y límites comerciales por canal.
- Falta búsqueda semántica/RAG turístico con documentos oficiales versionados y trazabilidad de fuentes.
- Las tarjetas todavía no agrupan mapa ni cálculo de distancia; conservan coordenadas para esa etapa, pero no las presentan como distancia verificada.

## Contrato efectivo del MVP

- Entrada: `message`, `siteCode`, `mode` (`tourist`, `resident` o no elegido) e historial acotado.
- Candidato: identificador, nombre, rubros, localidad, relación (`subscriber`/`free`), foto pública, contacto y URL canónica.
- Salida: texto, candidatos verificables y consumo. No contiene confirmaciones transaccionales.
- Ranking: pertinencia textual obligatoria; luego abonado, destacado, orden editorial y nombre. Una ficha gratuita pertinente prevalece sobre un abonado no pertinente.

## Puesta en producción

1. Publicar el código y los ocho recursos de `public/assets/destination-ai/muchi`.
2. Ejecutar `database/migrations/2026-09-24-tags-destination-ai-calamuchitar-config.sql`.
3. Publicar la versión actualizada del Worker y asignarle también la ruta `muchi.calamuchita.ar/*`.
4. Crear en Cloudflare el registro proxied para `muchi` y comprobar que conserva `https://muchi.calamuchita.ar`.
5. Verificar `OPENAI_API_KEY` y `OPENAI_MODEL`, ya requeridos por el chat existente.

Configuración opcional de voz: `OPENAI_TRANSCRIBE_MODEL` (por defecto `gpt-transcribe`), `OPENAI_TTS_MODEL` (por defecto `gpt-4o-mini-tts`), `OPENAI_TTS_VOICE` (por defecto `coral`), `AI_AUDIO_MAX_BYTES` (por defecto 8 MB), `AI_TRANSCRIBE_COST_USD_PER_MINUTE` y `AI_TTS_COST_USD_PER_MINUTE`. Los valores iniciales de costo siguen las tarifas públicas consultadas al implementar y pueden sobrescribirse sin cambiar código.
