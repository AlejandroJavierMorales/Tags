-- Catálogo comercial de Tags Turnos.
-- Ejecutar después de la migración del núcleo si tags_addons todavía no contiene este código.
INSERT IGNORE INTO tags_addons (
    code,
    name,
    description,
    default_quantity,
    price,
    currency,
    is_active,
    is_public,
    sort_order,
    created_at
)
VALUES (
    'turnos',
    'Tags Turnos',
    'Reservas flexibles de servicios, profesionales, recursos y actividades.',
    1,
    0,
    'ARS',
    1,
    1,
    40,
    NOW()
);
