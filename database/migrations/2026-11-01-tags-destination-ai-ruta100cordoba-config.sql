-- Habilita Ruti únicamente para el Directorio Ruta 100 Córdoba.
-- No modifica la configuración de CalamuchitAr.
UPDATE tags_directory_sites
SET directory_config = JSON_SET(
  COALESCE(NULLIF(directory_config, ''), '{}'),
  '$.destinationAssistant.enabled', TRUE,
  '$.destinationAssistant.assistantName', 'Ruti',
  '$.destinationAssistant.title', 'Ruti · Tu guía por Ruta 100 Córdoba',
  '$.destinationAssistant.subtitle', 'Pueblos, paisajes y experiencias',
  '$.destinationAssistant.greeting', '¡Hola! Soy Ruti. ¿Qué te gustaría descubrir por la Ruta 100 de Córdoba?',
  '$.destinationAssistant.primaryColor', '#6b2e0c',
  '$.destinationAssistant.characterTitle', '¡Hola! Soy Ruti!',
  '$.destinationAssistant.characterButtonLabel', 'Charlá con Ruti',
  '$.destinationAssistant.menuLabel', 'Charlá con Ruti'
)
WHERE code = 'ruta100cordoba';
