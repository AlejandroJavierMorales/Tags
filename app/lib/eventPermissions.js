export const EVENT_PERMISSIONS = {

    // =========================
    // EVENT
    // =========================

    event_update: [

        "event_owner",
        "event_manager"
    ],

    event_delete: [

        "event_owner"
    ],

    // =========================
    // ATTENDEES
    // =========================

    attendees_create: [

        "event_owner",
        "event_manager",
        "event_staff"
    ],

    attendees_update: [

        "event_owner",
        "event_manager",
        "event_staff"
    ],

    attendees_delete: [

        "event_owner",
        "event_manager"
    ],

    // =========================
    // CHECKINS
    // =========================

    checkin_scan: [

        "event_owner",
        "event_manager",
        "event_scanner"
    ],

    // =========================
    // LIVE CONTENT
    // =========================

    upload_live_photos: [

        "event_owner",
        "event_manager",
        "event_staff"
    ],

    playlist_control: [

        "event_owner",
        "event_manager"
    ]
};