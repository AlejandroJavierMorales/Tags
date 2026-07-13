// =====================================
// Archivo:
// /app/modules/files/lib/deleteFile.js
//
// Descripción:
// Elimina un archivo de Google Cloud Storage.
// =====================================

import { bucket }
    from "./googleStorage";

export async function deleteFile(storagePath) {
    if (!storagePath) {
        return false;
    }

    try {
        await bucket
            .file(storagePath)
            .delete({
                ignoreNotFound: true
            });

        return true;

    } catch (err) {
        console.error("DELETE FILE ERROR:", {
            storagePath,
            error: err.message
        });

        return false;
    }
}