export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import { safeParseJSON }
    from "@/app/modules/qr-page/lib/safeParseJSON";

function clean(value) {
    return String(value || "")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .trim();
}

function escapeVCard(value) {
    return clean(value)
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,");
}

function fileName(value) {
    return clean(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "contacto";
}

function normalizePhone(value) {
    const raw =
        clean(value);

    if (!raw) {
        return "";
    }

    const digits =
        raw.replace(/\D/g, "");

    if (!digits) {
        return "";
    }

    if (digits.startsWith("54")) {
        return `+${digits}`;
    }

    return `+54${digits}`;
}

function getDevice(req) {

    const userAgent =
        req.headers.get("user-agent") || "";

    const isIOS =
        /iPhone|iPad|iPod/i.test(userAgent);

    const isAndroid =
        /Android/i.test(userAgent);

    const isMobile =
        isIOS || isAndroid;

    return {
        userAgent,
        isIOS,
        isAndroid,
        isMobile
    };
}

export async function GET(req, { params }) {

    try {

        const slug =
            params.slug;

        const [pages] =
            await db.query(
                `
                SELECT
                    *
                FROM
                    tags_qr_pages
                WHERE
                    slug = ?
                LIMIT 1
                `,
                [
                    slug
                ]
            );

        const page =
            pages[0];

        if (!page) {
            return new Response(
                "Contacto no encontrado",
                {
                    status: 404
                }
            );
        }

        const [sections] =
            await db.query(
                `
                SELECT
                    id
                FROM
                    tags_qr_page_sections
                WHERE
                    page_id = ?
                `,
                [
                    page.id
                ]
            );

        const sectionIds =
            sections.map((section) => section.id);

        let vcardContent = {};
        let profileContent = {};

        if (sectionIds.length) {

            const [blocks] =
                await db.query(
                    `
                    SELECT
                        type,
                        content_json
                    FROM
                        tags_qr_page_blocks
                    WHERE
                        section_id IN (${sectionIds.map(() => "?").join(",")})
                        AND is_visible = 1
                    `,
                    sectionIds
                );

            const vcardBlock =
                blocks.find((block) =>
                    block.type === "vcard"
                );

            const profileBlock =
                blocks.find((block) =>
                    block.type === "profile_card"
                );

            vcardContent =
                safeParseJSON(
                    vcardBlock?.content_json
                ) || {};

            profileContent =
                safeParseJSON(
                    profileBlock?.content_json
                ) || {};
        }

        const fullName =
            clean(
                profileContent.name ||
                page.title ||
                "Contacto"
            );

        const company =
            clean(
                profileContent.company ||
                ""
            );

        const jobTitle =
            clean(
                profileContent.jobTitle ||
                ""
            );

        const phone =
            normalizePhone(
                page.phone ||
                page.whatsapp ||
                ""
            );

        const email =
            clean(
                page.email ||
                ""
            );

        const website =
            clean(
                page.website_url ||
                ""
            );

        const address =
            clean(
                page.address ||
                ""
            );

        const note =
            clean(
                profileContent.bio ||
                page.description ||
                ""
            );

        const vcard =
            [
                "BEGIN:VCARD",
                "VERSION:3.0",
                `FN:${escapeVCard(fullName)}`,
                company
                    ? `ORG:${escapeVCard(company)}`
                    : "",
                jobTitle
                    ? `TITLE:${escapeVCard(jobTitle)}`
                    : "",
                phone
                    ? `TEL;TYPE=CELL,VOICE:${phone}`
                    : "",
                email
                    ? `EMAIL;TYPE=INTERNET:${escapeVCard(email)}`
                    : "",
                website
                    ? `URL:${escapeVCard(website)}`
                    : "",
                address
                    ? `ADR;TYPE=WORK:;;${escapeVCard(address)};;;;`
                    : "",
                note
                    ? `NOTE:${escapeVCard(note)}`
                    : "",
                "END:VCARD"
            ]
                .filter(Boolean)
                .join("\r\n");

        const device =
            getDevice(req);

        /*
            CASOS:

            iPhone / iPad:
            - Usamos text/vcard.
            - Usamos inline para intentar que iOS abra la vista de contacto
              en vez de tratarlo solamente como descarga.

            Android:
            - Usamos text/x-vcard porque muchos Android/Chrome/contact apps
              lo interpretan mejor que text/vcard.
            - Usamos inline para intentar abrir/importar contacto.

            Desktop:
            - Usamos attachment porque en escritorio lo más esperable es
              descargar el .vcf para abrirlo con Contactos, Outlook, etc.

            Importante:
            - Aun así, cada celular puede comportarse distinto según navegador,
              app de contactos y permisos. Por eso conviene mostrar en el botón
              un texto de ayuda/fallback.
        */

        const contentType =
            device.isAndroid
                ? "text/x-vcard; charset=utf-8"
                : "text/vcard; charset=utf-8";

        const disposition =
            device.isMobile
                ? "inline"
                : "attachment";

        return new Response(
            `${vcard}\r\n`,
            {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition":
                        `${disposition}; filename="${fileName(fullName)}.vcf"`,
                    "Cache-Control": "no-store"
                }
            }
        );

    } catch (err) {

        console.log(err);

        return new Response(
            err.message,
            {
                status: 500
            }
        );
    }
}