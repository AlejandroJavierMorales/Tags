-- Muchi v2: expresiones de consumo presencial vinculadas al rubro gastronómico específico.
-- Migración aditiva e idempotente. No modifica rubros de prestadores.

INSERT INTO tags_ai_taxonomy_aliases
  (site_id,taxonomy_node_id,alias_value,normalized_alias,context_type,status,source_type)
SELECT s.id,n.id,a.alias_value,a.normalized_alias,'business','active','editorial'
  FROM tags_directory_sites s
  INNER JOIN tags_directory_taxonomy_nodes n
    ON (n.site_id=s.id OR n.site_id IS NULL)
   AND n.slug IN ('restoranes','restaurantes')
  INNER JOIN (
    SELECT 'dónde comer' AS alias_value,'donde comer' AS normalized_alias
    UNION ALL SELECT 'ir a comer','ir a comer'
    UNION ALL SELECT 'lugar para comer','lugar para comer'
    UNION ALL SELECT 'almorzar','almorzar'
    UNION ALL SELECT 'almuerzo','almuerzo'
    UNION ALL SELECT 'cenar','cenar'
    UNION ALL SELECT 'cena','cena'
    UNION ALL SELECT 'desayunar','desayunar'
    UNION ALL SELECT 'desayuno','desayuno'
    UNION ALL SELECT 'merendar','merendar'
    UNION ALL SELECT 'merienda','merienda'
    UNION ALL SELECT 'tomar un café','tomar un cafe'
    UNION ALL SELECT 'comer ahí','comer ahi'
  ) a
 WHERE s.code='calamuchitar'
   AND s.is_active=1
   AND n.is_active=1
   AND NOT EXISTS (
     SELECT 1
       FROM tags_ai_taxonomy_aliases existing
      WHERE existing.site_id=s.id
        AND existing.taxonomy_node_id=n.id
        AND existing.normalized_alias=a.normalized_alias
        AND existing.context_type='business'
   );

SELECT n.name rubro,a.alias_value,a.context_type,a.status
  FROM tags_ai_taxonomy_aliases a
  INNER JOIN tags_directory_taxonomy_nodes n ON n.id=a.taxonomy_node_id
  INNER JOIN tags_directory_sites s ON s.id=a.site_id
 WHERE s.code='calamuchitar'
   AND a.source_type='editorial'
   AND a.context_type='business'
 ORDER BY n.name,a.alias_value;
