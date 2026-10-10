export const GUEST_STAFF_PERMISSIONS = [
  ["guest.dashboard.view", "Acceder a Mi Estadía"],
  ["guest.stays.view", "Ver reservas y estadías"],
  ["guest.stays.manage", "Crear y modificar reservas"],
  ["guest.checkin.manage", "Registrar check-in y checkout"],
  ["guest.accounts.view", "Ver cuentas y saldos"],
  ["guest.payments.register", "Registrar pagos"],
  ["guest.messages.view", "Ver mensajes"],
  ["guest.messages.reply", "Enviar mensajes"],
];

export const GUEST_STAFF_ROLES = {
  reception: {
    name: "Recepción",
    permissions: [
      "guest.dashboard.view", "guest.stays.view", "guest.stays.manage",
      "guest.checkin.manage", "guest.accounts.view", "guest.payments.register",
      "guest.messages.view", "guest.messages.reply",
    ],
  },
  administrator: {
    name: "Administración",
    permissions: GUEST_STAFF_PERMISSIONS.map(([code]) => code),
  },
  read_only: {
    name: "Solo lectura",
    permissions: [
      "guest.dashboard.view", "guest.stays.view", "guest.accounts.view",
      "guest.messages.view",
    ],
  },
  custom: { name: "Personalizado", permissions: [] },
};

export function parseStaffPermissions(value) {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export const BUSINESS_STAFF_MODULES = {
  directory: { name: "Mi Web", roles: { administrator: "Administrador", editor: "Editor", read_only: "Solo lectura" } },
  google_business_profile: { name: "Perfil de Empresa en Google Maps", roles: { administrator: "Administrador", editor: "Editor", read_only: "Solo lectura" } },
  client_reviews: { name: "Reseñas de Clientes", roles: { administrator: "Administrador", moderator: "Moderador", read_only: "Solo lectura" } },
  portal_public: { name: "Portal público", roles: { administrator: "Administrador", editor: "Editor", read_only: "Solo lectura" } },
  guest_experience: { name: "Mi Estadía", roles: { administrator: "Administrador", reception: "Recepción", read_only: "Solo lectura" } },
  turnos: { name: "Turnos y reservas", roles: { administrator: "Administrador", reception: "Recepción / Reservas", read_only: "Solo lectura" } },
  club: { name: "Tags Club", roles: { administrator: "Administrador", reception: "Recepción / Reservas", coordinator: "Coordinación deportiva", instructor: "Profesor", read_only: "Solo lectura" } },
  store: { name: "Tienda", roles: { administrator: "Administrador", operator: "Operador", read_only: "Solo lectura" } },
  resto: { name: "Resto", roles: { administrator: "Administrador", manager: "Encargado", waiter: "Mozo", kitchen: "Cocina", cashier: "Caja", read_only: "Solo lectura" } },
  events: { name: "Eventos", roles: { administrator: "Administrador", operator: "Operador", checkin: "Acreditación", read_only: "Solo lectura" } },
  e_events: { name: "Eventos Pro", roles: { administrator: "Administrador", operator: "Operador", checkin: "Acreditación", read_only: "Solo lectura" } },
};

export const BUSINESS_STAFF_PERMISSION_CATALOG = {
  directory: [["dashboard.view", "Acceder a Mi Web"], ["content.view", "Ver contenido"], ["content.manage", "Editar contenido"], ["gallery.manage", "Administrar galería"], ["seo.manage", "Administrar SEO"], ["modules.manage", "Administrar módulos"], ["settings.manage", "Modificar configuración"]],
  google_business_profile: [["dashboard.view", "Ver perfil"], ["profile.view", "Ver información"], ["profile.manage", "Modificar información"], ["profile.sync", "Sincronizar con Google"], ["reviews.view", "Ver reseñas"], ["performance.view", "Ver rendimiento"], ["optimization.manage", "Administrar optimización"]],
  client_reviews: [["dashboard.view", "Acceder a Reseñas de Clientes"], ["reviews.view", "Ver reseñas"], ["reviews.respond", "Responder reseñas"], ["reviews.manage", "Moderar reseñas"], ["settings.manage", "Modificar configuración"]],
  portal_public: [["dashboard.view", "Acceder al Portal"], ["content.view", "Ver contenido"], ["content.manage", "Editar contenido"], ["settings.manage", "Modificar configuración"]],
  guest_experience: [
    ["guest.dashboard.view", "Acceder al panel"], ["guest.stays.view", "Ver estadías"], ["guest.stays.manage", "Crear y modificar estadías"], ["guest.checkin.manage", "Gestionar check-in y checkout"], ["guest.accounts.view", "Ver cuentas y saldos"], ["guest.payments.register", "Registrar pagos"], ["guest.messages.view", "Ver mensajes"], ["guest.messages.reply", "Responder mensajes"]
  ],
  turnos: [["dashboard.view", "Ver panel"], ["calendar.view", "Ver agenda"], ["calendar.manage", "Modificar agenda"], ["bookings.view", "Ver reservas"], ["bookings.create", "Crear reservas"], ["bookings.approve", "Aprobar reservas"], ["bookings.reschedule", "Reprogramar reservas"], ["bookings.cancel", "Cancelar reservas"], ["bookings.checkin", "Registrar asistencia"], ["bookings.complete", "Completar reservas"], ["customers.view", "Ver clientes"], ["customers.manage", "Administrar clientes"], ["services.view", "Ver servicios"], ["services.manage", "Administrar servicios"], ["resources.view", "Ver recursos"], ["resources.manage", "Administrar recursos"], ["availability.view", "Ver disponibilidad"], ["availability.manage", "Modificar horarios y bloqueos"], ["settings.view", "Ver configuración"], ["settings.manage", "Modificar configuración"], ["staff.view", "Ver colaboradores"], ["staff.manage", "Administrar colaboradores"], ["audit.view", "Ver auditoría"]],
  club: [["dashboard.view", "Ver panel"], ["calendar.view", "Ver agenda"], ["calendar.manage", "Modificar agenda"], ["bookings.view", "Ver reservas"], ["bookings.create", "Crear reservas"], ["bookings.approve", "Aprobar reservas"], ["bookings.reschedule", "Reprogramar reservas"], ["bookings.cancel", "Cancelar reservas"], ["bookings.checkin", "Registrar asistencia"], ["bookings.complete", "Completar reservas"], ["availability.view", "Ver disponibilidad"], ["availability.manage", "Modificar horarios y bloqueos"], ["resources.view", "Ver canchas y espacios"], ["resources.manage", "Administrar canchas y espacios"], ["services.view", "Ver actividades y clases"], ["services.manage", "Administrar actividades y clases"], ["sports.disciplines.view", "Ver disciplinas"], ["sports.disciplines.manage", "Administrar disciplinas"], ["sports.rates.view", "Ver tarifas"], ["sports.rates.manage", "Administrar tarifas"], ["sports.settings.view", "Ver configuración del club"], ["sports.settings.manage", "Modificar configuración del club"], ["sports.publication.manage", "Administrar publicación"], ["staff.view", "Ver colaboradores"], ["staff.manage", "Administrar colaboradores"], ["audit.view", "Ver auditoría"]],
  store: [["dashboard.view", "Ver panel"], ["products.view", "Ver productos"], ["products.manage", "Administrar productos"], ["categories.view", "Ver categorías"], ["categories.manage", "Administrar categorías"], ["orders.view", "Ver pedidos"], ["orders.manage", "Gestionar pedidos"], ["inventory.view", "Ver inventario"], ["inventory.manage", "Administrar inventario"], ["settings.view", "Ver configuración"], ["settings.manage", "Modificar configuración"], ["staff.manage", "Administrar colaboradores"]],
  resto: [["dashboard.view", "Ver panel"], ["orders.view", "Ver pedidos"], ["orders.items", "Modificar ítems"], ["orders.cancel", "Cancelar pedidos"], ["orders.deliver", "Gestionar entregas"], ["orders.payment", "Gestionar pagos"], ["kitchen.view", "Ver cocina"], ["kitchen.ready", "Marcar pedidos listos"], ["waiter.view", "Ver operación de mozos"], ["waiter.resolve", "Resolver solicitudes"], ["waiter.serve", "Marcar entregas"], ["cash.view", "Ver caja"], ["cash.charge", "Registrar cobros"], ["cash.refund", "Registrar devoluciones"], ["tables.view", "Ver mesas"], ["tables.open", "Abrir mesas"], ["tables.close", "Cerrar mesas"], ["reviews.view", "Ver reseñas"], ["builder.view", "Ver constructor"], ["products.view", "Ver productos"], ["products.manage", "Administrar productos"], ["categories.view", "Ver categorías"], ["categories.manage", "Administrar categorías"], ["locations.view", "Ver ubicaciones"], ["history.view", "Ver historial y reportes"], ["staff.view", "Ver colaboradores"], ["staff.manage", "Administrar colaboradores"], ["settings.view", "Ver configuración"], ["settings.manage", "Modificar configuración"]],
  events: [["dashboard.view", "Ver panel"], ["events.view", "Ver eventos"], ["events.manage", "Administrar eventos"], ["attendees.view", "Ver inscriptos"], ["attendees.manage", "Administrar inscriptos"], ["payments.manage", "Gestionar pagos"], ["checkin.manage", "Gestionar acreditación"], ["settings.manage", "Modificar configuración"]],
  e_events: [["dashboard.view", "Ver panel"], ["events.view", "Ver eventos"], ["events.manage", "Administrar eventos"], ["attendees.view", "Ver inscriptos"], ["attendees.manage", "Administrar inscriptos"], ["checkin.manage", "Gestionar acreditación"], ["staff.manage", "Administrar colaboradores"], ["settings.manage", "Modificar configuración"]]
};

export const BUSINESS_STAFF_ROLE_PERMISSIONS = {
  guest_experience: {
    administrator: GUEST_STAFF_ROLES.administrator.permissions,
    reception: GUEST_STAFF_ROLES.reception.permissions,
    read_only: GUEST_STAFF_ROLES.read_only.permissions,
  },
  turnos: {
    administrator: ["dashboard.view", "calendar.view", "calendar.manage", "bookings.view", "bookings.create", "bookings.approve", "bookings.reschedule", "bookings.cancel", "bookings.checkin", "bookings.complete", "customers.view", "customers.manage", "services.view", "services.manage", "resources.view", "resources.manage", "availability.view", "availability.manage", "settings.view", "settings.manage", "staff.view", "staff.manage", "audit.view"],
    reception: ["dashboard.view", "calendar.view", "bookings.view", "bookings.create", "bookings.approve", "bookings.reschedule", "bookings.cancel", "availability.view", "availability.manage", "customers.view"],
    read_only: ["dashboard.view", "calendar.view", "bookings.view", "availability.view"],
  },
  club: {
    administrator: ["dashboard.view", "calendar.view", "calendar.manage", "bookings.view", "bookings.create", "bookings.approve", "bookings.reschedule", "bookings.cancel", "bookings.checkin", "bookings.complete", "availability.view", "availability.manage", "resources.view", "resources.manage", "services.view", "services.manage", "sports.disciplines.view", "sports.disciplines.manage", "sports.rates.view", "sports.rates.manage", "sports.settings.view", "sports.settings.manage", "sports.publication.manage", "staff.view", "staff.manage", "audit.view"],
    reception: ["dashboard.view", "calendar.view", "bookings.view", "bookings.create", "bookings.approve", "bookings.reschedule", "bookings.cancel", "bookings.checkin", "availability.view"],
    coordinator: ["dashboard.view", "calendar.view", "calendar.manage", "bookings.view", "bookings.create", "bookings.approve", "bookings.reschedule", "bookings.cancel", "bookings.checkin", "bookings.complete", "availability.view", "availability.manage", "resources.view", "services.view", "services.manage", "sports.disciplines.view", "sports.rates.view", "sports.rates.manage"],
    instructor: ["dashboard.view", "calendar.view", "bookings.view", "bookings.checkin", "bookings.complete", "availability.view"],
    read_only: ["dashboard.view", "calendar.view", "bookings.view", "availability.view", "resources.view", "services.view", "sports.disciplines.view"],
  },
  store: {
    administrator: ["dashboard.view", "products.view", "products.manage", "categories.view", "categories.manage", "orders.view", "orders.manage", "inventory.view", "inventory.manage", "settings.view", "settings.manage", "staff.manage"],
    operator: ["dashboard.view", "products.view", "orders.view", "orders.manage", "inventory.view"],
    read_only: ["dashboard.view", "products.view", "orders.view", "inventory.view"],
  },
  resto: {
    administrator: ["dashboard.view", "orders.view", "orders.items", "orders.cancel", "orders.deliver", "orders.payment", "kitchen.view", "kitchen.ready", "waiter.view", "waiter.resolve", "waiter.serve", "cash.view", "cash.charge", "cash.refund", "tables.view", "tables.open", "tables.close", "settings.view", "settings.manage", "staff.manage"],
    manager: ["dashboard.view", "orders.view", "orders.items", "orders.cancel", "orders.deliver", "orders.payment", "kitchen.view", "kitchen.ready", "waiter.view", "waiter.resolve", "waiter.serve", "tables.view", "tables.open", "tables.close"],
    waiter: ["dashboard.view", "tables.view", "tables.open", "orders.view", "orders.deliver", "waiter.view", "waiter.resolve", "waiter.serve"],
    kitchen: ["dashboard.view", "orders.view", "kitchen.view", "kitchen.ready"],
    cashier: ["dashboard.view", "cash.view", "cash.charge", "cash.refund", "tables.view", "orders.view", "orders.payment"],
    read_only: ["dashboard.view", "orders.view", "tables.view"],
  },
  e_events: {
    administrator: ["dashboard.view", "events.view", "events.manage", "attendees.view", "attendees.manage", "checkin.manage", "staff.manage", "settings.manage"],
    operator: ["dashboard.view", "events.view", "attendees.view", "attendees.manage", "checkin.manage"],
    checkin: ["dashboard.view", "events.view", "attendees.view", "checkin.manage"],
    read_only: ["dashboard.view", "events.view", "attendees.view"],
  },
  events: {
    administrator: ["dashboard.view", "events.view", "events.manage", "attendees.view", "attendees.manage", "payments.manage", "checkin.manage", "settings.manage"],
    operator: ["dashboard.view", "events.view", "attendees.view", "attendees.manage", "payments.manage", "checkin.manage"],
    checkin: ["dashboard.view", "events.view", "attendees.view", "checkin.manage"],
    read_only: ["dashboard.view", "events.view", "attendees.view"],
  },
};

BUSINESS_STAFF_PERMISSION_CATALOG.club.push(
  ["sports.players.view", "Ver jugadores y socios"],
  ["sports.players.manage", "Administrar jugadores y socios"],
  ["sports.categories.view", "Ver categorías deportivas"],
  ["sports.categories.manage", "Administrar categorías deportivas"]
);
BUSINESS_STAFF_ROLE_PERMISSIONS.club.administrator.push("sports.players.view", "sports.players.manage", "sports.categories.view", "sports.categories.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.reception.push("sports.players.view", "sports.players.manage", "sports.categories.view");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.coordinator.push("sports.players.view", "sports.players.manage", "sports.categories.view", "sports.categories.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.instructor.push("sports.players.view", "sports.categories.view");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.read_only.push("sports.players.view", "sports.categories.view");

BUSINESS_STAFF_PERMISSION_CATALOG.club.push(
  ["sports.teams.view", "Ver parejas y equipos"],
  ["sports.teams.manage", "Administrar parejas y equipos"]
);
BUSINESS_STAFF_ROLE_PERMISSIONS.club.administrator.push("sports.teams.view", "sports.teams.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.coordinator.push("sports.teams.view", "sports.teams.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.instructor.push("sports.teams.view");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.read_only.push("sports.teams.view");

BUSINESS_STAFF_PERMISSION_CATALOG.club.push(
  ["sports.tournaments.view", "Ver torneos e inscripciones"],
  ["sports.tournaments.manage", "Administrar torneos e inscripciones"]
);
BUSINESS_STAFF_ROLE_PERMISSIONS.club.administrator.push("sports.tournaments.view", "sports.tournaments.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.coordinator.push("sports.tournaments.view", "sports.tournaments.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.instructor.push("sports.tournaments.view");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.read_only.push("sports.tournaments.view");

BUSINESS_STAFF_PERMISSION_CATALOG.club.push(
  ["sports.matches.view", "Ver fixture y resultados"],
  ["sports.matches.manage", "Administrar partidos y resultados"]
);
BUSINESS_STAFF_ROLE_PERMISSIONS.club.administrator.push("sports.matches.view", "sports.matches.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.coordinator.push("sports.matches.view", "sports.matches.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.instructor.push("sports.matches.view", "sports.matches.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.read_only.push("sports.matches.view");

BUSINESS_STAFF_PERMISSION_CATALOG.club.push(
  ["sports.match_formats.view", "Ver formatos de partido"],
  ["sports.match_formats.manage", "Administrar formatos de partido"]
);
BUSINESS_STAFF_ROLE_PERMISSIONS.club.administrator.push("sports.match_formats.view", "sports.match_formats.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.coordinator.push("sports.match_formats.view", "sports.match_formats.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.instructor.push("sports.match_formats.view");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.read_only.push("sports.match_formats.view");

BUSINESS_STAFF_PERMISSION_CATALOG.club.push(
  ["sports.rankings.view", "Ver clasificaciones y rankings"],
  ["sports.rankings.manage", "Administrar clasificaciones y rankings"]
);
BUSINESS_STAFF_ROLE_PERMISSIONS.club.administrator.push("sports.rankings.view", "sports.rankings.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.coordinator.push("sports.rankings.view", "sports.rankings.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.instructor.push("sports.rankings.view");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.read_only.push("sports.rankings.view");

BUSINESS_STAFF_PERMISSION_CATALOG.club.push(
  ["sports.coach.schedule.view", "Ver agenda propia del profesor"],
  ["sports.coach.schedule.manage", "Administrar disponibilidad propia"],
  ["sports.coach.finance.view", "Ver movimientos y liquidaciones propias"],
  ["sports.finance.view", "Ver reportes económicos del club"],
  ["sports.finance.manage", "Administrar comisiones y liquidaciones"]
);
BUSINESS_STAFF_ROLE_PERMISSIONS.club.administrator.push("sports.coach.schedule.view", "sports.coach.schedule.manage", "sports.coach.finance.view", "sports.finance.view", "sports.finance.manage");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.coordinator.push("sports.finance.view");
BUSINESS_STAFF_ROLE_PERMISSIONS.club.instructor.push("sports.coach.schedule.view", "sports.coach.schedule.manage", "sports.coach.finance.view");

export function getBusinessStaffPermissions(appCode, roleCode, custom = []) {
  const permissions = BUSINESS_STAFF_ROLE_PERMISSIONS[appCode]?.[roleCode];
  return [...new Set((permissions || custom || []).map(String))];
}
