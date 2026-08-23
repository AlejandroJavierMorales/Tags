-- Registro de la última preparación de aviso de vencimiento por WhatsApp.
-- No envía mensajes automáticamente.

ALTER TABLE tags_subscriptions
  ADD COLUMN last_expiration_notice_at DATETIME NULL AFTER admin_override_notes,
  ADD COLUMN last_expiration_notice_by INT NULL AFTER last_expiration_notice_at,
  ADD KEY idx_tags_subscriptions_expiration_notice (expires_at,last_expiration_notice_at);
