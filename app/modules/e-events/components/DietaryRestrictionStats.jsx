"use client";

export default function DietaryRestrictionStats({
    stats,
    report = [],
    eventId
}){

    return (

        <div className="row g-3 mb-4">

            <Stat
                title="Total"
                value={stats.total}
            />

            <Stat
                title="Critical"
                value={stats.critical}
            />

            <Stat
                title="Allergy"
                value={stats.allergy}
            />

            <Stat
                title="Kitchen"
                value={stats.kitchen}
            />

            <Stat
                title="Invitados afectados"
                value={stats.attendeesWithRestrictions}
            />

        </div>
    );
}

function Stat({
    title,
    value
}) {

    return (

        <div className="col-6 col-md-2">

            <div
                style={{
                    background: "#fff",
                    border: "1px solid #ececec",
                    borderRadius: 22,
                    padding: 20
                }}
            >

                <div
                    style={{
                        fontSize: 13,
                        color: "#666",
                        marginBottom: 10
                    }}
                >
                    {title}
                </div>

                <div
                    style={{
                        fontSize: 32,
                        fontWeight: 700
                    }}
                >
                    {value}
                </div>

            </div>

        </div>

    );
}