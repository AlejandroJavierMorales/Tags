import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const secret = process.env.SYSTEM_CRON_SECRET || "";
  const received = (req.headers.get("authorization") || req.headers.get("x-cron-secret") || "").replace(/^Bearer\s+/i, "").trim();
  if (!secret || received !== secret) return Response.json({ error: "No autorizado" }, { status: 401 });

  const conn = await db.getConnection();
  try {
    const [expired] = await conn.query(`SELECT DISTINCT s.id subscription_id,s.business_id,b.name,b.email, s.expires_at, ds.name site_name FROM tags_subscriptions s INNER JOIN tags_businesses b ON b.id=s.business_id INNER JOIN tags_business_addons ba ON ba.business_id=s.business_id AND ba.addon_code='directory' LEFT JOIN tags_directory_listings dl ON dl.business_id=b.id LEFT JOIN tags_directory_site_listings dsl ON dsl.listing_id=dl.id LEFT JOIN tags_directory_sites ds ON ds.id=dsl.site_id WHERE s.status='trial' AND s.expires_at IS NOT NULL AND s.expires_at<NOW()`);
    if (!expired.length) return Response.json({ ok: true, expired: 0 });
    await conn.beginTransaction();
    for (const item of expired) {
      await conn.query("UPDATE tags_subscriptions SET status='inactive',updated_at=NOW() WHERE id=? AND status='trial'", [item.subscription_id]);
      await conn.query("UPDATE tags_businesses SET subscription_status='inactive',plan_expires_at=?,updated_at=NOW() WHERE id=?", [item.expires_at, item.business_id]);
      await conn.query("UPDATE tags_business_addons SET status='inactive',updated_at=NOW() WHERE business_id=? AND addon_code IN ('directory','client_reviews') AND status='active'", [item.business_id]);
      await conn.query("UPDATE tags_directory_listings SET status='archived',updated_at=NOW() WHERE business_id=?", [item.business_id]);
      await conn.query("UPDATE tags_directory_site_listings dsl INNER JOIN tags_directory_listings dl ON dl.id=dsl.listing_id SET dsl.publication_status='archived',dsl.updated_at=NOW() WHERE dl.business_id=? AND dsl.publication_status='published'", [item.business_id]);
    }
    await conn.commit();
    const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
    const notification = await sendMail({ to: admins.map(item => item.email), subject: `Fichas de Directorio vencidas (${expired.length})`, text: expired.map(item => `${item.name} · ${item.email} · ${item.site_name || "Directorio"}`).join("\n"), html: `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226"><h1>Fichas de Directorio vencidas</h1><p>La plataforma desactivó ${expired.length} inscripción(es) que superaron las 72 horas sin pago.</p><ul>${expired.map(item => `<li><strong>${item.name}</strong> · ${item.email} · ${item.site_name || "Directorio"}</li>`).join("")}</ul></div>` });
    await Promise.all(expired.filter(item => item.email).map(item => sendMail({
      to: item.email,
      subject: `Tu ficha de ${item.site_name || "Directorio"} fue pausada`,
      text: `La inscripción de ${item.name} superó las 72 horas sin acreditación del pago y la ficha fue desactivada. Contactanos para reactivarla.`,
      html: `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226"><h1>Ficha pausada</h1><p>La inscripción de <strong>${item.name}</strong> superó las 72 horas sin acreditación del pago. La ficha fue desactivada automáticamente.</p><p>Contactanos para revisar la suscripción y reactivarla.</p></div>`
    })));
    return Response.json({ ok: true, expired: expired.length, platformNotified: notification.ok });
  } catch (error) {
    await conn.rollback();
    console.error("DIRECTORY SIGNUP EXPIRATION ERROR", error);
    return Response.json({ error: "No se pudieron vencer las inscripciones" }, { status: 500 });
  } finally { conn.release(); }
}
