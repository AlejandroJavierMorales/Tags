-- Alta independiente del Directorio Ruta 100 Córdoba.
-- No copia prestadores, usuarios, rubros comerciales ni configuraciones de CalamuchitAr.
-- Compatible con MariaDB 10.11. Ejecutar manualmente en desarrollo y luego en producción.

INSERT INTO tags_directory_sites
  (code,name,primary_host,brand_config,seo_config,directory_config,is_active)
VALUES (
  'ruta100cordoba',
  'Ruta 100 Córdoba',
  'ruta100cordoba.com',
  JSON_OBJECT(
    'displayName','Ruta 100 Córdoba',
    'logoUrl','/assets/icons/Ruta100Cordoba_512.png',
    'faviconUrl','/assets/icons/Ruta100Cordoba_Favicon.ico',
    'slogan','Descubrí Córdoba por la Ruta 100',
    'primaryColor','#481800',
    'secondaryColor','#f09018',
    'accentColor','#f0a818',
    'surfaceColor','#fff0d8'
  ),
  JSON_OBJECT(
    'defaultTitle','Ruta 100 Córdoba | Comercios, servicios y experiencias',
    'defaultDescription','Descubrí comercios, servicios, lugares y experiencias de Córdoba por la Ruta 100.',
    'defaultLocale','es_AR',
    'themeColor','#481800',
    'openGraphImage','https://ruta100cordoba.com/assets/icons/Ruta100Cordoba_512.png'
  ),
  JSON_OBJECT(
    'mapProvider','google',
    'territoryName','Ruta 100 Córdoba',
    'destinationAssistant',JSON_OBJECT('enabled',FALSE,'voiceResponseEnabled',FALSE)
  ),
  1
)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  primary_host=VALUES(primary_host),
  is_active=VALUES(is_active),
  updated_at=CURRENT_TIMESTAMP;

-- Verificación:
SELECT id,code,name,primary_host,brand_config,seo_config,directory_config,is_active
FROM tags_directory_sites
WHERE code='ruta100cordoba';

-- Rollback manual únicamente si todavía no se asociaron datos al sitio:
-- DELETE FROM tags_directory_sites WHERE code='ruta100cordoba';
