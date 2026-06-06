// modules/files/lib/googleStorage.js

import { Storage }
    from "@google-cloud/storage";

export const storage =
    new Storage({
        keyFilename:
            process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

export const bucket =
    storage.bucket(
        process.env.GOOGLE_STORAGE_BUCKET
    );