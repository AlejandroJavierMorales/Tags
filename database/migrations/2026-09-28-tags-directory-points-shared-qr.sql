-- Tags Directorio - permitir que varios puntos físicos compartan un QR
-- Ejecutar una sola vez únicamente si 2026-09-28-tags-directory-points.sql
-- ya fue aplicada con el índice único uq_directory_point_qr.

ALTER TABLE tags_directory_points
  DROP INDEX uq_directory_point_qr;

ALTER TABLE tags_directory_points
  ADD INDEX idx_directory_point_qr (qr_code_id);
