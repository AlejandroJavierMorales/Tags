-- Tags Fidelización: permite múltiples programas por comercio.
-- Ejecutar manualmente en producción después de verificar el índice existente.

ALTER TABLE tags_loyalty_programs
    DROP INDEX uq_tags_loyalty_program_business;

CREATE INDEX idx_tags_loyalty_program_business_status
    ON tags_loyalty_programs (business_id, status);
