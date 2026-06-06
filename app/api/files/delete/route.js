// api/files/delete/route.js

import { deleteFile } from "@/app/modules/files/lib/deleteFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function DELETE(req) {

    try {

        const body =
            await req.json();

        const {
            storage_path
        } = body;

        if (!storage_path) {

            return Response.json(
                {
                    error:
                        "storage_path requerido"
                },
                {
                    status: 400
                }
            );
        }

        await deleteFile(
            storage_path
        );

        return Response.json({
            ok: true
        });

    } catch (err) {

        console.log(err);

        return Response.json(
            {
                error:
                    err.message
            },
            {
                status: 500
            }
        );
    }
}