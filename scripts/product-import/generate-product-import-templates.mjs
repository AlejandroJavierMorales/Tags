import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  buildProductImportWorkbook,
  productImportTemplateFilename,
} from "../../app/modules/product-import/server/productImportWorkbook.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(scriptDirectory, "../../public/documentacion/importacion-productos");

const examples = {
  catalog: ["General", "Productos", "Servicios", "Promociones"],
  store: ["General", "Electrónica", "Accesorios", "Ofertas"],
  resto: ["Entradas", "Pizzas", "Platos principales", "Bebidas", "Postres"],
};

await mkdir(outputDirectory, { recursive: true });

for (const [targetType, categories] of Object.entries(examples)) {
  const filename = productImportTemplateFilename(targetType, "ejemplo-v2");
  const workbook = buildProductImportWorkbook({ targetType, categories });
  await writeFile(path.join(outputDirectory, filename), workbook);
  console.log(`- ${filename}`);
}

console.log(`Plantillas generadas en ${outputDirectory}`);
