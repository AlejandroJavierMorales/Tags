// /login/page.jsx
// SERVER COMPONENT

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
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
  const session = cookies().get("tags_session");

  // =========================
  // NO SESSION
  // =========================

  if (!session || requestedEmail) {
    return <LoginForm channel={channel} initialEmail={requestedEmail} />;
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

    return <LoginForm channel={channel} />;
  }

  const sessionMatchesChannel = parsed?.role === "admin"
    ? channel.isTags
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
   
    redirect(`${baseUrl}/dashboard/businesses/${parsed.businessId}`)
  }

  // =========================
  // FALLBACK
  // =========================

  return <LoginForm channel={channel} />;
}
