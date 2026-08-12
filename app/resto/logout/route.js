import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
    const response = NextResponse.redirect(new URL("/resto/login", req.url));
    response.cookies.set("tags_session", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
    response.cookies.set("tags_session_sig", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
    return response;
}
