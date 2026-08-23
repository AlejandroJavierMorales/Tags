-- Directorio Web requiere un QR técnico para publicar su Web.
-- Idempotente: no sobrescribe cupos personalizados mayores que cero.

UPDATE tags_plans
SET max_qr_codes = 1
WHERE code = 'directory_web'
  AND max_qr_codes = 0;

SELECT id, code, name, max_qr_codes
FROM tags_plans
WHERE code IN ('directory_web','directory_web_plus')
ORDER BY id;
