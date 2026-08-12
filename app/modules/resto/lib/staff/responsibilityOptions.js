export const RESTO_NOTIFICATION_OPTIONS = [
    { code: "waiter_calls", label: "Llamados al personal", description: "Pedidos de ayuda desde una mesa." },
    { code: "bill_requests", label: "Solicitudes de cuenta", description: "Clientes que piden cerrar o pagar la cuenta." },
    { code: "customer_messages", label: "Mensajes de clientes", description: "Mensajes recibidos desde el pedido." },
    { code: "kitchen_orders", label: "Avisos de cocina", description: "Nuevos pedidos o productos para preparar." },
    { code: "order_status", label: "Estados de pedidos", description: "Cambios importantes del pedido." },
    { code: "delivery", label: "Delivery", description: "Despacho, entregas e incidencias." },
    { code: "takeaway", label: "Take away", description: "Pedidos para retirar en el local." }
];

export const RESTO_NOTIFICATION_SCOPES = [
    ["none", "No recibir"],
    ["assigned", "Solo mesas asignadas"],
    ["all", "Todas las mesas"],
    ["unassigned", "Mesas sin asignar"]
];
