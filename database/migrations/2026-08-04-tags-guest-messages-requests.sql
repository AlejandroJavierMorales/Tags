CREATE TABLE IF NOT EXISTS tags_guest_request_categories (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,guest_app_id BIGINT UNSIGNED NOT NULL,code VARCHAR(60) NOT NULL,name VARCHAR(120) NOT NULL,description VARCHAR(500) NULL,icon_code VARCHAR(60) NULL,requires_schedule TINYINT(1) NOT NULL DEFAULT 0,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_tags_guest_request_category(guest_app_id,code),KEY idx_tags_guest_request_categories_app(guest_app_id,is_active,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_conversations (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,guest_app_id BIGINT UNSIGNED NOT NULL,stay_id BIGINT UNSIGNED NOT NULL,status VARCHAR(30) NOT NULL DEFAULT 'open',last_message_at DATETIME NULL,closed_at DATETIME NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_tags_guest_conversation_stay(guest_app_id,stay_id),KEY idx_tags_guest_conversations_activity(guest_app_id,status,last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_service_requests (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,guest_app_id BIGINT UNSIGNED NOT NULL,stay_id BIGINT UNSIGNED NOT NULL,guest_id BIGINT UNSIGNED NOT NULL,category_id BIGINT UNSIGNED NOT NULL,title VARCHAR(190) NOT NULL,details VARCHAR(3000) NULL,requested_for DATETIME NULL,status VARCHAR(30) NOT NULL DEFAULT 'open',priority VARCHAR(20) NOT NULL DEFAULT 'normal',assigned_to_id BIGINT UNSIGNED NULL,resolution_notes VARCHAR(2000) NULL,resolved_at DATETIME NULL,cancelled_at DATETIME NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_tags_guest_requests_app_status(guest_app_id,status,created_at),KEY idx_tags_guest_requests_stay(stay_id,created_at),KEY idx_tags_guest_requests_category(category_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_messages (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,conversation_id BIGINT UNSIGNED NOT NULL,guest_app_id BIGINT UNSIGNED NOT NULL,stay_id BIGINT UNSIGNED NOT NULL,request_id BIGINT UNSIGNED NULL,sender_type VARCHAR(30) NOT NULL,sender_id BIGINT UNSIGNED NULL,sender_name VARCHAR(190) NULL,message_type VARCHAR(30) NOT NULL DEFAULT 'text',message TEXT NOT NULL,read_by_guest_at DATETIME NULL,read_by_admin_at DATETIME NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_tags_guest_messages_conversation(conversation_id,id),KEY idx_tags_guest_messages_admin_unread(guest_app_id,sender_type,read_by_admin_at),KEY idx_tags_guest_messages_guest_unread(stay_id,sender_type,read_by_guest_at),KEY idx_tags_guest_messages_request(request_id,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_guest_request_status_history (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,request_id BIGINT UNSIGNED NOT NULL,from_status VARCHAR(30) NULL,to_status VARCHAR(30) NOT NULL,actor_type VARCHAR(30) NOT NULL,actor_id BIGINT UNSIGNED NULL,reason VARCHAR(1000) NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),KEY idx_tags_guest_request_history(request_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tags_guest_request_categories (guest_app_id,code,name,description,icon_code,requires_schedule,sort_order)
SELECT id,'cleaning','Limpieza','Solicitud de limpieza de la unidad','cleaning',1,10 FROM tags_guest_apps;
INSERT IGNORE INTO tags_guest_request_categories (guest_app_id,code,name,description,icon_code,requires_schedule,sort_order)
SELECT id,'maintenance','Mantenimiento','Informar un inconveniente o reparación','maintenance',0,20 FROM tags_guest_apps;
INSERT IGNORE INTO tags_guest_request_categories (guest_app_id,code,name,description,icon_code,requires_schedule,sort_order)
SELECT id,'breakfast','Desayuno','Solicitar desayuno cuando el alojamiento lo ofrece','breakfast',1,30 FROM tags_guest_apps;
INSERT IGNORE INTO tags_guest_request_categories (guest_app_id,code,name,description,icon_code,requires_schedule,sort_order)
SELECT id,'linens','Ropa blanca','Solicitar toallas, sábanas u otra ropa blanca','linens',0,40 FROM tags_guest_apps;
INSERT IGNORE INTO tags_guest_request_categories (guest_app_id,code,name,description,icon_code,requires_schedule,sort_order)
SELECT id,'general','Consulta general','Otras consultas para el alojamiento','general',0,50 FROM tags_guest_apps;
