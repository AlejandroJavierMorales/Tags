-- Tags Turnos - permitir varias instancias contratadas por negocio.
-- Ejecutar manualmente, primero en desarrollo y luego en producción.

ALTER TABLE tags_turnos_apps
    DROP INDEX uq_tags_turnos_apps_business,
    ADD INDEX idx_tags_turnos_apps_business (business_id);
