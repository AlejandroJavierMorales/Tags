import Link from "next/link";
import { FaArrowLeft, FaCalendarDays } from "react-icons/fa6";
import { buildDirectoryThemeStyle } from "../../lib/directoryThemeStyle";
import "./DirectoryEventsShell.css";

export default function DirectoryEventsShell({ data, web, children, title = "Eventos", description = "" }) {
    const listing = data.listing;
    const logo = listing.business_logo_url || data.media?.find(item => item.media_type === "logo")?.url || null;
    const style = buildDirectoryThemeStyle({ themeTokens: web?.page?.theme?.css_tokens || {}, globalStyles: web?.page?.global_styles || {} });
    return <main className="tags_directory_events_page" style={style}>
        <header className="tags_directory_events_page_header">
            <Link href={`/${listing.slug}`} className="tags_directory_events_page_back"><FaArrowLeft /> Volver a {listing.display_name}</Link>
            <div>{logo ? <img src={logo} alt={`Logo de ${listing.display_name}`} /> : <span><FaCalendarDays /></span>}<div><small>{listing.display_name}</small><h1>{title}</h1>{description && <p>{description}</p>}</div></div>
        </header>
        <div className="tags_directory_events_page_content">{children}</div>
        <footer><Link href={`/${listing.slug}`}>Volver a la Web de {listing.display_name}</Link></footer>
    </main>;
}
