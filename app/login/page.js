// /login/page.jsx
// SERVER COMPONENT

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "./pageClient";

export const metadata = {

    robots: {

        index: false,
        follow: false,
    },
};

export default function LoginPage() {

  const session = cookies().get("tags_session");

  // =========================
  // NO SESSION
  // =========================

  if (!session) {
    return <LoginForm />;
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

    return <LoginForm />;
  }

  const isDev = process.env.NODE_ENV === "development";

  const baseUrl = isDev
    ? "http://localhost:3000"
    : process.env.NEXT_PUBLIC_APP_URL;


  // =========================
  // ADMIN
  // =========================


  if (parsed?.role === "admin") {

    redirect(`${baseUrl}/dashboard`);


  }

  // =========================
  // OWNER DE EVENTOS
  // =========================
console.log('*** ROLE *** ' + JSON.stringify(parsed,2,null) )

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

  return <LoginForm />;
}