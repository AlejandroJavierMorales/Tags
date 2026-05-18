// /lib/permissions.js
//Recibe ka session y el permiso a averiguar y devuelve true o false
export function hasPermission(
    session,
    permission
) {

    if (!session?.plan?.permissions) {
        return false;
    }

    if (
        session.subscriptionStatus !== "active"
    ) {
        return false;
    }

    return !!session.plan.permissions[permission];
}