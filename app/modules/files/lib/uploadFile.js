// modules/files/lib/uploadFile.js

import { bucket }
    from "./googleStorage";

    

export async function uploadFile({
    buffer,
    storagePath,
    mimeType
}) {

    const file =
        bucket.file(storagePath);

    await file.save(
        buffer,
        {
            metadata: {
                contentType: mimeType
            }
        }
    );

    return {
        storagePath,
        url:
            `https://storage.googleapis.com/${process.env.GOOGLE_STORAGE_BUCKET}/${storagePath}`
    };
}