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
console.log("DELETE OK:", storagePath);
        return true;

    } catch (err) {
        console.error("DELETE FILE ERROR:", {
            storagePath,
            error: err.message
        });

        return false;
    }
}