import { FaCalendarDays, FaClock, FaEye, FaLocationDot, FaMountainSun, FaPhone, FaWhatsapp } from "react-icons/fa6";
import ChatMarkdown from "./ChatMarkdown";

function cleanPhone(value) {
    const clean = String(value || "").replace(/[^\d+]/g, "");
    return clean;
}

function formatDate(value) {
    if (!value) return "";
    const raw = String(value).trim();
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    const date = new Date(raw.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        ...(/[T ]\d{2}:\d{2}/.test(raw) ? { hour: "2-digit", minute: "2-digit" } : {})
    }).format(date);
}

const PLAN_LABELS = {
    activity: "Paseo o actividad",
    dining: "Gastronomía",
    event: "Evento vigente"
};

export default function ChatMessage({ role, content, candidates = [] }) {
    return <div className={`tags_ai_chat_message tags_ai_chat_message_${role}`}>
        <div className="tags_ai_chat_message_bubble">
            <ChatMarkdown content={content} />
            {candidates.length > 0 && <div className="tags_ai_chat_candidates">
                {candidates.map(item => {
                    const whatsappNumber = cleanPhone(item.whatsapp).replace(/\D/g, "");
                    const whatsapp = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";
                    const phoneNumber = cleanPhone(item.phone);
                    const phone = phoneNumber ? `tel:${phoneNumber}` : "";
                    const directions = Number.isFinite(item.latitude) && Number.isFinite(item.longitude) ? `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}` : "";
                    return <article className="tags_ai_chat_candidate" key={item.entityKey || item.id}>
                        {item.imageUrl && <img src={item.imageUrl} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />}
                        <div className="tags_ai_chat_candidate_body">
                            {PLAN_LABELS[item.planSlot] && <em className="tags_ai_chat_candidate_plan_slot">{PLAN_LABELS[item.planSlot]}</em>}
                            <strong>{item.name}</strong>
                            {item.matchType === "nearby_alternative" && <em className="tags_ai_chat_candidate_alternative">Alternativa cercana · consultar disponibilidad</em>}
                            {item.locality && <small><FaLocationDot /> {item.locality}</small>}
                            {item.address && <small><FaLocationDot /> {item.address}</small>}
                            {item.eventStart && <small><FaCalendarDays /> {formatDate(item.eventStart)}{item.eventEnd && item.eventEnd !== item.eventStart ? ` al ${formatDate(item.eventEnd)}` : ""}</small>}
                            {item.schedule && <small><FaClock /> {item.schedule}</small>}
                            {item.duration && <small><FaClock /> Duración: {item.duration}</small>}
                            {item.difficulty && <small><FaMountainSun /> Dificultad: {item.difficulty}</small>}
                            {Number.isFinite(item.distanceKm) && <small className="tags_ai_chat_candidate_distance">A {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`} de tu ubicación</small>}
                            <div className="tags_ai_chat_candidate_actions">{item.href && <a href={item.href}><FaEye /> Ver</a>}{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><FaWhatsapp /> WhatsApp</a>}{phone && <a href={phone}><FaPhone /> Llamar</a>}{directions && <a href={directions} target="_blank" rel="noreferrer"><FaLocationDot /> Cómo llegar</a>}</div>
                        </div>
                    </article>;
                })}
            </div>}
        </div>
    </div>;
}
