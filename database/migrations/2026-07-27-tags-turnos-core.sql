-- Tags Turnos - núcleo inicial
-- Ejecutar manualmente en desarrollo/producción después de revisar el esquema.
-- No contiene DROP ni modifica tablas existentes.

CREATE TABLE IF NOT EXISTS tags_turnos_apps (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    page_id BIGINT UNSIGNED NULL,
    slug VARCHAR(190) NOT NULL,
    name VARCHAR(190) NOT NULL,
    business_profile_code VARCHAR(80) NOT NULL DEFAULT 'generic',
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    settings_json JSON NULL,
    styles_json JSON NULL,
    public_booking_policy_json JSON NULL,
    deposit_policy_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_apps_business (business_id),
    UNIQUE KEY uq_tags_turnos_apps_slug (slug),
    KEY idx_tags_turnos_apps_page (page_id),
    KEY idx_tags_turnos_apps_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    default_capabilities_json JSON NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_profiles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_capabilities (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    module_key VARCHAR(80) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_capabilities_code (code),
    KEY idx_tags_turnos_capabilities_module (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_app_capabilities (
    turnos_id BIGINT UNSIGNED NOT NULL,
    capability_id BIGINT UNSIGNED NOT NULL,
    settings_json JSON NULL,
    enabled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disabled_at DATETIME NULL,
    PRIMARY KEY (turnos_id, capability_id),
    KEY idx_tags_turnos_app_capabilities_enabled (turnos_id, disabled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_locations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    description VARCHAR(500) NULL,
    location_type VARCHAR(30) NOT NULL DEFAULT 'physical',
    address VARCHAR(255) NULL,
    city VARCHAR(120) NULL,
    state VARCHAR(120) NULL,
    postal_code VARCHAR(30) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    phone VARCHAR(60) NULL,
    instructions VARCHAR(1000) NULL,
    timezone VARCHAR(64) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_locations_app (turnos_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_resource_types (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    singular_label VARCHAR(120) NULL,
    plural_label VARCHAR(120) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_resource_types_code (turnos_id, code),
    KEY idx_tags_turnos_resource_types_active (turnos_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_resources (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    resource_type_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    description VARCHAR(500) NULL,
    capacity INT UNSIGNED NOT NULL DEFAULT 1,
    color VARCHAR(30) NULL,
    image_url VARCHAR(500) NULL,
    public_metadata_json JSON NULL,
    private_metadata_json JSON NULL,
    is_customer_selectable TINYINT(1) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_resources_app (turnos_id, is_active),
    KEY idx_tags_turnos_resources_type (resource_type_id, is_active),
    KEY idx_tags_turnos_resources_location (location_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_service_categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    description VARCHAR(500) NULL,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_service_categories_app (turnos_id, is_visible, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_services (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    booking_mode VARCHAR(30) NOT NULL DEFAULT 'individual',
    confirmation_mode VARCHAR(30) NOT NULL DEFAULT 'automatic',
    booking_channel_mode VARCHAR(30) NOT NULL DEFAULT 'hybrid',
    customer_identification_mode VARCHAR(30) NOT NULL DEFAULT 'contact',
    public_availability_enabled TINYINT(1) NOT NULL DEFAULT 1,
    duration_minutes INT UNSIGNED NOT NULL DEFAULT 30,
    buffer_before_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    buffer_after_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    capacity INT UNSIGNED NOT NULL DEFAULT 1,
    min_notice_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    max_advance_days INT UNSIGNED NOT NULL DEFAULT 90,
    cancellation_notice_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    reschedule_notice_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    price DECIMAL(12,2) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    deposit_policy_override_json JSON NULL,
    is_price_visible TINYINT(1) NOT NULL DEFAULT 1,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_services_app (turnos_id, is_active, is_visible, sort_order),
    KEY idx_tags_turnos_services_category (category_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_service_locations (
    service_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (service_id, location_id),
    KEY idx_tags_turnos_service_locations_location (location_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_service_resource_requirements (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    service_id BIGINT UNSIGNED NOT NULL,
    resource_type_id BIGINT UNSIGNED NOT NULL,
    quantity_required INT UNSIGNED NOT NULL DEFAULT 1,
    units_per_booking INT UNSIGNED NOT NULL DEFAULT 1,
    selection_mode VARCHAR(30) NOT NULL DEFAULT 'automatic',
    is_required TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_service_requirements_service (service_id),
    KEY idx_tags_turnos_service_requirements_type (resource_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_service_resources (
    service_id BIGINT UNSIGNED NOT NULL,
    resource_id BIGINT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (service_id, resource_id),
    KEY idx_tags_turnos_service_resources_resource (resource_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_schedule_rules (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    scope_type VARCHAR(30) NOT NULL DEFAULT 'app',
    scope_id BIGINT UNSIGNED NOT NULL,
    weekday TINYINT UNSIGNED NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    valid_from DATE NULL,
    valid_until DATE NULL,
    slot_interval_minutes INT UNSIGNED NOT NULL DEFAULT 30,
    capacity_override INT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_schedule_rules_scope (turnos_id, scope_type, scope_id, weekday, is_active),
    KEY idx_tags_turnos_schedule_rules_dates (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_schedule_exceptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    scope_type VARCHAR(30) NOT NULL DEFAULT 'app',
    scope_id BIGINT UNSIGNED NOT NULL,
    exception_type VARCHAR(30) NOT NULL DEFAULT 'closed',
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    capacity_override INT UNSIGNED NULL,
    reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_schedule_exceptions_scope (turnos_id, scope_type, scope_id, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_customers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    business_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(190) NOT NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(60) NULL,
    document VARCHAR(80) NULL,
    date_of_birth DATE NULL,
    notes TEXT NULL,
    tags_identity_id BIGINT UNSIGNED NULL,
    marketing_consent_at DATETIME NULL,
    privacy_consent_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_customers_business_contact (business_id, email, phone),
    KEY idx_tags_turnos_customers_identity (tags_identity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_customer_auth_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(190) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    purpose VARCHAR(30) NOT NULL DEFAULT 'booking',
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_customer_auth_hash (token_hash),
    KEY idx_tags_turnos_customer_auth_email (turnos_id, email, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_bookings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    booking_number VARCHAR(50) NOT NULL,
    public_token_hash CHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending',
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    timezone VARCHAR(64) NOT NULL,
    party_size INT UNSIGNED NOT NULL DEFAULT 1,
    price_snapshot DECIMAL(12,2) NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'not_required',
    deposit_required TINYINT(1) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(12,2) NULL,
    deposit_due_at DATETIME NULL,
    payment_policy_snapshot_json JSON NULL,
    customer_notes TEXT NULL,
    internal_notes TEXT NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'public',
    created_by_type VARCHAR(30) NULL,
    created_by_id BIGINT UNSIGNED NULL,
    confirmed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    checked_in_at DATETIME NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_bookings_number (turnos_id, booking_number),
    UNIQUE KEY uq_tags_turnos_bookings_token (public_token_hash),
    KEY idx_tags_turnos_bookings_calendar (turnos_id, starts_at, ends_at, status),
    KEY idx_tags_turnos_bookings_customer (customer_id, created_at),
    KEY idx_tags_turnos_bookings_payment (payment_status, deposit_due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_booking_resources (
    booking_id BIGINT UNSIGNED NOT NULL,
    requirement_id BIGINT UNSIGNED NULL,
    resource_id BIGINT UNSIGNED NOT NULL,
    units INT UNSIGNED NOT NULL DEFAULT 1,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    PRIMARY KEY (booking_id, resource_id),
    KEY idx_tags_turnos_booking_resources_conflict (resource_id, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_booking_status_history (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(40) NULL,
    to_status VARCHAR(40) NOT NULL,
    actor_type VARCHAR(30) NULL,
    actor_id BIGINT UNSIGNED NULL,
    reason VARCHAR(500) NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_booking_history_booking (booking_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_booking_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id BIGINT UNSIGNED NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_booking_tokens_hash (token_hash),
    KEY idx_tags_turnos_booking_tokens_booking (booking_id, purpose, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_payment_intents (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    booking_id BIGINT UNSIGNED NOT NULL,
    purpose VARCHAR(30) NOT NULL DEFAULT 'deposit',
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
    provider VARCHAR(40) NOT NULL,
    provider_reference VARCHAR(190) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'created',
    idempotency_key VARCHAR(190) NOT NULL,
    expires_at DATETIME NULL,
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_payment_intents_key (turnos_id, idempotency_key),
    KEY idx_tags_turnos_payment_intents_booking (booking_id, status),
    KEY idx_tags_turnos_payment_intents_provider (provider, provider_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    module_key VARCHAR(80) NOT NULL,
    module_name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_roles_code (turnos_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_staff (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NULL,
    name VARCHAR(190) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(60) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_access_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tags_turnos_staff_email (turnos_id, email),
    KEY idx_tags_turnos_staff_role (role_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_staff_permission_overrides (
    staff_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    effect VARCHAR(10) NOT NULL,
    PRIMARY KEY (staff_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_staff_resources (
    staff_id BIGINT UNSIGNED NOT NULL,
    resource_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (staff_id, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tags_turnos_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    turnos_id BIGINT UNSIGNED NOT NULL,
    staff_id BIGINT UNSIGNED NULL,
    actor_type VARCHAR(30) NOT NULL,
    actor_id BIGINT UNSIGNED NULL,
    action_code VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80) NULL,
    entity_id BIGINT UNSIGNED NULL,
    description VARCHAR(500) NULL,
    metadata_json JSON NULL,
    ip_address VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tags_turnos_audit_store_date (turnos_id, created_at),
    KEY idx_tags_turnos_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tags_turnos_profiles (code, name, description, default_capabilities_json)
VALUES
('generic', 'Genérico', 'Reservas de servicios y recursos', JSON_ARRAY('appointments')),
('gym', 'Gimnasio', 'Clases, sesiones y rutinas', JSON_ARRAY('appointments', 'group_classes', 'customer_records', 'routines')),
('hair_beauty', 'Peluquería y estética', 'Servicios por profesional y cabina', JSON_ARRAY('appointments', 'customer_records')),
('workshop', 'Taller', 'Servicios técnicos y vehículos', JSON_ARRAY('appointments', 'customer_records', 'vehicle_records')),
('courts', 'Canchas', 'Alquileres y actividades deportivas', JSON_ARRAY('resource_rental', 'group_classes')),
('health_wellness', 'Salud y bienestar', 'Consultas y sesiones', JSON_ARRAY('appointments', 'customer_records', 'patient_intake')),
('activities', 'Actividades y excursiones', 'Salidas y actividades con cupos', JSON_ARRAY('group_classes', 'resource_rental'));

INSERT IGNORE INTO tags_turnos_capabilities (code, name, description, module_key)
VALUES
('appointments', 'Turnos individuales', 'Reservas de una persona o servicio', 'bookings'),
('group_classes', 'Clases y cupos', 'Ocurrencias grupales con capacidad', 'bookings'),
('resource_rental', 'Alquiler de recursos', 'Canchas, salas, boxes o activos', 'bookings'),
('customer_records', 'Ficha de cliente', 'Datos operativos del cliente', 'customers'),
('routines', 'Rutinas', 'Planes de ejercicio y seguimiento', 'routines'),
('memberships', 'Membresías', 'Planes y derechos de uso', 'memberships'),
('vehicle_records', 'Vehículos', 'Vehículos asociados al cliente', 'vehicles'),
('patient_intake', 'Admisión', 'Formulario previo no clínico', 'customers'),
('waitlist', 'Lista de espera', 'Solicitudes cuando no hay cupo', 'bookings'),
('packages', 'Paquetes', 'Bonos de sesiones o servicios', 'billing');

INSERT IGNORE INTO tags_turnos_permissions (code, module_key, module_name, description)
VALUES
('dashboard.view', 'dashboard', 'Inicio', 'Acceder al panel de Turnos'),
('calendar.view', 'calendar', 'Calendario', 'Consultar la agenda'),
('calendar.manage', 'calendar', 'Calendario', 'Bloquear y administrar agenda'),
('bookings.view', 'bookings', 'Reservas', 'Consultar reservas'),
('bookings.create', 'bookings', 'Reservas', 'Crear reservas'),
('bookings.approve', 'bookings', 'Reservas', 'Aprobar o rechazar reservas'),
('bookings.reschedule', 'bookings', 'Reservas', 'Reprogramar reservas'),
('bookings.cancel', 'bookings', 'Reservas', 'Cancelar reservas'),
('bookings.checkin', 'bookings', 'Reservas', 'Registrar llegada'),
('bookings.complete', 'bookings', 'Reservas', 'Completar reservas'),
('customers.view', 'customers', 'Clientes', 'Consultar clientes'),
('customers.manage', 'customers', 'Clientes', 'Crear y modificar clientes'),
('services.view', 'services', 'Servicios', 'Consultar servicios'),
('services.manage', 'services', 'Servicios', 'Crear y modificar servicios'),
('resources.view', 'resources', 'Recursos', 'Consultar recursos'),
('resources.manage', 'resources', 'Recursos', 'Crear y modificar recursos'),
('availability.view', 'availability', 'Disponibilidad', 'Consultar disponibilidad'),
('availability.manage', 'availability', 'Disponibilidad', 'Modificar agendas y excepciones'),
('settings.view', 'settings', 'Configuración', 'Consultar configuración'),
('settings.manage', 'settings', 'Configuración', 'Modificar configuración'),
('publish.manage', 'settings', 'Configuración', 'Publicar y configurar canales'),
('staff.view', 'staff', 'Personal', 'Consultar personal'),
('staff.manage', 'staff', 'Personal', 'Administrar personal y roles'),
('builder.manage', 'builder', 'Builder', 'Administrar página pública'),
('audit.view', 'staff', 'Personal', 'Consultar auditoría'),
('routines.view', 'routines', 'Rutinas', 'Consultar rutinas'),
('routines.manage', 'routines', 'Rutinas', 'Administrar rutinas'),
('routines.assign', 'routines', 'Rutinas', 'Asignar rutinas'),
('routines.log', 'routines', 'Rutinas', 'Registrar progreso');
