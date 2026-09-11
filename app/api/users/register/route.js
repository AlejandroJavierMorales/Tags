// =====================================
// API: /api/users/register
// Descripcion: Alta minima de una persona en el contexto actual.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getChannelContextFromHost, getRequestHost } from "@/app/lib/channelContext";
import { createOrGetUser } from "@/app/modules/loyalty/lib/loyaltyMemberService";
import { sendUserMagicLink } from "@/app/modules/users/lib/sendUserMagicLink";

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        const channel = await getChannelContextFromHost(getRequestHost(request));
        if (body?.accept_terms !== true) {
            return Response.json({ success: false, error: "Tenés que aceptar los términos y la política de privacidad" }, { status: 400 });
        }
        const normalizedEmail = String(body?.email || "").trim().toLowerCase();
        const [existingUsers] = await db.query(
            `SELECT id,email,email_verified_at,status FROM tags_users WHERE email_normalized=? LIMIT 1`,
            [normalizedEmail]
        );
        if (existingUsers[0]) {
            return Response.json({
                success: false,
                code: "USER_ALREADY_EXISTS",
                error: "Ya existe una cuenta de usuario con ese email. Ingresá desde Acceso a tu cuenta para solicitar un nuevo magic link."
            }, { status: 409 });
        }

        const user = await createOrGetUser({
            email: body?.email,
            firstName: body?.first_name,
            lastName: body?.last_name,
            source: body?.source || channel.code,
            phone: body?.phone,
            whatsapp: body?.whatsapp
        });

        if (channel.siteId) {
            await db.query(
                `INSERT INTO tags_user_directory_memberships
                    (user_id,directory_site_id,status,source)
                 VALUES (?,?, 'active',?)
                 ON DUPLICATE KEY UPDATE status='active',left_at=NULL,updated_at=NOW()`,
                [user.id, channel.siteId, body?.source || "registration"]
            );
        }

        if (body?.accept_terms) {
            await db.query(
                `INSERT INTO tags_user_consents
                    (user_id,consent_type,consent_version,context_code,granted,granted_at,ip_address,user_agent)
                 VALUES (?,?,?,?,1,NOW(),?,?)`,
                [
                    user.id,
                    "terms",
                    String(body?.terms_version || "1"),
                    channel.code,
                    request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
                    request.headers.get("user-agent") || null
                ]
            );
        }

        const mailResult = await sendUserMagicLink({ request, user, channel });

        console.info("USER REGISTER MAGIC LINK SENT", {
            userId: user.id,
            email: user.email,
            context: channel.code,
            messageId: mailResult?.messageId || null
        });

        return Response.json({ success: true, sent: true, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name } });
    } catch (error) {
        console.error("USER REGISTER ERROR", error);
        return Response.json({
            success: false,
            code: error?.code || "USER_REGISTER_FAILED",
            error: error.message || "No se pudo registrar el usuario"
        }, { status: 400 });
    }
}
