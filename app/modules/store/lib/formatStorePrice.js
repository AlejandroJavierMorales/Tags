// =====================================
// LIB: formatStorePrice
// Descripción: Formatea precios de Tags Tienda.
// =====================================

export function formatStorePrice(value, currency = "ARS") {
    const number =
        Number(value || 0);

    return `${currency} ${number.toLocaleString("es-AR")}`;
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