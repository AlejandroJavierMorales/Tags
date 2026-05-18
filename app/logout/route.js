import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


export async function GET(req) {

    try {

        const response = NextResponse.redirect(
            new URL("/login", req.url)
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
            new URL("/login", req.url)
        );
    }
}