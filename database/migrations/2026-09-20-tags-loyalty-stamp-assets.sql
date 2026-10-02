-- Galería de sellos de Tags Fidelización.
-- No se crean claves foráneas contra tablas legacy.

CREATE TABLE IF NOT EXISTS tags_loyalty_stamp_assets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    image_url TEXT NOT NULL,
    storage_path VARCHAR(500) NULL,
    mime_type VARCHAR(100) NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'business',
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_by_user_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_loyalty_stamp_asset_scope (business_id, status, sort_order),
    KEY idx_tags_loyalty_stamp_asset_source (source, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Galería inicial provista por la plataforma. La carga es idempotente por URL.
INSERT INTO tags_loyalty_stamp_assets
    (business_id,name,image_url,source,status,sort_order)
SELECT NULL,seed.name,seed.image_url,'platform','active',seed.sort_order
  FROM (
            SELECT 'barberia' AS name, '/assets/fidelizacion/sellos/barberia.png' AS image_url, 0 AS sort_order
            UNION ALL
            SELECT 'beauty-care', '/assets/fidelizacion/sellos/beauty-care.png', 1
            UNION ALL
            SELECT 'bicicleta', '/assets/fidelizacion/sellos/bicicleta.png', 2
            UNION ALL
            SELECT 'caballo', '/assets/fidelizacion/sellos/caballo.png', 3
            UNION ALL
            SELECT 'cabeza-de-caballo-en-herradura', '/assets/fidelizacion/sellos/cabeza-de-caballo-en-herradura.png', 4
            UNION ALL
            SELECT 'cafe', '/assets/fidelizacion/sellos/cafe.png', 5
            UNION ALL
            SELECT 'cafe2', '/assets/fidelizacion/sellos/cafe2.png', 6
            UNION ALL
            SELECT 'camping', '/assets/fidelizacion/sellos/camping.png', 7
            UNION ALL
            SELECT 'cartel-de-hotel', '/assets/fidelizacion/sellos/cartel-de-hotel.png', 8
            UNION ALL
            SELECT 'coche', '/assets/fidelizacion/sellos/coche.png', 9
            UNION ALL
            SELECT 'comida-rapida', '/assets/fidelizacion/sellos/comida-rapida.png', 10
            UNION ALL
            SELECT 'corte-de-pelo-2', '/assets/fidelizacion/sellos/corte-de-pelo-2.png', 11
            UNION ALL
            SELECT 'corte-de-pelo', '/assets/fidelizacion/sellos/corte-de-pelo.png', 12
            UNION ALL
            SELECT 'cucurucho-de-helado', '/assets/fidelizacion/sellos/cucurucho-de-helado.png', 13
            UNION ALL
            SELECT 'cupon-de-descuento', '/assets/fidelizacion/sellos/cupon-de-descuento.png', 14
            UNION ALL
            SELECT 'customer-loyalty', '/assets/fidelizacion/sellos/customer-loyalty.png', 15
            UNION ALL
            SELECT 'desayuno', '/assets/fidelizacion/sellos/desayuno.png', 16
            UNION ALL
            SELECT 'descuento-1', '/assets/fidelizacion/sellos/descuento-1.png', 17
            UNION ALL
            SELECT 'descuento-2', '/assets/fidelizacion/sellos/descuento-2.png', 18
            UNION ALL
            SELECT 'descuento', '/assets/fidelizacion/sellos/descuento.png', 19
            UNION ALL
            SELECT 'excursionismo', '/assets/fidelizacion/sellos/excursionismo.png', 20
            UNION ALL
            SELECT 'facial-massage', '/assets/fidelizacion/sellos/facial-massage.png', 21
            UNION ALL
            SELECT 'hamburguesa-con-queso', '/assets/fidelizacion/sellos/hamburguesa-con-queso.png', 22
            UNION ALL
            SELECT 'heart', '/assets/fidelizacion/sellos/heart.png', 23
            UNION ALL
            SELECT 'helado', '/assets/fidelizacion/sellos/helado.png', 24
            UNION ALL
            SELECT 'herramienta-de-corte-de-pelo', '/assets/fidelizacion/sellos/herramienta-de-corte-de-pelo.png', 25
            UNION ALL
            SELECT 'instrumentos', '/assets/fidelizacion/sellos/instrumentos.png', 26
            UNION ALL
            SELECT 'loyalty', '/assets/fidelizacion/sellos/loyalty.png', 27
            UNION ALL
            SELECT 'manicure', '/assets/fidelizacion/sellos/manicure.png', 28
            UNION ALL
            SELECT 'massage', '/assets/fidelizacion/sellos/massage.png', 29
            UNION ALL
            SELECT 'medal', '/assets/fidelizacion/sellos/medal.png', 30
            UNION ALL
            SELECT 'menu-5', '/assets/fidelizacion/sellos/menu-5.png', 31
            UNION ALL
            SELECT 'paleta-de-hielo', '/assets/fidelizacion/sellos/paleta-de-hielo.png', 32
            UNION ALL
            SELECT 'pancho-1', '/assets/fidelizacion/sellos/pancho-1.png', 33
            UNION ALL
            SELECT 'pancho', '/assets/fidelizacion/sellos/pancho.png', 34
            UNION ALL
            SELECT 'peinado', '/assets/fidelizacion/sellos/peinado.png', 35
            UNION ALL
            SELECT 'refresco', '/assets/fidelizacion/sellos/refresco.png', 36
            UNION ALL
            SELECT 'review', '/assets/fidelizacion/sellos/review.png', 37
            UNION ALL
            SELECT 'soda', '/assets/fidelizacion/sellos/soda.png', 38
            UNION ALL
            SELECT 'taxi-2', '/assets/fidelizacion/sellos/taxi-2.png', 39
            UNION ALL
            SELECT 'taxi-frontal', '/assets/fidelizacion/sellos/taxi-frontal.png', 40
            UNION ALL
            SELECT 'taza-de-cafe-1', '/assets/fidelizacion/sellos/taza-de-cafe-1.png', 41
            UNION ALL
            SELECT 'taza-de-cafe', '/assets/fidelizacion/sellos/taza-de-cafe.png', 42
       ) AS seed
 WHERE NOT EXISTS (
       SELECT 1
         FROM tags_loyalty_stamp_assets existing
        WHERE existing.business_id IS NULL
          AND existing.image_url=seed.image_url
       );

ALTER TABLE tags_loyalty_programs
    ADD COLUMN stamp_asset_id BIGINT UNSIGNED NULL AFTER mechanic;

CREATE INDEX idx_tags_loyalty_program_stamp_asset
    ON tags_loyalty_programs (stamp_asset_id);
