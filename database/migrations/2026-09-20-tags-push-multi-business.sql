-- Permite que el mismo dispositivo reciba avisos de varios comercios.
-- Ejecutar únicamente si tags_push_subscriptions ya existe.

ALTER TABLE tags_push_subscriptions
  DROP INDEX uq_tags_push_endpoint_hash,
  ADD UNIQUE KEY uq_tags_push_business_endpoint (business_id, endpoint_hash);
