import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBaseUrl(req) {
    return process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_BASE_URL_PROD
        : new URL(req.url).origin;
}

export async function GET(req) {

    try {

        const baseUrl =
            getBaseUrl(req);

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

        return response;

    } catch (err) {

        console.error("LOGOUT ERROR:", err);

        return NextResponse.redirect(
            new URL(
                "/login",
                process.env.NEXT_PUBLIC_BASE_URL_PROD || req.url
            )
        );
    }
}