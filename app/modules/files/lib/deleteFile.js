// modules/files/lib/deleteFile.js

import { bucket } from "./googleStorage";



export async function deleteFile(
    storagePath
) {

    await bucket
        .file(storagePath)
        .delete();

    return true;
}