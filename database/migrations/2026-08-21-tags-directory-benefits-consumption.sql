-- Extiende Beneficios de Directorio para descuentos y promociones por cantidad.
-- Ejecutar en desarrollo y luego en producción.

ALTER TABLE tags_directory_benefits
    MODIFY benefit_type VARCHAR(40) NOT NULL DEFAULT 'amount',
    ADD COLUMN promotion_buy_quantity INT NULL AFTER benefit_value,
    ADD COLUMN promotion_pay_quantity INT NULL AFTER promotion_buy_quantity,
    ADD COLUMN promotion_item VARCHAR(190) NULL AFTER promotion_pay_quantity;

ALTER TABLE tags_directory_benefits
    DROP CONSTRAINT chk_directory_benefits_type;

ALTER TABLE tags_directory_benefits
    ADD CONSTRAINT chk_directory_benefits_type
        CHECK (benefit_type IN ('amount','percentage','quantity'));

ALTER TABLE tags_benefit_campaigns
    ADD COLUMN source_directory_benefit_id BIGINT UNSIGNED NULL AFTER issuer_business_id,
    ADD KEY idx_tags_benefit_campaign_source (source_directory_benefit_id,guest_app_id);
