export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireSubscriptionAdmin, subscriptionAdminError } from "@/app/modules/subscriptions/lib/requireSubscriptionAdmin";
import { db } from "@/app/lib/tags-db";
import { directoryEmailBranding } from "@/app/modules/directory/lib/directoryEmailBranding";
import { existingSubscriptionError, findCurrentBusinessSubscription } from "@/app/modules/subscriptions/lib/findCurrentBusinessSubscription";

const providerLabel = value => value === "mercadopago" ? "Mercado Pago automático" : value === "transfer" ? "Transferencia" : "Pago manual";
const statusLabel = value => ({ active: "Activa", paid: "Activa (pago recibido)", pending: "Pendiente de pago", trial: "Prueba / gracia", past_due: "Con deuda", inactive: "Suspendida", cancelled: "Cancelada" }[value] || value || "Sin estado");

export async function POST(req) {
  const access = await requireSubscriptionAdmin();
  if (!access.ok) return subscriptionAdminError(access);
  try {
    const body = await req.json().catch(() => null);
    const request = body?.request || {};
    const mode = body?.mode === "update" ? "update" : "create";
    const subscriptionId = Number(request.id || body?.subscriptionId || 0);
    const businessId = Number(request.businessId || request.business_id || 0);
    let query = `SELECT b.id business_id,b.name business_name,b.email business_email,
      p.id plan_id,p.name plan_name,p.code plan_code,
      ds.id site_id,ds.name site_name,ds.primary_host,ds.brand_config
      FROM tags_businesses b
      LEFT JOIN tags_plans p ON p.id=?
      LEFT JOIN tags_directory_sites ds ON ds.id=?
      WHERE b.id=? ORDER BY ds.id LIMIT 1`;
    let params = [Number(request.planId || request.plan_id || 0), Number(request.siteId || request.site_id || 0) || null, businessId];
    if (mode === "update" && subscriptionId) {
      query = `SELECT b.id business_id,b.name business_name,b.email business_email,
        p.id plan_id,p.name plan_name,p.code plan_code,
        s.amount stored_amount,s.status stored_status,s.payment_provider stored_provider,
        s.duration_months stored_duration,s.expires_at stored_expires_at,
        ds.id site_id,ds.name site_name,ds.primary_host,ds.brand_config
        FROM tags_subscriptions s
        INNER JOIN tags_businesses b ON b.id=s.business_id
        LEFT JOIN tags_plans p ON p.id=?
        LEFT JOIN tags_directory_listings l ON l.business_id=b.id
        LEFT JOIN tags_directory_site_listings sl ON sl.listing_id=l.id
        LEFT JOIN tags_directory_sites ds ON ds.id=sl.site_id
        WHERE s.id=? ORDER BY ds.id LIMIT 1`;
      params = [Number(request.planId || request.plan_id || 0), subscriptionId];
    }
    const [[row]] = await db.query(query, params);
    if (!row?.business_id) return Response.json({ ok: false, error: "No se encontró el cliente de la suscripción" }, { status: 404 });
    if (!row.plan_id || !row.plan_name) return Response.json({ ok: false, error: "El plan seleccionado no existe" }, { status: 400 });
    if (mode === "create") {
      const currentSubscription = await findCurrentBusinessSubscription(db, row.business_id);
      if (currentSubscription) throw existingSubscriptionError(currentSubscription);
    }
    const provider = String(request.paymentProvider || request.payment_provider || row.stored_provider || "manual");
    const amount = Number(request.customAmount ?? request.amount ?? row.stored_amount ?? 0);
    const durationMonths = Number(request.durationMonths || request.duration_months || row.stored_duration || 1);
    const status = String(request.paymentState || request.status || row.stored_status || "pending");
    const expiresAt = request.expiresAt || request.expires_at || row.stored_expires_at || null;
    const requestedAddons = Object.entries(request.addons || {}).filter(([, quantity]) => Number(quantity) > 0).map(([code, quantity]) => ({ code: String(code), quantity: Math.min(999, Math.max(1, Number(quantity))) }));
    const [addonRows] = requestedAddons.length ? await db.query(`SELECT code,name FROM tags_addons WHERE is_active=1 AND code IN (${requestedAddons.map(() => "?").join(",")})`, requestedAddons.map(item => item.code)) : [[]];
    const addonNames = new Map(addonRows.map(item => [item.code, item.name]));
    if (addonRows.length !== requestedAddons.length) return Response.json({ ok: false, error: "Una de las funcionalidades seleccionadas ya no está disponible" }, { status: 409 });
    const selectedAddons = requestedAddons.map(item => ({ ...item, name: addonNames.get(item.code) || item.code }));
    const brand = directoryEmailBranding(row.site_name ? { name: row.site_name, primary_host: row.primary_host, brand_config: row.brand_config } : { name: "Tags", primary_host: "tags.com.ar", brand_config: null });
    const [admins] = await db.query("SELECT email FROM tags_businesses WHERE role='admin' AND email IS NOT NULL AND TRIM(email)<>''");
    const notificationRecipients = [...new Set([row.business_email, brand.notificationEmail, ...admins.map(item => item.email)].filter(Boolean))];
    return Response.json({ ok: true, preview: {
      mode, businessName: row.business_name, businessEmail: row.business_email,
      planName: row.plan_name, planCode: row.plan_code, planId: row.plan_id,
      provider, providerLabel: providerLabel(provider), amount, currency: "ARS",
      durationMonths, status, statusLabel: statusLabel(status), expiresAt,
      addons: selectedAddons,
      siteName: row.site_name || null,
      directoryAssignmentRequired: request.directoryAssignmentRequired === true,
      manualPayment: provider === "mercadopago" ? null : {
        holder: process.env.DIRECTORY_MANUAL_PAYMENT_HOLDER || "",
        alias: process.env.DIRECTORY_MANUAL_PAYMENT_ALIAS || "",
        cbu: process.env.DIRECTORY_MANUAL_PAYMENT_CBU || "",
        account: process.env.DIRECTORY_MANUAL_PAYMENT_ACCOUNT || ""
      },
      mercadoPagoNote: provider === "mercadopago" ? "Después de aceptar se generará el enlace de autorización de Mercado Pago." : null,
      notificationRecipients,
      brand: { name: brand.name, logoUrl: brand.logo, primaryColor: brand.color }
    } });
  } catch (error) {
    console.error("SUBSCRIPTION PREVIEW ERROR", error);
    return Response.json({ ok: false, error: error?.message || "No se pudo preparar la vista previa", code: error?.code, subscription: error?.subscription || null }, { status: error?.status || 500 });
  }
}
