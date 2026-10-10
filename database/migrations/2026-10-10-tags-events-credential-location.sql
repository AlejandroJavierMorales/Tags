-- Tags Events: datos de ubicación y observación visibles en la credencial.
-- Ejecutar una sola vez, primero en desarrollo y luego en producción.

ALTER TABLE tags_events
    ADD COLUMN address VARCHAR(500) NULL AFTER location,
    ADD COLUMN latitude DECIMAL(10,7) NULL AFTER address,
    ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude,
    ADD COLUMN credential_note VARCHAR(500) NULL AFTER longitude;
