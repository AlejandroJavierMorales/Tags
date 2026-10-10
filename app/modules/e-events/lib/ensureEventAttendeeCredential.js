import { v4 as uuidv4 } from "uuid";

import { createQr } from "@/app/lib/create-qr";

export function eventCredentialBaseUrl(value = "", preferredHost = "") {
    const cleanPreferredHost = String(preferredHost || "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (cleanPreferredHost && cleanPreferredHost !== "localhost" && !cleanPreferredHost.startsWith("127.")) {
        return `https://${cleanPreferredHost}`;
    }
    const candidate = String(value || "").replace(/\/$/, "");
    try {
        const host = new URL(candidate).hostname;
        if (host !== "localhost" && host !== "127.0.0.1") return candidate;
    } catch {}
    return "https://tags.com.ar";
}

export async function ensureEventAttendeeCredential({ connection, attendeeId, baseUrl }) {
    const [[attendee]] = await connection.query(
        `SELECT a.id,a.name,a.email,a.qr_code_id,a.qr_token,a.event_id,q.code AS qr_code,
                e.business_id,e.name AS event_title,
                (SELECT s.primary_host
                   FROM tags_directory_listings l
                   INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id AND sl.publication_status='published'
                   INNER JOIN tags_directory_sites s ON s.id=sl.site_id AND s.is_active=1
                  WHERE l.business_id=e.business_id AND l.status='published'
                  ORDER BY (s.code='calamuchitar') DESC,s.id
                  LIMIT 1) AS directory_host
           FROM tags_event_attendees a
           INNER JOIN tags_events e ON e.id=a.event_id
           LEFT JOIN tags_qr_codes q ON q.id=a.qr_code_id
          WHERE a.id=?
          LIMIT 1`,
        [attendeeId]
    );

    if (!attendee) throw new Error("ATTENDEE_NOT_FOUND");
    const publicBaseUrl = eventCredentialBaseUrl(baseUrl, attendee.directory_host);
    if (attendee.qr_token && attendee.qr_code_id) {
        return {
            qrId: attendee.qr_code_id,
            qrCode: attendee.qr_code,
            qrToken: attendee.qr_token,
            qrUrl: `${publicBaseUrl}/e/access/${attendee.qr_token}`
        };
    }

    const [[product]] = await connection.query(
        `SELECT p.id
           FROM tags_products p
           INNER JOIN tags_qr_types t ON t.id=p.qr_type_id
          WHERE t.code='event_guest' AND p.is_digital=1
          LIMIT 1`
    );
    const qrToken = attendee.qr_token || uuidv4();
    const qrUrl = `${publicBaseUrl}/e/access/${qrToken}`;
    const credentialLabel = `Evento: ${attendee.event_title} - Asistente: ${attendee.name} - Inscripcion #${attendee.id}`;
    if (!product) throw new Error("EVENT_QR_CONFIGURATION_MISSING");

    const qr = await createQr({
        connection,
        business_id: attendee.business_id,
        product_id: product.id,
        event_id: attendee.event_id,
        label: credentialLabel,
        value: `EVENT-ATTENDEE-${attendee.id}`,
        final_url: qrUrl
    });

    await connection.query(
        `UPDATE tags_event_attendees SET qr_code_id=?,qr_token=?,updated_at=NOW() WHERE id=?`,
        [qr.id, qrToken, attendee.id]
    );

    return { qrId: qr.id, qrCode: qr.code, qrToken, qrUrl };
}
