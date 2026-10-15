export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import {
  getGuestAdminAccess,
  guestAdminAccessResponse,
} from "@/app/modules/guest-experience/lib/getGuestAdminAccess";
import {
  cleanGuestMessage,
  ensureGuestConversation,
} from "@/app/modules/guest-experience/lib/guestMessagingService";
import { guestError } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { sendBusinessPush } from "@/app/modules/notifications/server/sendBusinessPush";

async function context(source, permission) {
  const businessId = Number(source.businessId || 0);
  const guestAppId = Number(source.guestAppId || 0);
  const access = await getGuestAdminAccess({ businessId, guestAppId, permission });
  return { businessId, guestAppId, access };
}

export async function GET(req) {
  try {
    const query = Object.fromEntries(new URL(req.url).searchParams);
    const { guestAppId, access } = await context(query, "guest.messages.view");
    if (!access.allowed) return guestAdminAccessResponse(access);
    const stayId = Number(query.stayId || 0);

    if (!stayId) {
      const [rows] = await db.query(
        `SELECT cv.id conversation_id,s.id stay_id,COALESCE(cv.status,'open') status,
          cv.last_message_at,s.stay_code,s.status stay_status,g.name guest_name,
          g.email guest_email,g.phone guest_phone,u.name unit_name,
          (SELECT COUNT(*) FROM tags_guest_messages m
            WHERE m.conversation_id=cv.id AND m.sender_type='guest'
              AND m.read_by_admin_at IS NULL) unread_count,
          (SELECT COUNT(*) FROM tags_guest_service_requests r
            WHERE r.stay_id=s.id AND r.status IN ('open','in_progress')) open_request_count,
          (SELECT m.message FROM tags_guest_messages m
            WHERE m.conversation_id=cv.id ORDER BY m.id DESC LIMIT 1) last_message
        FROM tags_guest_stays s
        LEFT JOIN tags_guest_conversations cv
          ON cv.stay_id=s.id AND cv.guest_app_id=s.guest_app_id
        INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
        LEFT JOIN tags_guest_units u ON u.id=s.unit_id
        WHERE s.guest_app_id=? AND s.status IN ('reserved','active','no_show_rebooking')
        ORDER BY cv.last_message_at IS NULL,
          COALESCE(cv.last_message_at,s.starts_at) DESC`,
        [guestAppId],
      );
      return Response.json({
        ok: true,
        conversations: rows,
        summary: {
          unread: rows.reduce((total, item) => total + Number(item.unread_count || 0), 0),
          openRequests: rows.reduce(
            (total, item) => total + Number(item.open_request_count || 0),
            0,
          ),
        },
      });
    }

    const [stays] = await db.query(
      `SELECT s.id,s.stay_code,s.status,g.name guest_name,g.email guest_email,
        g.phone guest_phone,u.name unit_name
      FROM tags_guest_stays s
      INNER JOIN tags_guest_people g ON g.id=s.primary_guest_id
      LEFT JOIN tags_guest_units u ON u.id=s.unit_id
      WHERE s.id=? AND s.guest_app_id=? AND s.status IN ('reserved','active','no_show_rebooking')
      LIMIT 1`,
      [stayId, guestAppId],
    );
    if (!stays[0]) return guestError("Estadía no encontrada o finalizada", 404);

    const [conversations] = await db.query(
      "SELECT * FROM tags_guest_conversations WHERE guest_app_id=? AND stay_id=? LIMIT 1",
      [guestAppId, stayId],
    );
    if (!conversations[0]) {
      return Response.json({ ok: true, stay: stays[0], conversation: null, messages: [] });
    }

    await db.query(
      `UPDATE tags_guest_messages
        SET read_by_admin_at=COALESCE(read_by_admin_at,NOW())
        WHERE conversation_id=? AND sender_type='guest' AND read_by_admin_at IS NULL`,
      [conversations[0].id],
    );
    const [messages] = await db.query(
      `SELECT id,request_id,sender_type,sender_name,message_type,message,
        read_by_guest_at,read_by_admin_at,created_at
      FROM tags_guest_messages WHERE conversation_id=?
      ORDER BY id ASC LIMIT 500`,
      [conversations[0].id],
    );
    return Response.json({
      ok: true,
      stay: stays[0],
      conversation: conversations[0],
      messages,
    });
  } catch (error) {
    console.error("GUEST ADMIN MESSAGES GET ERROR", error);
    return guestError(
      error?.code === "ER_NO_SUCH_TABLE"
        ? "Mensajes todavía no está habilitado"
        : "No se pudieron cargar los mensajes",
      500,
    );
  }
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return guestError("Cuerpo JSON inválido");
  const { businessId, guestAppId, access } = await context(body, "guest.messages.reply");
  if (!access.allowed) return guestAdminAccessResponse(access);
  const stayId = Number(body.stayId || 0);
  const message = cleanGuestMessage(body.message);
  if (!stayId || !message) return guestError("Estadía y mensaje son obligatorios");

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [stays] = await connection.query(
      `SELECT s.id,s.status,s.primary_guest_id,a.slug
      FROM tags_guest_stays s
      INNER JOIN tags_guest_apps a
        ON a.id=s.guest_app_id AND a.business_id=?
      WHERE s.id=? AND s.guest_app_id=? AND s.status IN ('reserved','active','no_show_rebooking')
      LIMIT 1 FOR UPDATE`,
      [businessId, stayId, guestAppId],
    );
    if (!stays[0]) {
      await connection.rollback();
      return guestError("La estadía no existe o ya finalizó", 404);
    }

    const conversation = await ensureGuestConversation(connection, guestAppId, stayId);
    const actorId = access.session?.id || access.session?.userId || null;
    const sender = access.session?.name || access.session?.user_name || "Alojamiento";
    const [result] = await connection.query(
      `INSERT INTO tags_guest_messages
        (conversation_id,guest_app_id,stay_id,sender_type,sender_id,sender_name,
          message,read_by_admin_at)
      VALUES (?,?,?,'admin',?,?,?,NOW())`,
      [conversation.id, guestAppId, stayId, actorId, sender, message],
    );
    await connection.query(
      "UPDATE tags_guest_conversations SET last_message_at=NOW(),status='open' WHERE id=?",
      [conversation.id],
    );
    await connection.query(
      `INSERT INTO tags_guest_audit_log
        (guest_app_id,stay_id,actor_type,actor_id,action,entity_type,entity_id)
      VALUES (?,?,'owner',?,'message.replied','message',?)`,
      [guestAppId, stayId, actorId, result.insertId],
    );
    await connection.commit();

    await sendBusinessPush({
      businessId,
      moduleCode: "guest_experience",
      eventCode: "guest_message_replied",
      entityType: "message",
      entityId: result.insertId,
      title: "Nuevo mensaje del alojamiento",
      body: message.slice(0, 220),
      url: "mensajes",
      idempotencyKey: `guest-message-guest:${result.insertId}`,
      audience: "guest",
      recipientId: stays[0].primary_guest_id,
    });
    return Response.json({ ok: true, id: result.insertId }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error("GUEST ADMIN MESSAGE POST ERROR", error);
    return guestError("No se pudo enviar la respuesta", 500);
  } finally {
    connection.release();
  }
}
