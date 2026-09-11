-- Ejecutar una sola vez en desarrollo y luego en producción.
-- Solo agrega la preferencia de destino inicial del Panel.
ALTER TABLE tags_businesses
    ADD COLUMN panel_entry_key VARCHAR(40) NOT NULL DEFAULT 'panel'
    AFTER global_user_id;
