import { cleanGuestText } from "./guestExperienceService";

export async function ensureGuestConversation(connection, guestAppId, stayId) {
    await connection.query("INSERT INTO tags_guest_conversations (guest_app_id,stay_id,status) VALUES (?,?,'open') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),status=IF(status='closed','open',status)", [guestAppId, stayId]);
    const [rows] = await connection.query("SELECT * FROM tags_guest_conversations WHERE guest_app_id=? AND stay_id=? LIMIT 1", [guestAppId, stayId]);
    return rows[0];
}
export const cleanGuestMessage = value => cleanGuestText(value, 3000);
export function requestStatusLabel(status) { return status === "in_progress" ? "En atención" : status === "resolved" ? "Resuelta" : status === "cancelled" ? "Cancelada" : "Abierta"; }
