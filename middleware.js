import { NextResponse } from "next/server";

async function sessionSignature(value) {
    const secret =
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.JWT_SECRET ||
        "";

    if (!secret) return "";

    const encoder =
        new TextEncoder();

    const key =
        await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            {
                name: "HMAC",
                hash: "SHA-256"
            },
            false,
            ["sign"]
        );

    const signature =
        await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(value)
        );

    return Array.from(
        new Uint8Array(signature)
    )
        .map(byte =>
            byte
                .toString(16)
                .padStart(2, "0")
        )
        .join("");
}

async function readTagsSession(request) {
    const raw =
        request.cookies.get("tags_session")?.value;

    if (!raw) return null;

    const receivedSignature =
        request.cookies.get(
            "tags_session_sig"
        )?.value || "";

    const expectedSignature =
        await sessionSignature(raw);

    if (
        !receivedSignature ||
        receivedSignature !==
            expectedSignature
    ) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function sessionBusinessId(session) {
    return String(
        session?.businessId ||
        session?.business_id ||
        ""
    );
}

async function requestBusinessId(request) {
    const queryBusinessId =
        request.nextUrl.searchParams.get("businessId");

    if (queryBusinessId) {
        return String(queryBusinessId);
    }

    if (
        request.method === "GET" ||
        request.method === "HEAD"
    ) {
        return "";
    }

    try {
        const body =
            await request.clone().json();

        return String(
            body?.businessId ||
            body?.business_id ||
            ""
        );
    } catch {
        return "";
    }
}

export async function middleware(request) {
    const session =
        await readTagsSession(request);

    if (!session) {
        return NextResponse.json(
            { error: "No autenticado" },
            { status: 401 }
        );
    }

    if (session.role === "admin") {
        return NextResponse.next();
    }

    const requestedBusinessId =
        await requestBusinessId(request);

    if (
        requestedBusinessId &&
        requestedBusinessId !==
            sessionBusinessId(session)
    ) {
        return NextResponse.json(
            { error: "Sin permisos" },
            { status: 403 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/api/store/admin/((?!payments/create-preference|payments/mercadopago/webhook).*)"
    ]
};
