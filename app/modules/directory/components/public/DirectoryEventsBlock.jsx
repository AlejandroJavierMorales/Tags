import Link from "next/link";
import { FaArrowRight, FaCalendarDays, FaLocationDot, FaTicket } from "react-icons/fa6";
import "./DirectoryEventsBlock.css";

function when(value) {
    return value ? new Date(value).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" }) : "Fecha a confirmar";
}

export default function DirectoryEventsBlock({ events = [], listingSlug, content = {} }) {
    if (!events.length) return null;
    const visible = events.slice(0, Math.max(1, Number(content.limit || 3)));
    const customStyle = content.useDirectoryTheme === false ? {
        "--directory-events-background": content.backgroundColor || "#f3f7f5",
        "--directory-events-surface": content.surfaceColor || "#ffffff",
        "--directory-events-text": content.textColor || "#17231d",
        "--directory-events-accent": content.accentColor || "#26734f",
        "--directory-events-radius": content.borderRadius || "18px"
    } : {};
    return <div className="tags_directory_events_block" style={{ ...customStyle, "--directory-events-padding": content.padding || "24px" }}>
        <header><div><span>{content.eyebrow || "EVENTOS"}</span><h2>{content.title || "Próximos eventos"}</h2><p>{content.description || "Inscribite y reservá tu lugar."}</p></div>{events.length > visible.length && <Link href={`/${listingSlug}/eventos`}>Ver todos <FaArrowRight /></Link>}</header>
        <div className="tags_directory_events_grid">{visible.map(event => <article key={event.id}>
            {event.cover_image && <img src={event.cover_image} alt="" />}
            <div><small><FaCalendarDays /> {when(event.starts_at)}</small><h3>{event.public_title || event.name}</h3>{event.location && <p><FaLocationDot /> {event.location}</p>}<p>{event.public_description || event.description}</p><footer>{event.remaining !== null && <span>{event.remaining > 0 ? `${event.remaining} lugares disponibles` : "Sin lugares"}</span>}<Link href={`/${listingSlug}/eventos/${event.public_slug}`}><FaTicket /> Ver evento</Link></footer></div>
        </article>)}</div>
    </div>;
}
