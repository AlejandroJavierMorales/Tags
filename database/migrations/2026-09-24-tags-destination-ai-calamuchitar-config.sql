-- Configura Muchi sobre el JSON existente del canal. No crea tablas ni claves foráneas.
-- Es idempotente: puede ejecutarse más de una vez.
UPDATE tags_directory_sites
SET directory_config = JSON_SET(
  COALESCE(directory_config, JSON_OBJECT()),
  '$.destinationAssistant', JSON_OBJECT(
    'enabled', TRUE,
    'title', 'Muchi · Tu asistente del Valle',
    'subtitle', 'Información real del directorio',
    'greeting', '¡Hola! Soy Muchi. ¿Estás de visita o vivís en Calamuchita?',
    'primaryColor', '#1b6d4b',
    'launcherPrompt', '¡Hola! ¿Te ayudo?',
    'launcherOffsetBottom', 12,
    'position', 'right',
    'interactionMode', 'voice_text',
    'voiceResponseEnabled', FALSE,
    'limitEnabled', FALSE,
    'monthlyUsdLimit', 0,
    'warningPercent', 80,
    'extraUsdAllowance', 0
  )
)
WHERE code = 'calamuchitar';

SELECT id, code, name, primary_host,
       JSON_EXTRACT(directory_config, '$.destinationAssistant') AS destination_assistant
FROM tags_directory_sites
WHERE code = 'calamuchitar';
