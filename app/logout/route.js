import { NextResponse } from "next/server";
import { getRequestBaseUrl } from "@/app/lib/channelContext";

export const dynamic = "force-dynamic";

export async function GET(req) {

    try {

        const baseUrl =
            getRequestBaseUrl(req);

        const response =
            NextResponse.redirect(
                new URL("/login", baseUrl)
            );

        response.cookies.set({
            name: "tags_session",
            value: "",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0)
        });

        response.cookies.set({
            name: "tags_session_sig",
            value: "",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
            maxAge: 0
        });

        return response;

    } catch (err) {

        console.error("LOGOUT ERROR:", err);

        return NextResponse.redirect(
            new URL(
                "/login",
                getRequestBaseUrl(req) || new URL(req.url).origin
            )
        );
    }
}
