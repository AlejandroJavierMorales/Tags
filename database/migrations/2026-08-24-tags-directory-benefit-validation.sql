-- Modalidades de consumo para beneficios públicos de Directorio.
ALTER TABLE tags_directory_benefits
    ADD COLUMN validation_mode VARCHAR(30) NOT NULL DEFAULT 'visual' AFTER visibility;

CREATE INDEX idx_tags_directory_benefits_validation
    ON tags_directory_benefits (validation_mode,is_active,valid_until);
