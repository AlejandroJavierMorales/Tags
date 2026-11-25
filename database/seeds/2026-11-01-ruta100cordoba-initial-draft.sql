-- Ruta 100 Cordoba - carga inicial verificada
-- Fecha: 2026-11-01
-- Estado: PREPARADA, NO EJECUTADA.
--
-- Alcance:
--   - una fuente oficial en borrador;
--   - el corredor Ruta 100 Cordoba en borrador;
--   - las diez experiencias oficiales en borrador;
--   - registros de auditoria idempotentes.
--
-- No carga localidades, tramos, geometria, imagenes ni contenido publico.
-- No cambia registros de CalamuchitAr.
-- No publica nada.
--
-- PROTECCION: este archivo solo admite las bases conocidas de desarrollo
-- `calamuchitar` y produccion `xncabaa4_calamuchitar`.
-- La comprobacion se realiza antes de iniciar la transaccion.

CREATE TEMPORARY TABLE ruta100_seed_environment_guard (
  allowed TINYINT NOT NULL,
  CONSTRAINT chk_ruta100_seed_environment CHECK (allowed = 1)
);

INSERT INTO ruta100_seed_environment_guard (allowed)
VALUES (IF(DATABASE() IN ('calamuchitar', 'xncabaa4_calamuchitar'), 1, 0));

SET @ruta100_site_id := (
  SELECT id
    FROM tags_directory_sites
   WHERE code = 'ruta100cordoba'
   LIMIT 1
);

INSERT INTO ruta100_seed_environment_guard (allowed)
VALUES (IF(@ruta100_site_id IS NOT NULL, 1, 0));

DROP TEMPORARY TABLE ruta100_seed_environment_guard;

START TRANSACTION;

-- Fuente oficial. Se conserva en draft hasta que la administracion permita
-- revisar y activar fuentes desde la interfaz.
INSERT INTO tags_ai_tourism_sources (
  site_id,
  business_id,
  name,
  source_kind,
  locality_id,
  locality_name,
  website_url,
  contact_json,
  status
)
SELECT
  @ruta100_site_id,
  NULL,
  'Agencia Córdoba Turismo - Ruta 100',
  'tourism_office',
  NULL,
  NULL,
  'https://cordobaturismo.gov.ar/ruta-100/',
  JSON_OBJECT(
    'organization', 'Agencia Córdoba Turismo',
    'document', 'Folleto Ruta 100-1',
    'verifiedAt', '2026-11-01'
  ),
  'draft'
WHERE NOT EXISTS (
  SELECT 1
    FROM tags_ai_tourism_sources
   WHERE site_id = @ruta100_site_id
     AND website_url = 'https://cordobaturismo.gov.ar/ruta-100/'
);

SET @ruta100_source_id := (
  SELECT id
    FROM tags_ai_tourism_sources
   WHERE site_id = @ruta100_site_id
     AND website_url = 'https://cordobaturismo.gov.ar/ruta-100/'
   ORDER BY id
   LIMIT 1
);

-- Corredor. Los extremos se expresan en el texto, pero start_place_id y
-- end_place_id permanecen NULL hasta validar su correspondencia exacta en
-- tags_geo_places.
INSERT IGNORE INTO tags_destination_corridors (
  site_id,
  code,
  slug,
  name,
  eyebrow,
  summary,
  description,
  start_place_id,
  end_place_id,
  distance_km,
  source_id,
  source_url,
  source_checked_at,
  status
)
VALUES (
  @ruta100_site_id,
  'ruta-100-cordoba',
  'ruta-100-cordoba',
  'Ruta 100 Córdoba',
  'La síntesis perfecta del turismo cordobés',
  'Un gran recorrido turístico de norte a sur que conecta destinos, paisajes, atractivos, pueblos y experiencias de Córdoba.',
  'La Ruta 100 Córdoba recorre 536 kilómetros entre Cruz del Eje y Río Cuarto. Convierte el camino en parte de la experiencia turística y articula destinos consolidados con localidades emergentes.',
  NULL,
  NULL,
  536.00,
  @ruta100_source_id,
  'https://cordobaturismo.gov.ar/ruta-100/',
  '2026-11-01',
  'draft'
);

-- En una segunda ejecucion solo completa evidencia faltante. No reemplaza
-- textos, distancia, estado ni ediciones realizadas desde administracion.
UPDATE tags_destination_corridors
   SET source_id = COALESCE(source_id, @ruta100_source_id),
       source_url = COALESCE(source_url, 'https://cordobaturismo.gov.ar/ruta-100/'),
       source_checked_at = COALESCE(source_checked_at, '2026-11-01')
 WHERE site_id = @ruta100_site_id
   AND code = 'ruta-100-cordoba'
   AND (source_id IS NULL OR source_url IS NULL OR source_checked_at IS NULL);

-- Diez experiencias oficiales. INSERT IGNORE evita duplicados por codigo o
-- slug y no modifica registros que hayan sido editados posteriormente.
INSERT IGNORE INTO tags_destination_experiences (
  site_id,
  code,
  slug,
  name,
  short_name,
  summary,
  sort_order,
  seo_title,
  seo_description,
  source_id,
  source_url,
  source_checked_at,
  status
)
SELECT @ruta100_site_id,'turismo-naturaleza','turismo-naturaleza','Turismo Naturaleza','Naturaleza','Paisajes, ríos, sierras y ambientes naturales para descubrir a lo largo del corredor.',1,'Turismo Naturaleza en Ruta 100 Córdoba','Paisajes y experiencias de naturaleza para descubrir a lo largo de Ruta 100 Córdoba.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'turismo-deportivo','turismo-deportivo','Turismo Deportivo','Deporte','Propuestas vinculadas con el deporte y la actividad física en distintos destinos del recorrido.',2,'Turismo Deportivo en Ruta 100 Córdoba','Propuestas deportivas para descubrir durante el recorrido de Ruta 100 Córdoba.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'caminos-del-vino','caminos-del-vino','Caminos del Vino','Vinos','Bodegas, producción vitivinícola y experiencias relacionadas con el vino cordobés.',3,'Caminos del Vino en Ruta 100 Córdoba','Bodegas y experiencias vinculadas con el vino cordobés a lo largo de Ruta 100.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'camino-de-brochero','camino-de-brochero','Camino de Brochero','Brochero','Patrimonio, localidades y experiencias vinculadas con el legado del Cura Brochero.',4,'Camino de Brochero en Ruta 100 Córdoba','Descubrí el patrimonio y las experiencias vinculadas con el legado del Cura Brochero.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'turismo-cultural','turismo-cultural','Turismo Cultural','Cultura','Historia, identidad, patrimonio y expresiones culturales de las comunidades del corredor.',5,'Turismo Cultural en Ruta 100 Córdoba','Historia, patrimonio e identidad cultural de las comunidades de Ruta 100 Córdoba.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'senderismo','senderismo','Senderismo','Senderismo','Caminatas y senderos para conocer paisajes serranos, con propuestas de diferente dificultad.',6,'Senderismo en Ruta 100 Córdoba','Senderos y caminatas para descubrir los paisajes de Ruta 100 Córdoba.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'golf','golf','Golf','Golf','Canchas y experiencias de golf integradas a los destinos turísticos de Córdoba.',7,'Golf en Ruta 100 Córdoba','Canchas y experiencias de golf en los destinos vinculados con Ruta 100 Córdoba.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'turismo-religioso','turismo-religioso','Turismo Religioso','Turismo Religioso','Templos, celebraciones, patrimonio y recorridos vinculados con la fe y la historia religiosa.',8,'Turismo Religioso en Ruta 100 Córdoba','Patrimonio, celebraciones y recorridos religiosos de Ruta 100 Córdoba.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'ruta-motorhome','ruta-motorhome','Ruta Motorhome','Motorhome','Recorrido y servicios de interés para quienes viajan por Córdoba en motorhome.',9,'Ruta Motorhome en Ruta 100 Córdoba','Información para recorrer los destinos de Ruta 100 Córdoba en motorhome.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft'
UNION ALL
SELECT @ruta100_site_id,'parques-y-aventuras','parques-y-aventuras','Parques y Aventuras','Aventura','Parques, actividades recreativas y propuestas de aventura para disfrutar durante el viaje.',10,'Parques y Aventuras en Ruta 100 Córdoba','Parques y propuestas de aventura para disfrutar durante el recorrido de Ruta 100 Córdoba.',@ruta100_source_id,'https://cordobaturismo.gov.ar/ruta-100/','2026-11-01','draft';

UPDATE tags_destination_experiences
   SET source_id = COALESCE(source_id, @ruta100_source_id),
       source_url = COALESCE(source_url, 'https://cordobaturismo.gov.ar/ruta-100/'),
       source_checked_at = COALESCE(source_checked_at, '2026-11-01')
 WHERE site_id = @ruta100_site_id
   AND code IN (
     'turismo-naturaleza',
     'turismo-deportivo',
     'caminos-del-vino',
     'camino-de-brochero',
     'turismo-cultural',
     'senderismo',
     'golf',
     'turismo-religioso',
     'ruta-motorhome',
     'parques-y-aventuras'
   )
   AND (source_id IS NULL OR source_url IS NULL OR source_checked_at IS NULL);

-- Auditoria idempotente del corredor.
INSERT INTO tags_destination_audit_log (
  site_id, entity_type, entity_id, action, actor_type, actor_id, summary, changes_json
)
SELECT
  @ruta100_site_id,
  'corridor',
  c.id,
  'seed.initial',
  'system',
  NULL,
  'Carga inicial verificada del corredor Ruta 100 Córdoba en estado borrador.',
  JSON_OBJECT('sourceId', @ruta100_source_id, 'status', c.status)
FROM tags_destination_corridors c
WHERE c.site_id = @ruta100_site_id
  AND c.code = 'ruta-100-cordoba'
  AND NOT EXISTS (
    SELECT 1
      FROM tags_destination_audit_log a
     WHERE a.site_id = @ruta100_site_id
       AND a.entity_type = 'corridor'
       AND a.entity_id = c.id
       AND a.action = 'seed.initial'
  );

-- Auditoria idempotente de las experiencias.
INSERT INTO tags_destination_audit_log (
  site_id, entity_type, entity_id, action, actor_type, actor_id, summary, changes_json
)
SELECT
  @ruta100_site_id,
  'experience',
  e.id,
  'seed.initial',
  'system',
  NULL,
  CONCAT('Carga inicial verificada de la experiencia ', e.name, ' en estado borrador.'),
  JSON_OBJECT('sourceId', @ruta100_source_id, 'status', e.status, 'sortOrder', e.sort_order)
FROM tags_destination_experiences e
WHERE e.site_id = @ruta100_site_id
  AND e.code IN (
    'turismo-naturaleza',
    'turismo-deportivo',
    'caminos-del-vino',
    'camino-de-brochero',
    'turismo-cultural',
    'senderismo',
    'golf',
    'turismo-religioso',
    'ruta-motorhome',
    'parques-y-aventuras'
  )
  AND NOT EXISTS (
    SELECT 1
      FROM tags_destination_audit_log a
     WHERE a.site_id = @ruta100_site_id
       AND a.entity_type = 'experience'
       AND a.entity_id = e.id
       AND a.action = 'seed.initial'
  );

COMMIT;

-- Verificacion posterior. Estas consultas no modifican datos.
SELECT id, code, name, primary_host
  FROM tags_directory_sites
 WHERE id = @ruta100_site_id;

SELECT id, name, source_kind, website_url, status
  FROM tags_ai_tourism_sources
 WHERE id = @ruta100_source_id;

SELECT id, code, slug, name, distance_km, status, source_id, source_checked_at
  FROM tags_destination_corridors
 WHERE site_id = @ruta100_site_id
 ORDER BY id;

SELECT id, code, slug, name, sort_order, status, source_id, source_checked_at
  FROM tags_destination_experiences
 WHERE site_id = @ruta100_site_id
 ORDER BY sort_order, id;

SELECT entity_type, action, COUNT(*) AS total
  FROM tags_destination_audit_log
 WHERE site_id = @ruta100_site_id
 GROUP BY entity_type, action
 ORDER BY entity_type, action;

-- Resultado esperado luego de la primera ejecucion:
--   1 fuente draft
--   1 corredor draft
--  10 experiencias draft
--  11 registros seed.initial en auditoria
