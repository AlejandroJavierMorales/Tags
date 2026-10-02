-- Ubicación opcional de instalaciones PWA.
-- Ejecutar una sola vez. Compatible con versiones que no admiten
-- ADD COLUMN IF NOT EXISTS.
-- No se almacena IP ni se solicita ubicación sin permiso previo del navegador.
ALTER TABLE tags_pwa_install_events
    ADD COLUMN latitude DECIMAL(10,7) NULL AFTER user_agent,
    ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude,
    ADD COLUMN location_accuracy_m DECIMAL(10,2) NULL AFTER longitude;
