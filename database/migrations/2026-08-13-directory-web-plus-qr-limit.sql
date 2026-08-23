-- Tags Directory Web Plus: cupo inicial de QR
-- Idempotente: solo corrige instalaciones donde el plan quedó con cupo 0.
-- Los cambios posteriores hechos desde Administración > Planes se conservan.

UPDATE tags_plans
SET max_qr_codes = 5
WHERE code = 'directory_web_plus'
  AND max_qr_codes = 0;

SELECT id, code, name, max_qr_codes
FROM tags_plans
WHERE code = 'directory_web_plus';
