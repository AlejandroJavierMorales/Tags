-- Mi Estadía: no show con crédito/retención/devolución y reprogramación.
-- Ejecutar una sola vez en desarrollo y producción antes de desplegar el código.

ALTER TABLE tags_guest_stays
  ADD COLUMN no_show_at DATETIME NULL AFTER checked_out_at,
  ADD COLUMN no_show_by_id BIGINT UNSIGNED NULL AFTER no_show_at,
  ADD COLUMN no_show_reason VARCHAR(2000) NULL AFTER no_show_by_id,
  ADD COLUMN no_show_financial_action VARCHAR(30) NULL AFTER no_show_reason,
  ADD COLUMN no_show_credit_expires_at DATE NULL AFTER no_show_financial_action,
  ADD COLUMN no_show_total_amount DECIMAL(12,2) NULL AFTER no_show_credit_expires_at,
  ADD COLUMN no_show_paid_amount DECIMAL(12,2) NULL AFTER no_show_total_amount,
  ADD COLUMN no_show_pending_amount DECIMAL(12,2) NULL AFTER no_show_paid_amount,
  ADD COLUMN no_show_notification_subject VARCHAR(300) NULL AFTER no_show_pending_amount,
  ADD COLUMN no_show_notification_message TEXT NULL AFTER no_show_notification_subject,
  ADD KEY idx_tags_guest_stays_no_show (guest_app_id,status,no_show_at);

