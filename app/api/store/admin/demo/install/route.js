// =====================================
// Archivo:
// /app/api/store/admin/demo/install/route.js
//
// Descripción:
// Instala contenido demo en una tienda.
//
// SOLO DESARROLLO.
//
// Contexto:
// store
// =====================================

export const runtime = "nodejs";

import { db }
    from "@/app/lib/tags-db";

import {
    installStoreDemoContent
}
from "@/app/modules/store/lib/installStoreDemoContent";

export async function POST(req) {

    const body =
        await req.json();

    const {
        storeId
    } = body;

    const conn =
        await db.getConnection();

    try {

        await conn.beginTransaction();

        await installStoreDemoContent(
            storeId,
            conn
        );

        await conn.commit();

        return Response.json({
            success: true
        });

    } catch (error) {

        await conn.rollback();

        return Response.json(
            {
                error:
                    error.message
            },
            {
                status: 500
            }
        );

    } finally {

        conn.release();

    }

}