// =====================================
// LIB: formatStorePrice
// Descripción: Formatea precios de Tags Tienda.
// =====================================

export function hasValidStorePrice(value) {
    if (value === null || value === undefined || String(value).trim() === "") return false;
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
}

export function formatStorePrice(value, currency = "ARS") {
    if (!hasValidStorePrice(value)) return "";
    const number = Number(value);
    const label = String(currency || "ARS").toUpperCase() === "ARS"
        ? "$"
        : String(currency || "").toUpperCase() === "USD"
            ? "US$"
            : String(currency || "").toUpperCase();
    return `${label} ${number.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

export function getProductFinalPrice(product) {
    if (
        product?.sale_price !== null &&
        product?.sale_price !== undefined &&
        product?.sale_price !== ""
    ) {
        return Number(product.sale_price);
    }

    return Number(product?.price || 0);
}

export function hasProductSale(product) {
    return (
        product?.sale_price !== null &&
        product?.sale_price !== undefined &&
        product?.sale_price !== "" &&
        Number(product.sale_price) > 0
    );
}
