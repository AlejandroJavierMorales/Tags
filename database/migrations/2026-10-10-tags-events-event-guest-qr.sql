-- Tipo y producto técnico para credenciales QR de asistentes a Eventos.
-- Idempotente: puede ejecutarse nuevamente sin duplicar registros.

INSERT INTO tags_qr_types (name,code,url_prefix)
SELECT 'Asistente a evento','event_guest','/e/access/'
WHERE NOT EXISTS (
  SELECT 1 FROM tags_qr_types WHERE code='event_guest'
);

INSERT INTO tags_products (name,is_digital,qr_type_id,support_id,url_prefix)
SELECT
  'Credencial digital de asistente a evento',
  1,
  qt.id,
  (
    SELECT s.id
    FROM tags_supports s
    WHERE s.is_digital=1
    ORDER BY s.id
    LIMIT 1
  ),
  '/e/access/'
FROM tags_qr_types qt
WHERE qt.code='event_guest'
  AND EXISTS (
    SELECT 1 FROM tags_supports s WHERE s.is_digital=1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM tags_products p
    WHERE p.qr_type_id=qt.id AND p.is_digital=1
  );

-- Verificación: debe devolver una fila con qr_type_code='event_guest'.
SELECT
  qt.id AS qr_type_id,
  qt.code AS qr_type_code,
  p.id AS product_id,
  p.name AS product_name,
  p.is_digital,
  p.support_id
FROM tags_qr_types qt
LEFT JOIN tags_products p ON p.qr_type_id=qt.id AND p.is_digital=1
WHERE qt.code='event_guest';
