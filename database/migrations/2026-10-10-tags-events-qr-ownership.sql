-- Vincula e identifica las credenciales de asistentes dentro del inventario general de QR.
-- Requiere haber ejecutado 2026-10-10-tags-events-event-guest-qr.sql.
-- Idempotente: puede ejecutarse nuevamente.

SET @event_guest_product_id := (
  SELECT p.id
  FROM tags_products p
  INNER JOIN tags_qr_types qt ON qt.id=p.qr_type_id
  WHERE qt.code='event_guest' AND p.is_digital=1
  ORDER BY p.id
  LIMIT 1
);

UPDATE tags_event_attendees
SET qr_token=UUID(),updated_at=NOW()
WHERE id>0 AND (qr_token IS NULL OR qr_token='');

INSERT INTO tags_qr_codes (
  business_id,code,label,created_at,value,final_url,status,
  tracking_enabled,product_id,event_id,is_active
)
SELECT
  e.business_id,
  UPPER(SUBSTRING(MD5(CONCAT('event_guest:',a.id,':',a.qr_token)),1,8)),
  CONCAT('Evento: ',e.name,' - Asistente: ',a.name,' - Inscripcion #',a.id),
  NOW(),
  CONCAT('EVENT-ATTENDEE-',a.id),
  CONCAT('https://tags.com.ar/e/access/',a.qr_token),
  'active',1,@event_guest_product_id,e.id,1
FROM tags_event_attendees a
INNER JOIN tags_events e ON e.id=a.event_id
WHERE @event_guest_product_id IS NOT NULL
  AND a.qr_code_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tags_qr_codes existing
    WHERE existing.value=CONCAT('EVENT-ATTENDEE-',a.id)
  );

UPDATE tags_event_attendees a
INNER JOIN tags_qr_codes q ON q.value=CONCAT('EVENT-ATTENDEE-',a.id)
SET a.qr_code_id=q.id,a.updated_at=NOW()
WHERE a.id>0 AND (a.qr_code_id IS NULL OR a.qr_code_id<>q.id);

UPDATE tags_qr_codes q
INNER JOIN tags_event_attendees a ON a.qr_code_id=q.id
INNER JOIN tags_events e ON e.id=a.event_id
SET q.business_id=e.business_id,
    q.event_id=e.id,
    q.product_id=@event_guest_product_id,
    q.label=CONCAT('Evento: ',e.name,' - Asistente: ',a.name,' - Inscripcion #',a.id),
    q.value=CONCAT('EVENT-ATTENDEE-',a.id),
    q.final_url=CONCAT('https://tags.com.ar/e/access/',a.qr_token)
WHERE q.id>0 AND @event_guest_product_id IS NOT NULL;

SELECT
  q.id AS qr_id,q.code,q.label,q.business_id,b.name AS business_name,
  e.id AS event_id,e.name AS event_title,a.id AS attendee_id,a.name AS attendee_name
FROM tags_event_attendees a
INNER JOIN tags_events e ON e.id=a.event_id
LEFT JOIN tags_qr_codes q ON q.id=a.qr_code_id
LEFT JOIN tags_businesses b ON b.id=q.business_id
ORDER BY a.id DESC;
