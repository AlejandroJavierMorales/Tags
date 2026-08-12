export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { getDirectoryWebPageData } from "@/app/modules/directory/lib/getDirectoryWebPageData";
import { DIRECTORY_MODULE_CODES, getDirectoryModuleSettings } from "@/app/modules/directory/lib/directoryModuleSettings";

function parse(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
}

async function pageFor(businessId, pageId) {
    const [rows] = await db.query("SELECT id,global_styles FROM tags_qr_pages WHERE id=? AND business_id=? AND page_type='directory' LIMIT 1", [pageId, businessId]);
    return rows[0] || null;
}

export async function GET(request) {
    const url = new URL(request.url);
    const businessId = Number(url.searchParams.get("businessId") || 0);
    const pageId = Number(url.searchParams.get("pageId") || 0);
    if (!businessId || !pageId) return Response.json({ error: "Datos incompletos" }, { status: 400 });
    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
    if (!(await pageFor(businessId, pageId))) return Response.json({ error: "Web Directory no encontrada" }, { status: 404 });
    const web = await getDirectoryWebPageData(pageId, { includeDraft: true });
    return Response.json({ ok: true, web });
}

export async function POST(request) {
    const body = await request.json().catch(() => null);
    const businessId = Number(body?.businessId || 0);
    const pageId = Number(body?.pageId || 0);
    if (!businessId || !pageId || !body) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
    const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
    const page = await pageFor(businessId, pageId);
    if (!page) return Response.json({ error: "Web Directory no encontrada" }, { status: 404 });
    const globalStyles = parse(page.global_styles);
    const current = getDirectoryModuleSettings(globalStyles);
    const requested = body.modules || {};
    const modules = DIRECTORY_MODULE_CODES.reduce((result, code, index) => {
        result[code] = {
            enabled: requested?.[code]?.enabled !== false,
            sortOrder: Number(requested?.[code]?.sortOrder || current?.[code]?.sortOrder || (1000 + index * 10)),
            content: {
                ...(current?.[code]?.content || {}),
                ...(requested?.[code]?.content || {})
            }
        };
        return result;
    }, {});
    const nextStyles = { ...globalStyles, directoryModules: modules };
    await db.query("UPDATE tags_qr_pages SET global_styles=?,updated_at=NOW() WHERE id=? AND business_id=? AND page_type='directory'", [JSON.stringify(nextStyles), pageId, businessId]);
    return Response.json({ ok: true, modules, globalStyles: nextStyles });
}
