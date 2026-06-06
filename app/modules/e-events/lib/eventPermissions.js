export function hasPermission(
    session,
    permission
) {

    // owner total access
    if (
        session.type === "business"
    ) {
        return true;
    }

    return (
        session.permissions || []
    ).includes(permission);
}