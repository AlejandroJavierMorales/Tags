// /login/page.jsx
// SERVER COMPONENT

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/app/lib/tags-db";
import { canBusinessAccessChannel, getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";

import LoginForm from "./pageClient";

export const metadata = {

    robots: {

        index: false,
        follow: false,
    },
};

export default async function LoginPage({ searchParams }) {

  const requestHeaders = await headers();
  const rawHost = String(requestHeaders.get("x-tags-public-host") || requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "").split(",")[0].trim();
  const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));

  const requestedEmail = String(searchParams?.email || "").trim().toLowerCase();
  const returnTo = String(searchParams?.returnTo || "");
  const session = cookies().get("tags_session");

  // =========================
  // NO SESSION
  // =========================

  if (!session || requestedEmail) {
    return <LoginForm channel={channel} initialEmail={requestedEmail} returnTo={returnTo} />;
  }

  let parsed = null;

  // =========================
  // PARSE SESSION
  // =========================

  try {

    parsed = JSON.parse(session.value);

  } catch (err) {

    console.error(
      "INVALID SESSION COOKIE:",
      err
    );

    return <LoginForm channel={channel} returnTo={returnTo} />;
  }

  const sessionMatchesChannel = parsed?.role === "admin"
    ? channel.isTags
    : parsed?.role === "user"
      ? (!channel.siteId || parsed.channelSiteId === channel.siteId)
      : await canBusinessAccessChannel({ businessId: parsed?.businessId, channel });

  if (!sessionMatchesChannel) {
    return <LoginForm channel={channel} initialEmail={requestedEmail} />;
  }

  const forwardedProtocol = String(requestHeaders.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : (process.env.NODE_ENV === "development" ? "http" : "https");
  const host = String(rawHost || (process.env.NODE_ENV === "development" ? "localhost:3000" : "")).split(",")[0].trim();
  const baseUrl = `${protocol}://${host}`;


  // =========================
  // ADMIN
  // =========================


  if (parsed?.role === "admin") {

    redirect(`${baseUrl}/dashboard`);


  }

  // =========================
  // OWNER DE EVENTOS
  // =========================
  if (parsed?.role === "event_client") {

    redirect(`${baseUrl}/dashboard/events`);


  }

  // =========================
  // BUSINESS
  // =========================

  if (parsed?.businessId) {
    const requestedBusinessPath = returnTo.startsWith(`/dashboard/businesses/${parsed.businessId}/`)
      ? returnTo
      : "";
    if (requestedBusinessPath) redirect(`${baseUrl}${requestedBusinessPath}`);

    let panelEntryKey = parsed.panelEntryKey || "panel";
    try {
      const [entryRows] = await db.query(
        "SELECT panel_entry_key FROM tags_businesses WHERE id=? LIMIT 1",
        [parsed.businessId]
      );
      panelEntryKey = entryRows[0]?.panel_entry_key || "panel";
    } catch (error) {
      console.error("PANEL ENTRY LOGIN LOOKUP ERROR", error.message);
    }

    const entryRoutes = {
      guest_experience: `/dashboard/businesses/${parsed.businessId}/guest-experience`,
      store: `/dashboard/businesses/${parsed.businessId}/store`,
      resto: `/dashboard/businesses/${parsed.businessId}/resto`,
      turnos: `/dashboard/businesses/${parsed.businessId}/turnos`,
      client_reviews: `/dashboard/businesses/${parsed.businessId}/resto/reviews`,
      qr_agency: `/dashboard/businesses/${parsed.businessId}/qr-agency`,
      ai_chatbot: `/dashboard/businesses/${parsed.businessId}/ai-chat`,
      loyalty: `/dashboard/businesses/${parsed.businessId}/loyalty`,
      directory: `/dashboard/businesses/${parsed.businessId}/directory`,
      portal_public: `/dashboard/businesses/${parsed.businessId}/portal`,
    };
    redirect(`${baseUrl}${entryRoutes[panelEntryKey] || `/dashboard/businesses/${parsed.businessId}`}`);
  }

  if (parsed?.role === "user") {
    if (returnTo.startsWith("/") && !returnTo.startsWith("//")) redirect(`${baseUrl}${returnTo}`);
    redirect(`${baseUrl}/mi-cuenta`);
  }

  // =========================
  // FALLBACK
  // =========================

  return <LoginForm channel={channel} returnTo={returnTo} />;
}
