"use client";

export default function EventStaffManager({

    staff,

    openCreateStaff,
    openEditStaff,
    deleteStaff,

    formatDate

}) {

    function roleLabel(role) {

        switch (role) {

            case "event_manager":
                return "Manager";

            case "event_staff":
                return "Staff";

            case "event_scanner":
                return "Scanner";

            default:
                return role;
        }
    }

    return (

        <div className="mt-5">

            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-3">

                <h3 className="tags_title">
                    Staff
                </h3>

                <button
                    className="tags_btn rounded"
                    style={{
                        maxWidth: 180
                    }}
                    onClick={openCreateStaff}
                >
                    ✚ Nuevo Usuario
                </button>

            </div>

            {/* TABLE */}
            <div className="tags_table_wrapper">

                <table className="tags_table tags_text_normal">

                    <thead>

                        <tr>

                            <th>Nombre</th>

                            <th>Email</th>

                            <th>Rol</th>

                            <th>Estado</th>

                            <th>Último acceso</th>

                            <th>Acciones</th>

                        </tr>

                    </thead>

                    <tbody>

                        {!staff.length && (

                            <tr>

                                <td
                                    colSpan={6}
                                    className="text-center p-4"
                                >
                                    No hay usuarios cargados
                                </td>

                            </tr>
                        )}

                        {staff.map((row) => (

                            <tr key={row.id}>

                                <td>

                                    <strong>
                                        {row.name}
                                    </strong>

                                </td>

                                <td>
                                    {row.email}
                                </td>

                                <td>
                                    {roleLabel(row.role)}
                                </td>

                                <td>

                                    <span
                                        className={
                                            row.status === "active"
                                                ? "badge active"
                                                : "badge inactive"
                                        }
                                    >

                                        {row.status}

                                    </span>

                                </td>

                                <td>

                                    {row.last_login_at
                                        ? formatDate(
                                            row.last_login_at
                                        )
                                        : "-"}

                                </td>

                                <td>

                                    <div className="actions d-flex gap-2 justify-content-center">

                                        <button
                                            className="icon_btn success"
                                            onClick={() =>
                                                openEditStaff(row)
                                            }
                                        >
                                            ✏️
                                        </button>

                                        <button
                                            className="icon_btn danger"
                                            onClick={() =>
                                                deleteStaff(row.id)
                                            }
                                        >
                                            🗑
                                        </button>

                                    </div>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}