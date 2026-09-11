// mysql2 puede devolver columnas de texto como Buffer cuando la instalación
// heredada tiene charset/collation binario. Nunca debemos enviar esos valores
// directamente a React: se serializan como `base64:type...`.
export function normalizeDirectoryDbValue(value) {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  if (Array.isArray(value)) {
    return value.map(normalizeDirectoryDbValue);
  }

  if (value && typeof value === "object") {
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) {
      return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("utf8");
    }

    if (value instanceof Date) return value;

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeDirectoryDbValue(entry)])
    );
  }

  return value;
}
