-- Tags Chatbot con IA - registro de herramienta contratable
-- No ejecutar automáticamente. Probar en desarrollo y revisar la estructura actual.
-- Reutiliza tags_addons y tags_business_addons; no crea un sistema paralelo.

INSERT INTO tags_addons (
    code, name, description, addon_type, page_type, default_quantity,
    price, currency, is_active, is_public, sort_order, created_at
) VALUES (
    'ai_chatbot',
    'Chatbot con IA',
    'Asistente conversacional para orientar a los visitantes de la Página Web.',
    'service', NULL, 1, 0, 'ARS', 1, 1, 75, NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    addon_type = VALUES(addon_type),
    page_type = VALUES(page_type),
    is_active = 1,
    is_public = 1,
    sort_order = VALUES(sort_order);
