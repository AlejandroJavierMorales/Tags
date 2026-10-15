-- CalamuchitAr / Muchi - ampliación de rubros turísticos, gastronómicos y de agenda.
-- Migración aditiva e idempotente. Conserva los IDs y asociaciones existentes.
-- No duplica Restaurantes: mantiene el rubro histórico `restoranes` y agrega alias.
-- Ejecutar manualmente primero en desarrollo y luego en producción.

START TRANSACTION;

-- Raíces requeridas. Turismo y Gastronomía ya existen en CalamuchitAr; los INSERT
-- permiten ejecutar el archivo también en una instalación nueva sin hardcodear IDs.
INSERT INTO tags_directory_taxonomy_nodes
  (site_id,parent_id,name,slug,node_type,depth,description,sort_order,is_active)
SELECT NULL,NULL,seed.name,seed.slug,'category',0,seed.description,seed.sort_order,1
  FROM (
    SELECT 'Turismo' name,'turismo' slug,'Alojamientos, atractivos, actividades y servicios turísticos.' description,20 sort_order
    UNION ALL SELECT 'Gastronomia','gastronomia','Comercios y propuestas gastronómicas.',10
    UNION ALL SELECT 'Eventos y agenda','eventos-y-agenda','Eventos vigentes, fiestas, encuentros y actividades con fecha.',30
  ) seed
 WHERE NOT EXISTS (
   SELECT 1 FROM tags_directory_taxonomy_nodes n
    WHERE n.parent_id IS NULL AND n.slug=seed.slug
 );

INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
SELECT id,id,0 FROM tags_directory_taxonomy_nodes;

-- Primer nivel. Se conserva Actividades de Recreación y Alojamientos existentes.
INSERT INTO tags_directory_taxonomy_nodes
  (site_id,parent_id,name,slug,node_type,depth,description,sort_order,is_active)
SELECT NULL,parent.id,seed.name,seed.slug,'category',parent.depth+1,seed.description,seed.sort_order,1
  FROM (
    SELECT 'turismo' parent_slug,'Atractivos y lugares de interés' name,'atractivos-y-lugares-de-interes' slug,'Lugares públicos, naturales, históricos y culturales que pueden visitarse.' description,30 sort_order
    UNION ALL SELECT 'turismo','Servicios turísticos','servicios-turisticos','Organizaciones y prestadores que facilitan la experiencia turística.',40
    UNION ALL SELECT 'turismo','Información turística','informacion-turistica','Información pública y recomendaciones oficiales para visitantes.',50
    UNION ALL SELECT 'gastronomia','Parrillas','parrillas','Parrillas y propuestas de carnes asadas.',30
    UNION ALL SELECT 'gastronomia','Pizzerías','pizzerias','Pizzerías y locales que publican pizza como propuesta principal.',40
    UNION ALL SELECT 'gastronomia','Bares y cervecerías','bares-y-cervecerias','Bares, pubs y cervecerías con atención al público.',50
    UNION ALL SELECT 'gastronomia','Cafeterías y casas de té','cafeterias-y-casas-de-te','Cafeterías, casas de té y propuestas para merendar.',60
    UNION ALL SELECT 'gastronomia','Meriendas y desayunos','meriendas-y-desayunos','Propuestas especializadas en desayunos y meriendas.',70
    UNION ALL SELECT 'gastronomia','Comidas rápidas','comidas-rapidas','Locales de comidas rápidas.',80
    UNION ALL SELECT 'gastronomia','Comidas para llevar','comidas-para-llevar','Locales con comida preparada para retirar.',90
    UNION ALL SELECT 'eventos-y-agenda','Eventos culturales','eventos-culturales','Encuentros artísticos, culturales y educativos.',10
    UNION ALL SELECT 'eventos-y-agenda','Fiestas tradicionales y populares','fiestas-tradicionales-y-populares','Fiestas patronales, veladas criollas y celebraciones tradicionales.',20
    UNION ALL SELECT 'eventos-y-agenda','Eventos deportivos','eventos-deportivos','Competencias y encuentros deportivos con fecha.',30
    UNION ALL SELECT 'eventos-y-agenda','Ferias y exposiciones','ferias-y-exposiciones','Ferias, muestras y exposiciones.',40
    UNION ALL SELECT 'eventos-y-agenda','Encuentros y congresos','encuentros-y-congresos','Encuentros temáticos, jornadas y congresos.',50
    UNION ALL SELECT 'eventos-y-agenda','Música y espectáculos','musica-y-espectaculos','Recitales, música en vivo y espectáculos.',60
    UNION ALL SELECT 'eventos-y-agenda','Eventos gastronómicos','eventos-gastronomicos','Fiestas, festivales y encuentros gastronómicos.',70
    UNION ALL SELECT 'eventos-y-agenda','Actividades infantiles y familiares','actividades-infantiles-y-familiares','Eventos y actividades programadas para niños y familias.',80
  ) seed
  INNER JOIN tags_directory_taxonomy_nodes parent
    ON parent.parent_id IS NULL AND parent.slug=seed.parent_slug AND parent.is_active=1
 WHERE NOT EXISTS (
   SELECT 1 FROM tags_directory_taxonomy_nodes existing
    WHERE existing.parent_id=parent.id AND existing.slug=seed.slug
 );

INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
SELECT id,id,0 FROM tags_directory_taxonomy_nodes;
INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
SELECT ancestors.ancestor_id,node.id,ancestors.depth+1
  FROM tags_directory_taxonomy_nodes node
  INNER JOIN tags_directory_taxonomy_closure ancestors ON ancestors.descendant_id=node.parent_id;

-- Hojas de atractivos, actividades existentes, servicios y eventos deportivos.
INSERT INTO tags_directory_taxonomy_nodes
  (site_id,parent_id,name,slug,node_type,depth,description,sort_order,is_active)
SELECT NULL,parent.id,seed.name,seed.slug,'category',parent.depth+1,seed.description,seed.sort_order,1
  FROM (
    SELECT 'atractivos-y-lugares-de-interes' parent_slug,'Cerros y miradores' name,'cerros-y-miradores' slug,'Cerros, miradores y puntos panorámicos.' description,10 sort_order
    UNION ALL SELECT 'atractivos-y-lugares-de-interes','Senderos y caminatas','senderos-y-caminatas','Senderos peatonales y caminatas autoguiadas.',20
    UNION ALL SELECT 'atractivos-y-lugares-de-interes','Circuitos y recorridos','circuitos-y-recorridos','Circuitos y recorridos con uno o más puntos de interés.',30
    UNION ALL SELECT 'atractivos-y-lugares-de-interes','Ríos, balnearios y accesos','rios-balnearios-y-accesos','Balnearios, playas, costas y accesos públicos al río.',40
    UNION ALL SELECT 'atractivos-y-lugares-de-interes','Reservas y parques naturales','reservas-y-parques-naturales','Reservas, áreas protegidas y parques naturales.',50
    UNION ALL SELECT 'atractivos-y-lugares-de-interes','Patrimonio histórico','patrimonio-historico','Sitios y construcciones de valor histórico.',60
    UNION ALL SELECT 'atractivos-y-lugares-de-interes','Museos y centros culturales','museos-y-centros-culturales','Museos, salas, centros culturales y espacios de interpretación.',70
    UNION ALL SELECT 'atractivos-y-lugares-de-interes','Plazas y espacios públicos','plazas-y-espacios-publicos','Plazas, parques urbanos y espacios públicos de paseo.',80
    UNION ALL SELECT 'actividades-de-recreacion','Visitas guiadas','visitas-guiadas','Visitas guiadas públicas o privadas.',60
    UNION ALL SELECT 'actividades-de-recreacion','Trekking','trekking','Caminatas de trekking organizadas o con información de dificultad.',70
    UNION ALL SELECT 'actividades-de-recreacion','Cabalgatas','cabalgatas','Paseos y excursiones a caballo.',80
    UNION ALL SELECT 'actividades-de-recreacion','Cicloturismo y mountain bike','cicloturismo-y-mountain-bike','Paseos, circuitos y experiencias en bicicleta.',90
    UNION ALL SELECT 'actividades-de-recreacion','Actividades náuticas','actividades-nauticas','Kayak, navegación y otras actividades acuáticas.',100
    UNION ALL SELECT 'actividades-de-recreacion','Turismo aventura','turismo-aventura','Experiencias de aventura y actividades de naturaleza.',110
    UNION ALL SELECT 'servicios-turisticos','Agencias y operadores turísticos','agencias-y-operadores-turisticos','Agencias, receptivos y operadores de excursiones.',10
    UNION ALL SELECT 'servicios-turisticos','Oficinas de turismo','oficinas-de-turismo','Oficinas, secretarías y puntos de información turística.',20
    UNION ALL SELECT 'eventos-deportivos','Running','running','Carreras pedestres, trail running y pruebas similares.',10
    UNION ALL SELECT 'eventos-deportivos','Mountain bike y ciclismo','mountain-bike-y-ciclismo','Competencias y encuentros de mountain bike o ciclismo.',20
    UNION ALL SELECT 'eventos-deportivos','Otros eventos deportivos','otros-eventos-deportivos','Eventos deportivos que no pertenecen a las disciplinas anteriores.',30
  ) seed
  INNER JOIN tags_directory_taxonomy_nodes parent ON parent.slug=seed.parent_slug AND parent.is_active=1
 WHERE NOT EXISTS (
   SELECT 1 FROM tags_directory_taxonomy_nodes existing
    WHERE existing.parent_id=parent.id AND existing.slug=seed.slug
 );

INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
SELECT id,id,0 FROM tags_directory_taxonomy_nodes;
INSERT IGNORE INTO tags_directory_taxonomy_closure (ancestor_id,descendant_id,depth)
SELECT ancestors.ancestor_id,node.id,ancestors.depth+1
  FROM tags_directory_taxonomy_nodes node
  INNER JOIN tags_directory_taxonomy_closure ancestors ON ancestors.descendant_id=node.parent_id;

-- Sinónimos del lenguaje natural. Son específicos de CalamuchitAr aunque los rubros sean globales.
INSERT INTO tags_ai_taxonomy_aliases
  (site_id,taxonomy_node_id,alias_value,normalized_alias,context_type,status,source_type)
SELECT site.id,node.id,seed.alias_value,seed.normalized_alias,seed.context_type,'active','editorial'
  FROM tags_directory_sites site
  INNER JOIN (
    SELECT 'restoranes' node_slug,'restaurante' alias_value,'restaurante' normalized_alias,'business' context_type
    UNION ALL SELECT 'restoranes','restaurantes','restaurantes','business'
    UNION ALL SELECT 'restoranes','dónde almorzar','donde almorzar','business'
    UNION ALL SELECT 'restoranes','dónde cenar','donde cenar','business'
    UNION ALL SELECT 'cafeterias-y-casas-de-te','cafetería','cafeteria','business'
    UNION ALL SELECT 'cafeterias-y-casas-de-te','casa de té','casa de te','business'
    UNION ALL SELECT 'meriendas-y-desayunos','merendar','merendar','business'
    UNION ALL SELECT 'meriendas-y-desayunos','desayunar','desayunar','business'
    UNION ALL SELECT 'paseos','pasear','pasear','tourism'
    UNION ALL SELECT 'paseos','lugar para pasear','lugar para pasear','tourism'
    UNION ALL SELECT 'cerros-y-miradores','punto panorámico','punto panoramico','tourism'
    UNION ALL SELECT 'senderos-y-caminatas','sendero','sendero','tourism'
    UNION ALL SELECT 'senderos-y-caminatas','caminata','caminata','tourism'
    UNION ALL SELECT 'circuitos-y-recorridos','recorrido','recorrido','tourism'
    UNION ALL SELECT 'rios-balnearios-y-accesos','ir al río','ir al rio','tourism'
    UNION ALL SELECT 'reservas-y-parques-naturales','reserva natural','reserva natural','tourism'
    UNION ALL SELECT 'museos-y-centros-culturales','museo','museo','tourism'
    UNION ALL SELECT 'visitas-guiadas','visita guiada','visita guiada','tourism'
    UNION ALL SELECT 'excursiones','excursión','excursion','tourism'
    UNION ALL SELECT 'eventos-culturales','evento cultural','evento cultural','tourism'
    UNION ALL SELECT 'fiestas-tradicionales-y-populares','velada criolla','velada criolla','tourism'
    UNION ALL SELECT 'eventos-deportivos','evento deportivo','evento deportivo','tourism'
    UNION ALL SELECT 'running','carrera','carrera','tourism'
    UNION ALL SELECT 'mountain-bike-y-ciclismo','mountain bike','mountain bike','tourism'
    UNION ALL SELECT 'ferias-y-exposiciones','feria','feria','tourism'
    UNION ALL SELECT 'musica-y-espectaculos','recital','recital','tourism'
  ) seed
  INNER JOIN tags_directory_taxonomy_nodes node ON node.slug=seed.node_slug AND node.is_active=1
 WHERE site.code='calamuchitar'
   AND site.is_active=1
   AND NOT EXISTS (
     SELECT 1 FROM tags_ai_taxonomy_aliases existing
      WHERE existing.site_id=site.id
        AND existing.taxonomy_node_id=node.id
        AND existing.normalized_alias=seed.normalized_alias
        AND existing.context_type=seed.context_type
   );

-- El texto anterior mencionaba la infraestructura interna. Se modifica solamente
-- cuando conserva el valor viejo, respetando cualquier personalización posterior.
UPDATE tags_directory_sites
   SET directory_config=JSON_SET(
     COALESCE(directory_config,JSON_OBJECT()),
     '$.destinationAssistant.subtitle',
     'Tu guía para descubrir Calamuchita'
   )
 WHERE code='calamuchitar'
   AND (
     JSON_EXTRACT(COALESCE(directory_config,JSON_OBJECT()),'$.destinationAssistant.subtitle') IS NULL
     OR JSON_UNQUOTE(JSON_EXTRACT(directory_config,'$.destinationAssistant.subtitle'))='Información real del directorio'
   );

COMMIT;

-- Verificación: muestra únicamente las ramas ampliadas.
SELECT root.name raiz,parent.name superior,node.name rubro,node.slug,node.depth
  FROM tags_directory_taxonomy_nodes node
  LEFT JOIN tags_directory_taxonomy_nodes parent ON parent.id=node.parent_id
  LEFT JOIN tags_directory_taxonomy_closure closure_root ON closure_root.descendant_id=node.id
  LEFT JOIN tags_directory_taxonomy_nodes root ON root.id=closure_root.ancestor_id AND root.parent_id IS NULL
 WHERE root.slug IN ('turismo','gastronomia','eventos-y-agenda')
 ORDER BY root.name,node.depth,parent.name,node.sort_order,node.name;
