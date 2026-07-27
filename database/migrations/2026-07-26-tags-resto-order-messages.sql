CREATE TABLE IF NOT EXISTS tags_resto_order_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    store_id BIGINT UNSIGNED NOT NULL,
    session_id BIGINT UNSIGNED NOT NULL,
    sender_type ENUM('customer', 'staff') NOT NULL,
    sender_name VARCHAR(160) NULL,
    message TEXT NOT NULL,
    read_by_customer_at DATETIME NULL,
    read_by_staff_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_resto_order_messages_session (session_id, id),
    KEY idx_resto_order_messages_store (store_id, created_at),
    KEY idx_resto_order_messages_staff_unread (
        store_id,
        sender_type,
        read_by_staff_at
    )
);
