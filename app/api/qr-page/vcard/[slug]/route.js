export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";

import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";

function clean(value) {
    return String(value || "")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .trim();
}

function fileName(value) {
    return clean(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "contacto";
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
            clean(
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
                `FN:${fullName}`,
                company ? `ORG:${company}` : "",
                jobTitle ? `TITLE:${jobTitle}` : "",
                phone ? `TEL;TYPE=CELL:${phone}` : "",
                email ? `EMAIL:${email}` : "",
                website ? `URL:${website}` : "",
                address ? `ADR;TYPE=WORK:;;${address};;;;` : "",
                note ? `NOTE:${note}` : "",
                "END:VCARD"
            ]
                .filter(Boolean)
                .join("\r\n");

        return new Response(
            vcard,
            {
                status: 200,
                headers: {
                    "Content-Type": "text/vcard; charset=utf-8",
                    "Content-Disposition":
                        `attachment; filename="${fileName(fullName)}.vcf"`
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