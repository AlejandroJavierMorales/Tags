-- CalamuchitAr: estructura canónica de rubros para "Dónde comer".
-- Migración aditiva e idempotente. No elimina asociaciones existentes.
-- Ejecutar primero en desarrollo y luego en producción.

START TRANSACTION;

INSERT INTO tags_directory_taxonomy_nodes
  (site_id,parent_id,name,slug,node_type,depth,description,sort_order,is_active)
SELECT NULL,g.id,seed.name,seed.slug,'category',g.depth+1,seed.description,seed.sort_order,1
FROM (
  SELECT 'Restaurantes' name,'restoranes' slug,'Restaurantes, comedores y establecimientos con atención gastronómica.' description,10 sort_order
  UNION ALL SELECT 'Comidas para llevar','comida-para-llevar','Comidas preparadas para retirar o pedir.',20
  UNION ALL SELECT 'Parrillas','parrillas','Parrillas y propuestas especializadas en carnes asadas.',30
  UNION ALL SELECT 'Cervecerías','bares-y-cervecerias','Cervecerías con atención al público, excluyendo fábricas sin atención gastronómica.',40
  UNION ALL SELECT 'Pizzerías','pizzerias','Pizzerías y locales cuya propuesta principal es la pizza.',50
) seed
INNER JOIN tags_directory_taxonomy_nodes g
  ON g.parent_id IS NULL AND g.slug='gastronomia' AND g.is_active=1
WHERE NOT EXISTS (
  SELECT 1
  FROM tags_directory_taxonomy_nodes existing
  WHERE existing.parent_id=g.id AND existing.slug=seed.slug
);

-- Normaliza solamente los títulos de las hojas canónicas. Conserva sus IDs y slugs.
UPDATE tags_directory_taxonomy_nodes node
INNER JOIN tags_directory_taxonomy_nodes parent ON parent.id=node.parent_id AND parent.slug='gastronomia'
SET node.name=CASE node.slug
  WHEN 'restoranes' THEN 'Restaurantes'
  WHEN 'comida-para-llevar' THEN 'Comidas para llevar'
  WHEN 'parrillas' THEN 'Parrillas'
  WHEN 'bares-y-cervecerias' THEN 'Cervecerías'
  WHEN 'pizzerias' THEN 'Pizzerías'
  ELSE node.name
END,
node.sort_order=CASE node.slug
  WHEN 'restoranes' THEN 10
  WHEN 'comida-para-llevar' THEN 20
  WHEN 'parrillas' THEN 30
  WHEN 'bares-y-cervecerias' THEN 40
  WHEN 'pizzerias' THEN 50
  ELSE node.sort_order
END
WHERE node.id>0
  AND node.slug IN ('restoranes','comida-para-llevar','parrillas','bares-y-cervecerias','pizzerias');

INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
SELECT node.id,node.id,0
FROM tags_directory_taxonomy_nodes node;

INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
SELECT ancestors.ancestor_id,node.id,ancestors.depth+1
FROM tags_directory_taxonomy_nodes node
INNER JOIN tags_directory_taxonomy_closure ancestors ON ancestors.descendant_id=node.parent_id;

COMMIT;

SELECT child.id,parent.name rubro_padre,child.name rubro,child.slug,child.is_active
FROM tags_directory_taxonomy_nodes child
INNER JOIN tags_directory_taxonomy_nodes parent ON parent.id=child.parent_id
WHERE parent.slug='gastronomia'
ORDER BY child.sort_order,child.name;
