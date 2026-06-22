// =====================================
// PAGE: /p/[slug]/payment/failure
// Descripción: Retorno fallido Mercado Pago.
// =====================================

import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }) {
    const { slug } = await params;
    const query = await searchParams;

    const orderId = query?.orderId;

    return (
        <main className="store_payment_result">
            <section className="store_payment_result_card failure">
                <div className="store_payment_result_icon">
                    ⚠️
                </div>

                <h1>No pudimos confirmar el pago</h1>

                <p>
                    El pago fue rechazado o cancelado. Podés volver a la tienda e intentarlo nuevamente.
                </p>

                {orderId && (
                    <small>
                        Pedido #{orderId}
                    </small>
                )}

                <Link
                    href={`/p/${slug}`}
                    className="store_public_btn"
                >
                    Volver a la tienda
                </Link>
            </section>
        </main>
    );
}