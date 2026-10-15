-- Elimina exclusivamente el rubro duplicado y vacío creado el 2026-10-06.
-- Conserva el rubro histórico ID 137 (`comidas-para-llevar`).

START TRANSACTION;

SET @duplicate_takeaway_id := (
  SELECT node.id
  FROM tags_directory_taxonomy_nodes node
  WHERE node.id=177
    AND node.slug='comida-para-llevar'
    AND node.image_url IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM tags_directory_listing_taxonomy assignment
      WHERE assignment.taxonomy_node_id=node.id
    )
  LIMIT 1
);

DELETE FROM tags_ai_search_location_categories
WHERE taxonomy_node_id=@duplicate_takeaway_id;

DELETE FROM tags_ai_search_item_categories
WHERE taxonomy_node_id=@duplicate_takeaway_id;

DELETE FROM tags_ai_taxonomy_aliases
WHERE taxonomy_node_id=@duplicate_takeaway_id;

DELETE FROM tags_ai_tourism_content_categories
WHERE taxonomy_node_id=@duplicate_takeaway_id;

DELETE FROM tags_directory_listing_taxonomy
WHERE taxonomy_node_id=@duplicate_takeaway_id;

DELETE FROM tags_directory_taxonomy_closure
WHERE ancestor_id=@duplicate_takeaway_id
   OR descendant_id=@duplicate_takeaway_id;

DELETE FROM tags_directory_taxonomy_nodes
WHERE id=@duplicate_takeaway_id;

SELECT ROW_COUNT() deleted_duplicate_category;

COMMIT;

SELECT id,parent_id,name,slug,image_url
FROM tags_directory_taxonomy_nodes
WHERE slug IN ('comida-para-llevar','comidas-para-llevar')
ORDER BY id;
