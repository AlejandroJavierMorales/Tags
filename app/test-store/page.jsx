// =====================================
// Archivo:
// /app/test-store/page.jsx
//
// Descripción:
// Página temporal para validar
// Builder + Store Renderer.
//
// Contexto:
// store
// =====================================

import StoreRenderer from "../modules/store/components/StoreRenderer";
import "@/app/modules/store/styles/store-public.css";



async function getData() {

    const res =
        await fetch(
            "http://localhost:3000/api/store/admin/builder/get?storeId=2",
            {
                cache: "no-store"
            }
        );

    return res.json();

}

export default async function Page() {

    const data =
        await getData();

    return (

        <StoreRenderer
            store={data.store}
            sections={data.sections}
            blocks={data.blocks}
        />

    );

}