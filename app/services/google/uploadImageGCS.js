import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: 'calamuchitarmaps',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,  // Ruta correcta al archivo JSON
});

export async function uploadImageToGCS(localFilePath, bucketName, remoteFilePath) {
  await storage.bucket(bucketName).upload(localFilePath, {
    destination: remoteFilePath,
  });
  /* console.log(`${localFilePath} uploaded to ${bucketName}/${remoteFilePath}`); */
}
