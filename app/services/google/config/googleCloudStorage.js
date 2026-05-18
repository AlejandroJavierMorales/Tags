

import { Storage } from '@google-cloud/storage';
import path from 'path';

// Ruta al archivo de credenciales JSON descargado
const keyFilename = path.join(__dirname, '../../../private/calamuchitarmaps-0046ef02b17b.json');

// Crea una nueva instancia del cliente de GCS
const storage = new Storage({
  keyFilename,
});

export default storage;
