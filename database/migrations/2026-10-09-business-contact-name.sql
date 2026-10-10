-- Agrega la persona de contacto responsable de cada cliente.
-- Ejecutar una sola vez en desarrollo y luego en producción.
ALTER TABLE tags_businesses
  ADD COLUMN contact_name VARCHAR(190) NULL AFTER display_name;

