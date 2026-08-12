// =====================================
// API: /api/files/delete
// Descripción:
// Elimina un archivo de Google Cloud Storage.
// Valida que el archivo pertenezca al business indicado.
// =====================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
    deleteFile
} from "@/app/modules/files/lib/deleteFile";

function normalizeStoragePath(value) {
    return String(value || "")
        .trim()
        .replace(/^\/+/, "");
}

function storagePathBelongsToBusiness(
    storagePath,
    businessId
) {
    const parts =
        storagePath.split("/");

    if (parts.length < 3) {
        return false;
    }

    return String(parts[1]) === String(businessId);
}

export async function DELETE(req) {

    try {

        const body =
            await req.json();

        const {
            businessId,
            storage_path
        } = body;

        if (!businessId) {
            return Response.json(
                {
                    error:
                        "businessId requerido"
                },
                {
                    status: 400
                }
            );
        }

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

        const normalizedStoragePath =
            normalizeStoragePath(
                storage_path
            );

        if (
            !normalizedStoragePath ||
            normalizedStoragePath.includes("..")
        ) {
            return Response.json(
                {
                    error:
                        "storage_path inválido"
                },
                {
                    status: 400
                }
            );
        }

        if (
            !storagePathBelongsToBusiness(
                normalizedStoragePath,
                businessId
            )
        ) {
            return Response.json(
                {
                    error:
                        "El archivo no pertenece al negocio indicado"
                },
                {
                    status: 403
                }
            );
        }

        const deleted =
            await deleteFile(
                normalizedStoragePath
            );

        if (!deleted) {
            return Response.json(
                {
                    error:
                        "No se pudo eliminar el archivo"
                },
                {
                    status: 500
                }
            );
        }

        return Response.json({
            ok: true,
            storage_path:
                normalizedStoragePath
        });

    } catch (err) {

        console.error(
            "FILES DELETE API ERROR:",
            err
        );

        return Response.json(
            {
                error:
                    err.message ||
                    "Error eliminando archivo"
            },
            {
                status: 500
            }
        );
    }
}