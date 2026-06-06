// app/modules/e-events/lib/staffHasPermission.js

import { getStaffPermissions }
    from "./getStaffPermissions";

export async function staffHasPermission(

    staffId,
    permission

) {

    const permissions =
        await getStaffPermissions(
            staffId
        );
    
        console.log('***************************+ '+permissions)

    return permissions.includes(
        permission
    );
}