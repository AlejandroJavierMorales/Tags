// =====================================
// PAGE: /p/[slug]/payment/success
// Descripción: Retorno exitoso Mercado Pago.
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
            <section className="store_payment_result_card success">
                <div className="store_payment_result_icon">
                    ✅
                </div>

                <h1>Pago aprobado</h1>

                <p>
                    Recibimos tu pago correctamente. El vendedor continuará con la preparación del pedido.
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