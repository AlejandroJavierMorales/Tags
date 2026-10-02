-- Tags - Importación administrativa de Catálogo, Tienda y Carta
-- Fecha: 2026-09-28
--
-- Migración ADITIVA e idempotente.
-- No modifica productos existentes ni ejecuta importaciones.
-- Compatible con MySQL 8 y MariaDB 10.11.
--
-- Las tablas legacy usan INT en algunas instalaciones y pueden diferir en otras.
-- Por ese motivo business_id, target_instance_id y target_id quedan indexados,
-- pero sin claves foráneas contra tablas legacy. La integridad se controla desde
-- el importador transaccional.

-- -----------------------------------------------------------------------------
-- 1. Campos que Catálogo todavía no posee y que sí requiere la plantilla.
-- -----------------------------------------------------------------------------

SET @tags_catalog_sku_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tags_qr_page_products'
    AND COLUMN_NAME = 'sku'
);
SET @tags_catalog_sku_sql := IF(
  @tags_catalog_sku_exists = 0,
  'ALTER TABLE tags_qr_page_products ADD COLUMN sku VARCHAR(120) NULL AFTER page_id',
  'SELECT 1'
);
PREPARE tags_product_import_stmt FROM @tags_catalog_sku_sql;
EXECUTE tags_product_import_stmt;
DEALLOCATE PREPARE tags_product_import_stmt;

SET @tags_catalog_stock_enabled_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tags_qr_page_products'
    AND COLUMN_NAME = 'stock_enabled'
);
SET @tags_catalog_stock_enabled_sql := IF(
  @tags_catalog_stock_enabled_exists = 0,
  'ALTER TABLE tags_qr_page_products ADD COLUMN stock_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER currency',
  'SELECT 1'
);
PREPARE tags_product_import_stmt FROM @tags_catalog_stock_enabled_sql;
EXECUTE tags_product_import_stmt;
DEALLOCATE PREPARE tags_product_import_stmt;

SET @tags_catalog_stock_qty_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tags_qr_page_products'
    AND COLUMN_NAME = 'stock_qty'
);
SET @tags_catalog_stock_qty_sql := IF(
  @tags_catalog_stock_qty_exists = 0,
  'ALTER TABLE tags_qr_page_products ADD COLUMN stock_qty INT NULL AFTER stock_enabled',
  'SELECT 1'
);
PREPARE tags_product_import_stmt FROM @tags_catalog_stock_qty_sql;
EXECUTE tags_product_import_stmt;
DEALLOCATE PREPARE tags_product_import_stmt;

-- Un código puede repetirse en negocios distintos, pero no dentro del mismo
-- Catálogo. MySQL y MariaDB permiten varias filas NULL en este índice único.
SET @tags_catalog_sku_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'tags_qr_page_products'
    AND INDEX_NAME = 'uq_tags_qr_page_products_page_sku'
);
SET @tags_catalog_sku_index_sql := IF(
  @tags_catalog_sku_index_exists = 0,
  'CREATE UNIQUE INDEX uq_tags_qr_page_products_page_sku ON tags_qr_page_products (page_id, sku)',
  'SELECT 1'
);
PREPARE tags_product_import_stmt FROM @tags_catalog_sku_index_sql;
EXECUTE tags_product_import_stmt;
DEALLOCATE PREPARE tags_product_import_stmt;

-- -----------------------------------------------------------------------------
-- 2. Cabecera e historial de cada importación confirmada.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tags_product_import_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT NOT NULL,
  target_type ENUM('catalog','store','resto') NOT NULL,
  target_instance_id BIGINT NOT NULL,
  template_version VARCHAR(30) NOT NULL DEFAULT '1.0',
  original_filename VARCHAR(255) NOT NULL,
  file_hash CHAR(64) NOT NULL,
  overwrite_mode ENUM('create_only','create_and_update','update_only') NOT NULL DEFAULT 'create_only',
  empty_value_policy ENUM('preserve','clear') NOT NULL DEFAULT 'preserve',
  status ENUM(
    'pending',
    'processing',
    'completed',
    'completed_with_errors',
    'failed',
    'undoing',
    'undone',
    'undo_failed'
  ) NOT NULL DEFAULT 'pending',
  total_rows INT UNSIGNED NOT NULL DEFAULT 0,
  created_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_count INT UNSIGNED NOT NULL DEFAULT 0,
  skipped_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_count INT UNSIGNED NOT NULL DEFAULT 0,
  can_undo TINYINT(1) NOT NULL DEFAULT 0,
  report_json JSON NULL,
  created_by_id BIGINT NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  undone_by_id BIGINT NULL,
  undone_at DATETIME NULL,
  undo_report_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_import_business (business_id, created_at),
  KEY idx_product_import_target (target_type, target_instance_id, created_at),
  KEY idx_product_import_status (status, created_at),
  KEY idx_product_import_hash (business_id, target_type, file_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Cambios individuales. before_json y after_json permiten restaurar tanto
--    productos como categorías, imágenes en BD y estructuras de variantes.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tags_product_import_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  source_sheet VARCHAR(80) NULL,
  source_row INT UNSIGNED NULL,
  entity_type ENUM('category','product','variant_structure','catalog_categories') NOT NULL,
  product_code VARCHAR(120) NULL,
  action ENUM('created','updated','skipped','error') NOT NULL,
  target_table VARCHAR(80) NULL,
  target_id BIGINT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  applied_updated_at DATETIME NULL,
  item_status ENUM('pending','applied','skipped','error','undone','conflict') NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  undone_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_import_item_batch (batch_id, item_status, id),
  KEY idx_product_import_item_target (target_table, target_id),
  KEY idx_product_import_item_code (product_code),
  CONSTRAINT fk_product_import_item_batch
    FOREIGN KEY (batch_id) REFERENCES tags_product_import_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Archivos subidos durante una importación. Al deshacer se eliminan solamente
--    los archivos creados por ese lote y que ya no estén referenciados.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tags_product_import_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NULL,
  business_id BIGINT NOT NULL,
  target_type ENUM('catalog','store','resto') NOT NULL,
  target_id BIGINT NULL,
  original_filename VARCHAR(255) NOT NULL,
  normalized_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size_bytes BIGINT UNSIGNED NULL,
  file_hash CHAR(64) NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_status ENUM('active','deleted','retained','delete_failed') NOT NULL DEFAULT 'active',
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_import_file_batch (batch_id, file_status, id),
  KEY idx_product_import_file_item (item_id),
  KEY idx_product_import_file_target (target_type, target_id),
  CONSTRAINT fk_product_import_file_batch
    FOREIGN KEY (batch_id) REFERENCES tags_product_import_batches(id),
  CONSTRAINT fk_product_import_file_item
    FOREIGN KEY (item_id) REFERENCES tags_product_import_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

