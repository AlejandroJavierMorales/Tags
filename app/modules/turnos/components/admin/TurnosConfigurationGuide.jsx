import "./TurnosConfigurationGuide.css";

const CONTENT = {
    spa: { service: "Tratamiento que reserva el cliente, por ejemplo Masaje de 60 minutos.", requirement: "Quién o qué debe estar libre para realizarlo: un profesional, una cabina o ambos.", resource: "Cada profesional o cabina se carga como recurso. Una persona o cabina normalmente tiene capacidad 1." },
    bike_kayak: { service: "Modalidad que alquila el cliente, por ejemplo Bicicleta por 2 horas o Kayak por medio día.", requirement: "El tipo de equipo que debe estar disponible para aceptar el alquiler.", resource: "Podés cargar un stock agrupado, por ejemplo Bicicletas rodado 26 con capacidad 10. Esa capacidad es la cantidad alquilable al mismo tiempo." },
    hairdresser: { service: "Trabajo que solicita el cliente, por ejemplo Corte, Color o Peinado.", requirement: "El tipo de profesional que debe estar disponible para atender ese servicio.", resource: "Cada peluquera o peluquero se carga como recurso con capacidad 1. Dos profesionales permiten dos turnos simultáneos." },
    generic: { service: "Actividad que el cliente quiere reservar.", requirement: "Persona, espacio o equipo necesario para prestar el servicio.", resource: "La capacidad indica cuántas reservas o unidades puede atender ese recurso al mismo tiempo." }
};

export default function TurnosConfigurationGuide({ templateCode }) {
    const content = CONTENT[templateCode] || CONTENT.generic;
    return <section className="tags_turnos_configuration_guide"><header><span>GUÍA DE CONFIGURACIÓN</span><h2>Qué significa cada elemento</h2></header><div><article><strong>Servicio</strong><p>{content.service}</p></article><article><strong>Recurso necesario</strong><p>{content.requirement}</p></article><article><strong>Recurso y capacidad</strong><p>{content.resource}</p></article></div></section>;
}
