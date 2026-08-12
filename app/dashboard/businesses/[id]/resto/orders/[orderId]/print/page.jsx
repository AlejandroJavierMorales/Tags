import {
    redirect
} from "next/navigation";

import {
    getRestoAccess
} from "@/app/modules/resto/lib/staff/getRestoAccess";
import {
    getNormalizedOrders
} from "@/app/modules/resto/lib/orders/getNormalizedOrders";

import RestoOrderPrintClient
    from "./pageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
    title:
        "Documento del pedido | Tags Resto",
    robots: {
        index:
            false,
        follow:
            false
    }
};

export default async function Page({
    params,
    searchParams
}) {
    const {
        id,
        orderId
    } =
        await params;

    const query =
        await searchParams;

    const documentType =
        query?.document ===
        "kitchen"
            ? "kitchen"
            : "bill";

    const access =
        await getRestoAccess({
            businessId:
                id,
            permission:
                documentType ===
                "kitchen"
                    ? "kitchen.view"
                    : "orders.view"
        });

    if (!access.allowed) {
        return redirect(
            access.status === 401
                ? "/resto/login"
                : `/dashboard/businesses/${id}/resto`
        );
    }

    const {
        store,
        orders
    } =
        await getNormalizedOrders({
            businessId:
                id
        });

    const order =
        orders.find(
            item =>
                Number(item.id) ===
                Number(orderId)
        );

    if (
        !store ||
        !order
    ) {
        return redirect(
            `/dashboard/businesses/${id}/resto/orders`
        );
    }

    return (
        <RestoOrderPrintClient
            businessId={id}
            documentType={documentType}
            store={store}
            order={order}
        />
    );
}
