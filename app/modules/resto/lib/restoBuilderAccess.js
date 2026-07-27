import { getRestoAccess, restoAccessResponse } from "@/app/modules/resto/lib/staff/getRestoAccess";

export async function requireRestoBuilderAccess({ businessId, permission = "builder.view" }) {
    const access = await getRestoAccess({ businessId, permission });
    return access;
}

export { restoAccessResponse };
