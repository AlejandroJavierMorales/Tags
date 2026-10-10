-- Tags Events - registro como addon contratable.
-- Ejecutar primero en desarrollo y luego en producción.
-- No modifica las tablas operativas de Events existentes.

INSERT INTO tags_addons (
    code, name, description, addon_type, page_type, default_quantity,
    price, currency, is_active, is_public, sort_order, created_at
) VALUES (
    'e_events',
    'Tags Events',
    'Eventos, inscripciones, asistentes, invitaciones y acreditación con QR.',
    'service', NULL, 1, 0, 'ARS', 1, 1, 85, NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    addon_type = VALUES(addon_type),
    page_type = VALUES(page_type),
    is_active = 1,
    is_public = 1,
    sort_order = VALUES(sort_order);
