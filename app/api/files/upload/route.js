// api/files/upload/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { uploadFile } from "@/app/modules/files/lib/uploadFile";
import crypto from "crypto";



export async function POST(req) {

    try {

        const formData =
            await req.formData();

        const file =
            formData.get("file");

        const folder =
            formData.get("folder");

        if (!file) {

            return Response.json(
                {
                    error:
                        "Archivo requerido"
                },
                {
                    status: 400
                }
            );
        }

        const bytes =
            await file.arrayBuffer();

        const buffer =
            Buffer.from(bytes);

        const ext =
            file.name
                .split(".")
                .pop();

        const filename =
            `${crypto.randomUUID()}.${ext}`;

        const storagePath =
            `tags/${folder}/${filename}`;

        const uploaded =
            await uploadFile({

                buffer,

                storagePath,

                mimeType:
                    file.type
            });

        return Response.json({

            ok: true,

            file_url:
                uploaded.url,

            storage_path:
                uploaded.storagePath,

            mime_type:
                file.type,

            size_bytes:
                file.size
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