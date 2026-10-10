import { cookies } from "next/headers";
import { db } from "@/app/lib/tags-db";

export async function getVisibleEventModules({

    session,
    eventId

}) {
    const [[eventProduct]] = await db.query(
        `SELECT e.business_id,e.product_code,b.name AS business_name,b.logo_url AS business_logo_url,
                (SELECT s.brand_config FROM tags_directory_listings l INNER JOIN tags_directory_site_listings sl ON sl.listing_id=l.id INNER JOIN tags_directory_sites s ON s.id=sl.site_id AND s.is_active=1 WHERE l.business_id=e.business_id ORDER BY (s.code='calamuchitar') DESC,s.id LIMIT 1) AS directory_brand_config,
                EXISTS(SELECT 1 FROM tags_business_addons ba WHERE ba.business_id=e.business_id AND LOWER(TRIM(ba.addon_code))='events' AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())) AS has_simple,
                EXISTS(SELECT 1 FROM tags_business_addons ba WHERE ba.business_id=e.business_id AND LOWER(TRIM(ba.addon_code))='e_events' AND ba.status='active' AND (ba.expires_at IS NULL OR ba.expires_at>=NOW())) AS has_pro
           FROM tags_events e INNER JOIN tags_businesses b ON b.id=e.business_id WHERE e.id=? LIMIT 1`,
        [Number(eventId || 0)]
    );
    const simpleProduct = eventProduct?.product_code === "events" && Number(eventProduct?.has_simple) === 1;
    let directoryBrand = {};
    try { directoryBrand = typeof eventProduct?.directory_brand_config === "string" ? JSON.parse(eventProduct.directory_brand_config || "{}") : (eventProduct?.directory_brand_config || {}); } catch {}
    const branding = {
        name: eventProduct?.business_name || "Eventos",
        logoUrl: eventProduct?.business_logo_url || directoryBrand.logoUrl || directoryBrand.logo_url || "/logo_tags_transparente.webp"
    };

    // =========================
    // OWNER / ADMIN
    // =========================

    if (

        session.role === "admin"
        ||
        session.role === "event_client"

    ) {

        if (simpleProduct) {
            return {
                _productMode: "simple",
                _businessId: Number(eventProduct?.business_id || 0),
                _branding: branding,
                registration: true,
                scanner: true,
                attendees: false,
                checkin: false,
                staff: false,
                invitations: false,
                tables: false,
                menu: false,
                playlist: false,
                event: false,
                guests: false,
                companions: false,
                analytics: false,
                activity: false
            };
        }

        return {

            _productMode: "pro",
            _businessId: Number(eventProduct?.business_id || 0),
            _branding: branding,

            staff: true,
            attendees: true,
            registration: true,
            invitations: true,
            tables: true,
            menu: true,
            playlist: true,
            event: true,
            guests: true,
            checkin: false,
            scanner: true,
            companions: true,
            analytics: true,
            activity: true
        };
    }

    if (session.type === "business_staff") {
        const appCode = simpleProduct ? "events" : "e_events";
        const [[centralAccess]] = await db.query(
            "SELECT permissions_json FROM tags_business_staff_app_access WHERE staff_id=? AND business_id=? AND app_code=? AND status='active' LIMIT 1",
            [Number(session.staffId || 0), Number(eventProduct?.business_id || 0), appCode]
        );
        let permissions = [];
        try { permissions = Array.isArray(centralAccess?.permissions_json) ? centralAccess.permissions_json : JSON.parse(centralAccess?.permissions_json || "[]"); } catch {}
        const has = (...codes) => codes.some(code => permissions.includes(code));
        if (simpleProduct) {
            return {
                _productMode: "simple",
                _businessId: Number(eventProduct?.business_id || 0),
                _branding: branding,
                registration: has("dashboard.view", "events.view", "events.manage", "attendees.view", "attendees.manage", "payments.manage"),
                scanner: has("checkin.manage"),
                attendees: false,
                checkin: false,
                staff: false,
                invitations: false,
                tables: false,
                menu: false,
                playlist: false,
                event: false,
                guests: false,
                companions: false,
                analytics: false,
                activity: false
            };
        }
        return {
            _productMode: "pro",
            _businessId: Number(eventProduct?.business_id || 0),
            _branding: branding,
            registration: has("dashboard.view", "events.view", "events.manage", "attendees.view", "attendees.manage"),
            scanner: has("checkin.manage"),
            attendees: has("attendees.view", "attendees.manage"),
            checkin: false,
            staff: has("staff.manage"),
            invitations: has("events.manage"),
            tables: false,
            menu: false,
            playlist: false,
            event: false,
            guests: false,
            companions: false,
            analytics: false,
            activity: false
        };
    }

    // =========================
    // BASE URL
    // =========================

    const base =
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : process.env.NEXT_PUBLIC_BASE_URL_PROD;

    // =========================
    // COOKIES
    // =========================

    const cookieStore =
        await cookies();

    const cookieHeader =
        cookieStore
            .getAll()
            .map(
                c => `${c.name}=${c.value}`
            )
            .join("; ");

    // =========================
    // GET PERMISSIONS
    // =========================

    let permissions = [];

    try {

        const res =
            await fetch(
                `${base}/api/events/staff/getPermissionsOfStaffId`,
                {
                    cache: "no-store",
                    headers: {
                        Cookie: cookieHeader
                    }
                }
            );

        const data =
            await res.json();



        if (

            res.ok
            &&
            data.ok
            &&
            Array.isArray(data.data)

        ) {

            permissions =
                data.data.flatMap(

                    module =>

                        module.permissions.map(
                            p => p.code
                        )
                );
        }

    } catch (err) {

        console.log(
            err
        );
    }


    // =========================
    // HELPER
    // =========================

    const has = (...required) =>

        required.some(
            p => permissions.includes(p)
        );

    // =========================
    // MODULES
    // =========================

    return {

        _productMode: simpleProduct ? "simple" : "pro",
        _businessId: Number(eventProduct?.business_id || 0),
        _branding: branding,

        registration: simpleProduct,

        staff:
            has(

                "staff.create",
                "staff.update",
                "staff.delete",
                "staff.assign"
            ),

        attendees:
            has(

                "attendees.create",
                "attendees.update",
                "attendees.delete",
                "attendees.send"
            ),

        invitations:
            has(

                "invitations.create",
                "invitations.update",
                "invitations.delete",
                "invitations.send"
            ),
        tables:
            has(

                "tables.create",
                "tables.update",
                "tables.delete",
                "tables.assign"
            ),
        checkin:
            has(

                "checkin.scan",
                "checkin.vip"
            ),

        scanner:
            has(

                "checkin.scan",
                "checkin.vip"
            ),

        activity:
            has(

                "event.timeline",
                "event.images",
                "event.videos"
            ),

        gastronomia:
            has(

                "menu.create",
                "menu.update"
            ),

        music:
            has(

                "playlist.view",
                "playlist.create",
                "playlist.update"
            ),

        companions:
            has(

                "companions.view",
                "companions.create",
                "companions.update",
                "companions.delete"
            ),

        guests:
            has(

                "guest.photos",
                "guest.messages"
            ),

        analytics: false
    };
}
