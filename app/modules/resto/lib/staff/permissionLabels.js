export const RESTO_PERMISSION_LABELS = {
    "dashboard.view": "Acceder al inicio operativo",
    "cash.view": "Consultar caja",
    "cash.open": "Abrir caja",
    "cash.movement": "Registrar ingresos y egresos",
    "cash.charge": "Registrar cobros",
    "cash.refund": "Registrar devoluciones",
    "cash.close": "Cerrar caja y hacer arqueo",
    "tables.view": "Consultar mesas",
    "tables.open": "Abrir y habilitar mesas",
    "tables.close": "Cerrar mesas",
    "tables.cancel": "Cancelar sesiones de mesa",
    "orders.view": "Consultar pedidos",
    "orders.items": "Modificar productos del pedido",
    "orders.cancel": "Cancelar pedidos o productos",
    "orders.deliver": "Marcar pedidos como entregados",
    "orders.payment": "Registrar pagos desde pedidos",
    "kitchen.view": "Consultar cocina",
    "kitchen.ready": "Marcar productos como listos",
    "waiter.view": "Acceder a la pantalla de mozo",
    "waiter.resolve": "Atender llamados y solicitudes de cuenta",
    "waiter.serve": "Marcar productos como servidos",
    "history.view": "Consultar historial de pedidos",
    "products.view": "Consultar productos",
    "products.manage": "Crear, editar y eliminar productos",
    "categories.view": "Consultar categorías",
    "categories.manage": "Crear, editar y eliminar categorías",
    "locations.view": "Consultar sectores, mesas y QR",
    "locations.manage": "Gestionar sectores, mesas y QR",
    "settings.view": "Consultar configuración",
    "settings.manage": "Modificar configuración",
    "publish.manage": "Publicar o despublicar el restaurante",
    "staff.view": "Consultar personal y permisos",
    "staff.manage": "Gestionar personal, roles y permisos",
    "audit.view": "Consultar actividad del restaurante",
    "delivery.view": "Consultar delivery",
    "delivery.assign": "Asignar repartidores",
    "delivery.status": "Actualizar estados de delivery",
    "delivery.remittance": "Gestionar rendiciones de delivery",
    "delivery.settlement": "Gestionar liquidaciones de delivery"
};

export const RESTO_PERMISSION_MODULES = {
    dashboard: "Inicio",
    cash: "Caja",
    tables: "Mesas",
    orders: "Pedidos",
    kitchen: "Cocina",
    waiter: "Mozo",
    history: "Historial",
    products: "Productos",
    categories: "Categorías",
    locations: "Sectores y mesas",
    settings: "Configuración",
    staff: "Personal",
    delivery: "Delivery"
};

export function getRestoPermissionLabel(permission) {
    return RESTO_PERMISSION_LABELS[permission.code] || permission.description || permission.code;
}

export function getRestoPermissionModule(permission) {
    return RESTO_PERMISSION_MODULES[permission.module_key] || permission.module_name || "Otros permisos";
}
