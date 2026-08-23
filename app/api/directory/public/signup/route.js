import crypto from "node:crypto";
import { db } from "@/app/lib/tags-db";
import { sendMail } from "@/app/lib/sendMail";
import { getDirectorySiteCodeByHost } from "@/app/modules/directory/lib/getDirectoryPublicData";
import { createSlug } from "@/app/modules/qr-page/lib/createSlug";
import { normalizeArgentinaWhatsapp } from "@/app/modules/qr-page/lib/normalizeContactFields";
import { activateDirectoryWebForBusiness } from "@/app/modules/directory/lib/activateDirectoryWebForBusiness";
import { directoryEmailBranding, directoryEmailContact, directoryEmailHeader } from "@/app/modules/directory/lib/directoryEmailBranding";
import { directoryMercadoPagoBaseUrl, ensureDirectoryMercadoPagoSubscription } from "@/app/modules/directory/lib/directoryMercadoPago";
import { getRequestBaseUrl, getRequestHost } from "@/app/lib/channelContext";
import { activateClientReviewsForBusiness } from "@/app/modules/client-reviews/lib/activateClientReviewsForBusiness";
import { currentDirectoryMonth, directoryCalendarAmount } from "@/app/modules/directory/lib/directoryCalendarPricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits.startsWith("54") ? digits : `54${digits}`}`;
}

function branding(site) {
  let config = {};
  try { config = typeof site?.brand_config === "string" ? JSON.parse(site.brand_config || "{}") : (site?.brand_config || {}); } catch { config = {}; }
  return { name: config.displayName || site?.name || "Directorio", logo: config.logoUrl || "", color: config.primaryColor || "#2f7958" };
}

function siteTerritory(site) {
  try {
    const config = typeof site.directory_config === "string" ? JSON.parse(site.directory_config || "{}") : (site.directory_config || {});
    return Number(config.territoryPlaceId || 0);
  } catch { return 0; }
}

async function resolveSite({ host, placeId }) {
  const currentCode = await getDirectorySiteCodeByHost(host);
  const [sites] = await db.query("SELECT id,code,name,primary_host,brand_config,directory_config FROM tags_directory_sites WHERE is_active=1 ORDER BY id");
  const current = sites.find(site => site.code === currentCode);
  const [places] = await db.query("SELECT id,parent_id FROM tags_geo_places WHERE is_active=1");
  const byId = new Map(places.map(place => [Number(place.id), place]));
  const ancestors = new Set();
  let cursor = byId.get(Number(placeId));
  while (cursor) { ancestors.add(Number(cursor.id)); cursor = cursor.parent_id ? byId.get(Number(cursor.parent_id)) : null; }
  const matching = sites.filter(site => siteTerritory(site) && ancestors.has(siteTerritory(site)));
  if (current && (!siteTerritory(current) || ancestors.has(siteTerritory(current)))) return current;
  return matching[0] || null;
}

export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const email = clean(body.email, 190).toLowerCase();
  const name = clean(body.name, 190);
  const placeId = Number(body.placeId || 0);
  const taxonomyId = Number(body.taxonomyId || 0);
  const planId = Number(body.planId || 0);
  const paymentMethod = body.paymentMethod === "mercadopago" ? "mercadopago" : "manual";
  const durationMonths = Math.min(12, Math.max(1, Number(body.durationMonths || 1)));
  const logoUrl = clean(body.logoUrl, 2000);
  const logoStoragePath = clean(body.logoStoragePath, 1000).replace(/^\/+/, "");
  const normalizedPhone = normalizePhone(body.phone);
  const normalizedWhatsapp = normalizeArgentinaWhatsapp(body.whatsapp);
  const latitude = body.latitude === "" || body.latitude == null ? null : Number(body.latitude);
  const longitude = body.longitude === "" || body.longitude == null ? null : Number(body.longitude);
  const mode = body.mode === "deferred" ? "deferred" : "free";
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !placeId || !taxonomyId || !planId) return Response.json({ error: "Completá nombre, email, localidad, rubro y modalidad" }, { status: 400 });

  if (!logoUrl) return Response.json({ error: "El logo es obligatorio" }, { status: 400 });
  if (name.length < 2) return Response.json({ error: "El nombre del negocio no es válido" }, { status: 400 });
  if (body.phone && (!normalizedPhone || normalizedPhone.replace(/\D/g, "").length < 8)) return Response.json({ error: "El teléfono no tiene un formato válido" }, { status: 400 });
  if (body.whatsapp && (!normalizedWhatsapp || normalizedWhatsapp.length < 11 || normalizedWhatsapp.length > 15)) return Response.json({ error: "El WhatsApp no tiene un formato válido" }, { status: 400 });
  if ((latitude === null) !== (longitude === null) || (latitude !== null && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180))) return Response.json({ error: "Las coordenadas deben ser válidas y cargarse juntas" }, { status: 400 });
  const expectedLogoUrl = `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET}/${logoStoragePath}`;
  if (!logoStoragePath.startsWith("directory/public-signups/") || logoUrl !== expectedLogoUrl) return Response.json({ error: "El logo no es válido" }, { status: 400 });
  const host = getRequestHost(req);
  const site = await resolveSite({ host, placeId });
  if (!site) return Response.json({ error: "Directorio no disponible" }, { status: 409 });

  const [existing] = await db.query("SELECT id FROM tags_businesses WHERE LOWER(email)=? LIMIT 1", [email]);
  if (existing.length) return Response.json({ error: "Este email ya está registrado. Ingresá desde el acceso de clientes." }, { status: 409 });
  const [[place]] = await db.query("SELECT id,place_type,name FROM tags_geo_places WHERE id=? AND place_type='locality' AND is_active=1", [placeId]);
  const [[leaf]] = await db.query("SELECT id,name FROM tags_directory_taxonomy_nodes n WHERE n.id=? AND n.is_active=1 AND NOT EXISTS (SELECT 1 FROM tags_directory_taxonomy_nodes c WHERE c.parent_id=n.id)", [taxonomyId]);
  const [[plan]] = await db.query("SELECT * FROM tags_plans WHERE id=? AND is_active=1 AND is_public=1", [planId]);
  if (!place || !leaf || !plan) return Response.json({ error: "La localidad, el rubro o el plan no son válidos" }, { status: 400 });
  if (mode === "free" && Number(plan.is_free) !== 1) return Response.json({ error: "Seleccioná un plan gratuito" }, { status: 400 });
  if (mode === "deferred" && Number(plan.is_free) === 1) return Response.json({ error: "Seleccioná un plan pago" }, { status: 400 });

  let selectedAmount = Number(plan.price || 0);
  if (mode === "deferred") {
    const [priceRows] = await db.query("SELECT * FROM tags_directory_plan_prices WHERE site_id=? AND plan_id=? AND is_active=1 LIMIT 1", [site.id, planId]);
    const price = priceRows[0];
    if (!price) return Response.json({ error: "El plan no tiene precios configurados para este Directorio." }, { status: 400 });
    if (paymentMethod === "mercadopago") selectedAmount = Number(price.mercadopago_monthly || 0);
    else if (durationMonths === 12) selectedAmount = Number(price.manual_pack_12 || 0);
    else {
      const calculated = directoryCalendarAmount(price, currentDirectoryMonth(), durationMonths);
      selectedAmount = calculated.hasMissingPrice ? 0 : calculated.amount;
    }
    if (selectedAmount <= 0) return Response.json({ error: "La opción de pago seleccionada no está disponible para este plan." }, { status: 400 });
  }
  const now = new Date();
  const expires = mode === "deferred" ? new Date(now.getTime() + 72 * 60 * 60 * 1000) : null;
  const conn = await db.getConnection();
  let businessId;
  let subscriptionId;
  let accessToken = null;
  let reviewsActivated = false;
  let signupStage = "inicio";
  try {
    await conn.beginTransaction();
    signupStage = "cliente";
    const [businessResult] = await conn.query("INSERT INTO tags_businesses (name,display_name,email,phone,whatsapp,logo_url,description,address,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())", [name, name, email, normalizedPhone, normalizedWhatsapp, logoUrl, clean(body.description, 1000) || null, clean(body.address, 500) || null]);
    businessId = businessResult.insertId;
    signupStage = "ubicacion";
    await conn.query("INSERT INTO tags_business_places (business_id,place_id,relation_type,is_primary) VALUES (?,?,'location',1)", [businessId, placeId]);
    const status = mode === "deferred" ? "trial" : "active";
    signupStage = "suscripcion";
    const [subscriptionResult] = await conn.query("INSERT INTO tags_subscriptions (business_id,plan_id,status,payment_provider,amount,currency,started_at,expires_at,duration_months,source,next_billing_at,auto_renew,auto_disable_on_expire,grace_days,admin_override_until,admin_override_notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?,?,'manual',?,?,?,?,?,?,NOW(),NOW())", [businessId, planId, status, mode === "deferred" ? paymentMethod : "free", selectedAmount, plan.currency || "ARS", now, expires, mode === "deferred" ? durationMonths : 1, expires, 0, 1, 0, null, null]);
    subscriptionId = subscriptionResult.insertId;
    if (mode === "deferred" && paymentMethod !== "mercadopago") await conn.query(`INSERT INTO tags_subscription_payments (subscription_id,business_id,plan_id,amount,currency,provider,status,paid_at,period_start,period_end,notes,created_at) VALUES (?,?,?,?,?,?,'pending',NULL,NULL,NULL,'Pendiente de acreditación · alta pública',NOW())`, [subscriptionResult.insertId, businessId, planId, selectedAmount, plan.currency || "ARS", paymentMethod]);
    await conn.query("UPDATE tags_businesses SET plan_id=?,subscription_status=?,plan_started_at=?,plan_expires_at=? WHERE id=?", [planId, status, now, expires, businessId]);
    await conn.query("INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,started_at,expires_at,amount,currency,notes,created_at,updated_at) VALUES (?,?,1,'active',?,?,?,?,?,NOW(),NOW())", [businessId, "directory", now, expires, selectedAmount, plan.currency || "ARS", `Alta pública en ${site.name}`]);
    if (mode === "deferred" && plan.code === "directory_web_plus") {
      await conn.query("INSERT INTO tags_business_addons (business_id,addon_code,quantity,status,started_at,expires_at,amount,currency,notes,created_at,updated_at) VALUES (?,?,1,'active',?,?,?,?,?,NOW(),NOW())", [businessId, "client_reviews", now, expires, 0, plan.currency || "ARS", `Incluido en ${plan.name}`]);
    }
    const [listingResult] = await conn.query("INSERT INTO tags_directory_listings (business_id,display_name,short_description,description,email,phone,whatsapp,address,latitude,longitude,status) VALUES (?,?,?,?,?,?,?,?,?,?, 'published')", [businessId, name, clean(body.description, 500) || null, clean(body.description, 1000) || null, email, normalizedPhone, normalizedWhatsapp, clean(body.address, 500) || null, latitude, longitude]);
    const listingId = listingResult.insertId;
    await conn.query("INSERT INTO tags_directory_media (listing_id,media_type,url,alt_text,sort_order,source_payload) VALUES (?, 'logo', ?, ?, 0, ?)", [listingId, logoUrl, name, JSON.stringify({ source: "public_signup", storagePath: logoStoragePath })]);
    const slug = createSlug(name) || `negocio-${businessId}`;
    await conn.query("INSERT INTO tags_directory_site_listings (site_id,listing_id,slug,publication_status,is_free,is_featured,sort_order,published_at) VALUES (?,?,?,'published',?,0,0,NOW())", [site.id, listingId, slug, Number(plan.is_free) === 1 ? 1 : 0]);
    await conn.query("INSERT INTO tags_directory_listing_taxonomy (listing_id,taxonomy_node_id,is_primary,sort_order) VALUES (?,?,1,0)", [listingId, taxonomyId]);
    if (mode === "deferred") {
      signupStage = "web";
      const webOrigin = getRequestBaseUrl(req);
      const webActivation = await activateDirectoryWebForBusiness({ conn, businessId, siteId: site.id, origin: webOrigin });
      if (!webActivation?.pageId || !webActivation?.qrId) {
        throw new Error("La suscripción paga no pudo crear y vincular su QR-Page");
      }
      if (plan.code === "directory_web_plus") {
        signupStage = "reviews";
        await activateClientReviewsForBusiness({ conn, businessId, title: `¿Cómo fue tu experiencia en ${name}?`, slug: `${slug}-opiniones`, baseUrl: webOrigin, allowTrial: true });
        reviewsActivated = true;
      }
    }
    await conn.commit();
    signupStage = "acceso";
    accessToken = mode === "deferred" ? crypto.randomUUID() : null;
    if (accessToken) await db.query("INSERT INTO tags_auth_tokens (email,token,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 15 MINUTE))", [email, accessToken]);
  } catch (error) {
    await conn.rollback();
    console.error("PUBLIC DIRECTORY SIGNUP ERROR", { stage: signupStage, code: error.code, message: error.message, sqlState: error.sqlState });
    const publicError = error.code === "ER_DUP_ENTRY"
      ? "No se pudo completar porque ya existe un registro con esos datos. Probá con otro email o nombre de negocio."
      : error.code === "ER_NO_REFERENCED_ROW_2"
        ? "No se pudo asociar la localidad o el rubro seleccionado. Volvé a elegirlos."
      : error.code === "ER_BAD_FIELD_ERROR"
          ? "La base de datos todavía no tiene actualizada la estructura necesaria para esta inscripción."
          : signupStage === "suscripcion"
            ? "No se pudo registrar la suscripción. Verificá el plan y la modalidad de pago seleccionados, y que el plan tenga precios configurados para este Directorio."
            : `No pudimos completar la inscripción en la etapa: ${signupStage}. Revisá los datos e intentá nuevamente.`;
    return Response.json({
      error: publicError,
      fieldErrors: signupStage === "suscripcion" ? { payment: "No se pudo registrar la modalidad de pago seleccionada." } : {}
    }, { status: 500 });
  } finally { conn.release(); }

  const mpSubscription = mode === "deferred" && paymentMethod === "mercadopago"
    ? await ensureDirectoryMercadoPagoSubscription({ subscriptionId, baseUrl: directoryMercadoPagoBaseUrl(req) })
    : null;

  const brand = directoryEmailBranding(site);
  const title = mpSubscription ? "Autorizá tu suscripción en Mercado Pago" : mode === "deferred" ? "Inscripción recibida: falta concretar el pago" : "Tu negocio ya está publicado";
  const base = getRequestBaseUrl(req);
  const accessPath = accessToken ? `/api/auth/verify?token=${encodeURIComponent(accessToken)}` : null;
  const link = accessPath ? `${base}${accessPath}` : null;
  const contact = process.env.NEXT_PUBLIC_PLATFORM_WHATSAPP || "";
  const currency = String(plan.currency || "ARS").toUpperCase();
  const formattedAmount = new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(selectedAmount);
  const periodLabel = paymentMethod === "mercadopago" ? "Mensual automática" : durationMonths === 1 ? "1 mes" : `${durationMonths} meses`;
  const subscriptionSummary = mode === "deferred" ? `<div style="margin:16px 0;padding:14px;background:#f7faf8;border:1px solid #dce9e1;border-radius:9px"><strong>Detalle de la suscripción</strong><p style="margin:8px 0 0"><strong>Plan:</strong> ${plan.name}<br><strong>Período:</strong> ${periodLabel}<br><strong>Importe:</strong> ${formattedAmount}</p></div>` : "";
  const paymentDetails = [
    process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER && `Titular: ${process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER}`,
    process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS && `Alias: ${process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS}`,
    process.env.DIRECTORY_MANUAL_PAYMENT_CBU && `CBU/CVU: ${process.env.DIRECTORY_MANUAL_PAYMENT_CBU}`,
    process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT && `Cuenta: ${process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT}`
  ].filter(Boolean).join(" · ");
  const contactBlock = directoryEmailContact(brand, { manualPayment: mode === "deferred" && !mpSubscription });
  const sent = await sendMail({ to: email, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: `${title} · ${brand.name}`, text: `${title}.${mode === "deferred" ? ` Plan: ${plan.name}. Período: ${periodLabel}. Importe: ${formattedAmount}.` : ""}${mpSubscription?.init_point ? ` Autorizar: ${mpSubscription.init_point}` : link ? ` Acceso directo: ${link}` : ""} ${contactBlock.text}`, html: `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226;border:1px solid #dce9e1;border-radius:16px;overflow:hidden">${directoryEmailHeader(brand, "Tu presencia comercial empieza acá")}<main style="padding:24px"><p>Hola <strong>${name}</strong>,</p><p>${mpSubscription ? "Creaste una suscripción automática mensual. Para finalizar, autorizá los débitos en Mercado Pago." : mode === "deferred" ? "Tu ficha y tu Web ya están activas durante 72 horas desde el alta. Dentro de ese plazo tenés que contactarnos y concretar el pago correspondiente; si no se acredita, la ficha será dada de baja." : "Tu inscripción gratuita fue confirmada y tu ficha ya se encuentra publicada."}</p>${subscriptionSummary}${mode === "deferred" && !mpSubscription && paymentDetails ? `<div style="padding:14px;background:#f1f8f3;border-radius:9px"><strong>Datos para el pago manual</strong><p>${paymentDetails}</p><p style="margin-bottom:0"><strong>Importe a abonar: ${formattedAmount}</strong></p></div>` : ""}${mpSubscription?.init_point ? `<p style="text-align:center"><a href="${mpSubscription.init_point}" style="display:inline-block;padding:13px 20px;background:${brand.color};color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Autorizar en Mercado Pago</a></p>` : link ? `<p style="text-align:center"><a href="${link}" style="display:inline-block;padding:13px 20px;background:${brand.color};color:#fff;text-decoration:none;border-radius:9px;font-weight:bold">Ingresar directamente a mi panel</a></p>` : `<p>La modalidad gratuita no incluye acceso al Panel de Control. Si querés administrar tu ficha, podés contratar un plan pago.</p>`}${contact ? `<p>Contacto: ${contact}</p>` : ""}${contactBlock.html}</main></div>` });
  const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL");
  const adminRecipients = [...new Set([brand.notificationEmail, brand.replyTo, ...admins.map(item => item.email)].map(value => String(value || "").trim().toLowerCase()).filter(Boolean))];
  const adminSubject = `${mode === "deferred" ? "Nueva inscripción paga pendiente" : "Nueva alta gratuita"} · ${brand.name}`;
  const adminNotice = adminRecipients.length ? await sendMail({ to: adminRecipients, fromName: brand.name, fromEmail: brand.fromEmail, replyTo: brand.replyTo, subject: adminSubject, text: `${adminSubject}. Negocio: ${name}. Email: ${email}. Localidad: ${place.name}. Rubro: ${leaf.name}. Plan: ${plan.name}. Importe: ${formattedAmount}.`, html: `<div style="max-width:620px;margin:auto;font-family:Arial;color:#183226">${directoryEmailHeader(brand, adminSubject)}<main style="padding:24px"><p>Se registró un nuevo negocio desde la inscripción pública.</p><p><strong>Negocio:</strong> ${name}<br><strong>Email:</strong> ${email}<br><strong>Localidad:</strong> ${place.name}<br><strong>Rubro:</strong> ${leaf.name}<br><strong>Plan:</strong> ${plan.name}<br><strong>Período:</strong> ${periodLabel}<br><strong>Importe:</strong> ${formattedAmount}<br><strong>Modalidad:</strong> ${mode === "deferred" ? "Paga · pendiente de contacto y pago" : "Gratuita"}</p>${expires ? `<p><strong>Vencimiento:</strong> ${expires.toLocaleString("es-AR")}</p>` : ""}</main></div>` }) : { ok: false };
  return Response.json({ ok: true, businessId, emailSent: sent.ok, platformNotified: adminNotice.ok, pendingPayment: mode === "deferred", expiresAt: expires, accessLink: link, accessPath, checkoutUrl: mpSubscription?.init_point || null, webActivated: mode === "deferred", reviewsActivated });
}
