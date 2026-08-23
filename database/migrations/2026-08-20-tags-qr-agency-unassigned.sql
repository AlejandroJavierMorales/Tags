-- Permite conservar QR de cartelería en stock de la agencia,
-- todavía sin cliente asignado ni destino final.
ALTER TABLE tags_qr_agency_assignments
    MODIFY customer_id BIGINT UNSIGNED NULL;

