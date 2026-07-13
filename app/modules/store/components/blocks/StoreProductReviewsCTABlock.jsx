// =====================================
// Archivo:
// /app/modules/store/components/blocks/StoreProductReviewsCTABlock.jsx
//
// Descripción:
// Bloque del Builder de Tags Store
// para verificar una compra y abrir
// Commerce Reviews.
//
// Contexto:
// store
// =====================================

import StoreProductReviewsCTA
    from "../public/StoreProductReviewsCTA";

export default function StoreProductReviewsCTABlock({
    entity,
    content = {},
    styles = {},
    animation = {}
}) {

    return (
        <StoreProductReviewsCTA
            store={entity}
            content={content}
            styles={styles}
            animation={animation}
        />
    );

}