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
