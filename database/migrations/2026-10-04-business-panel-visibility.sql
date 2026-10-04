-- Ejecutar una sola vez en desarrollo y luego en producción.
-- NULL conserva el comportamiento actual: el cliente ve todas sus herramientas activas.
ALTER TABLE tags_businesses
    ADD COLUMN panel_visible_keys LONGTEXT NULL
    AFTER panel_entry_key;
