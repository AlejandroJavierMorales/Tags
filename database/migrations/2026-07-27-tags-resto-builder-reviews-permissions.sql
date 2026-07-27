-- Permisos para el Builder de Tags Resto y la administración de Tags Reviews.
-- No modifica tablas ni datos de Tags Store.
INSERT IGNORE INTO tags_resto_permissions (code, module_key, module_name, description)
VALUES
('builder.view', 'builder', 'Builder', 'Visualizar el constructor de la página pública de Resto'),
('builder.manage', 'builder', 'Builder', 'Crear, editar, ordenar y ocultar bloques de Resto'),
('reviews.view', 'reviews', 'Opiniones', 'Consultar respuestas y métricas de Tags Reviews'),
('reviews.manage', 'reviews', 'Opiniones', 'Configurar formularios y moderar opiniones');
