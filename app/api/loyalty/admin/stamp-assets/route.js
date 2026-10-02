export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { db } from "@/app/lib/tags-db";
import { getLoyaltyAdminScope, loyaltyApiError } from "@/app/modules/loyalty/lib/loyaltyAdminScope";
import { requireActiveLoyaltyAddon } from "@/app/modules/loyalty/lib/loyaltyAccess";
import { requireDirectoryAdmin } from "@/app/modules/directory/lib/requireDirectoryAdmin";

export async function GET(request) {
    try {
        const params = new URL(request.url).searchParams;
        if (params.get("scope") === "platform") {
            const access = await requireDirectoryAdmin();
            if (!access.ok) return Response.json({ success: false, error: access.error }, { status: access.status });
            const [rows] = await db.query(
                `SELECT id,name,image_url,storage_path,mime_type,source,status,sort_order,business_id
                   FROM tags_loyalty_stamp_assets
                  WHERE status='active' AND business_id IS NULL
                  ORDER BY sort_order,id`
            );
            return Response.json({ success: true, assets: rows });
        }
        const { businessId } = await getLoyaltyAdminScope(params.get("business_id"));
        await requireActiveLoyaltyAddon(businessId);
        const [rows] = await db.query(
            `SELECT id,name,image_url,storage_path,mime_type,source,status,sort_order,business_id
               FROM tags_loyalty_stamp_assets
              WHERE status='active' AND (business_id IS NULL OR business_id=?)
              ORDER BY business_id IS NOT NULL,sort_order,id`,
            [businessId]
        );
        return Response.json({ success: true, assets: rows });
    } catch (error) {
        return loyaltyApiError(error);
    }
}

export async function POST(request) {
    try {
        const body = await request.json().catch(() => null);
        if (body?.scope === "platform") {
            const access = await requireDirectoryAdmin();
            if (!access.ok) return Response.json({ success: false, error: access.error }, { status: access.status });
            const name = String(body?.name || "Sello de galería").trim().slice(0, 190);
            const imageUrl = String(body?.image_url || "").trim();
            if (!imageUrl) throw new Error("La imagen del sello es obligatoria");
            const [result] = await db.query(
                `INSERT INTO tags_loyalty_stamp_assets
                    (business_id,name,image_url,storage_path,mime_type,source,created_by_user_id)
                 VALUES (NULL,?,?,?,?, 'platform',?)`,
                [name, imageUrl, body?.storage_path || null, body?.mime_type || null, access.session?.userId || null]
            );
            const [[asset]] = await db.query(`SELECT * FROM tags_loyalty_stamp_assets WHERE id=?`, [result.insertId]);
            return Response.json({ success: true, asset });
        }
        const { businessId, session } = await getLoyaltyAdminScope(body?.business_id);
        await requireActiveLoyaltyAddon(businessId);
        const name = String(body?.name || "Sello personalizado").trim().slice(0, 190);
        const imageUrl = String(body?.image_url || "").trim();
        if (!imageUrl) throw new Error("La imagen del sello es obligatoria");
        const [result] = await db.query(
            `INSERT INTO tags_loyalty_stamp_assets
                (business_id,name,image_url,storage_path,mime_type,source,created_by_user_id)
             VALUES (?,?,?,?,?,'business',?)`,
            [businessId, name, imageUrl, body?.storage_path || null, body?.mime_type || null, session?.userId || null]
        );
        const [[asset]] = await db.query(`SELECT * FROM tags_loyalty_stamp_assets WHERE id=?`, [result.insertId]);
        return Response.json({ success: true, asset });
    } catch (error) {
        return loyaltyApiError(error);
    }
}
