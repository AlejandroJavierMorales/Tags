-- Tags Store: integridad para pagos, webhooks y creación concurrente de envíos.
-- Ejecutar una sola vez antes de habilitar Mercado Pago o Zipnova en producción.

ALTER TABLE tags_store_orders
    MODIFY COLUMN shipping_status
        ENUM(
            'pending',
            'creating',
            'ready',
            'shipped',
            'in_transit',
            'delivered',
            'returned',
            'cancelled'
        )
        NULL DEFAULT 'pending';

ALTER TABLE tags_store_payments
    ADD UNIQUE KEY uq_store_payments_provider_payment
        (provider, provider_payment_id),
    ADD UNIQUE KEY uq_store_payments_provider_preference
        (provider, provider_preference_id);

ALTER TABLE tags_store_shipping_webhooks
    ADD COLUMN event_key CHAR(64) NULL
        AFTER provider,
    ADD UNIQUE KEY uq_store_shipping_webhook_event
        (provider, event_key);

CREATE INDEX idx_store_orders_expired_reservations
    ON tags_store_orders (
        stock_reserved,
        payment_status,
        order_status,
        created_at
    );
