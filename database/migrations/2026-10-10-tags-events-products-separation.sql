-- Separación comercial de Eventos y Eventos Pro.
-- No modifica eventos, asistentes, pagos ni configuraciones existentes.
-- Los clientes que ya tienen e_events conservan Eventos Pro.

ALTER TABLE tags_events
    ADD COLUMN product_code VARCHAR(30) NOT NULL DEFAULT 'e_events' AFTER business_id,
    ADD KEY idx_tags_events_business_product (business_id, product_code, status);

INSERT INTO tags_addons (
    code, name, description, addon_type, page_type, default_quantity,
    price, currency, is_active, is_public, sort_order, created_at
) VALUES (
    'events',
    'Eventos',
    'Conversatorios, capacitaciones, inscripciones, pagos y acreditación con QR.',
    'service', NULL, 1, 0, 'ARS', 1, 1, 84, NOW()
)
ON DUPLICATE KEY UPDATE
    name=VALUES(name),
    description=VALUES(description),
    addon_type=VALUES(addon_type),
    page_type=VALUES(page_type),
    default_quantity=VALUES(default_quantity),
    is_active=1,
    is_public=1,
    sort_order=VALUES(sort_order);

INSERT INTO tags_addons (
    code, name, description, addon_type, page_type, default_quantity,
    price, currency, is_active, is_public, sort_order, created_at
) VALUES (
    'e_events',
    'Eventos Pro',
    'Producción integral de eventos, invitados, invitaciones, mesas, staff y acreditación.',
    'service', NULL, 1, 0, 'ARS', 1, 1, 85, NOW()
)
ON DUPLICATE KEY UPDATE
    name=VALUES(name),
    description=VALUES(description),
    addon_type=VALUES(addon_type),
    page_type=VALUES(page_type),
    default_quantity=VALUES(default_quantity),
    is_active=1,
    is_public=1,
    sort_order=VALUES(sort_order);
