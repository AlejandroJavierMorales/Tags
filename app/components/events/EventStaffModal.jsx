"use client";

export default function EventStaffModal({

    isOpen,

    modal,

    closeStaffModal,

    saveStaff,

    staffName,
    setStaffName,

    staffEmail,
    setStaffEmail,

    staffPassword,
    setStaffPassword,

    staffRole,
    setStaffRole,

    staffStatus,
    setStaffStatus

}) {

    if (!isOpen) return null;

    return (

        <div className="tags_modal_overlay">

            <div className="tags_modal_card">

                {/* CLOSE */}
                <button
                    className="tags_modal_close"
                    onClick={closeStaffModal}
                >
                    ✕
                </button>

                {/* HEADER */}
                <div className="tags_modal_header text-center">

                    <h2 className="tags_modal_title">

                        {modal?.id
                            ? "Editar Usuario"
                            : "Nuevo Usuario"}

                    </h2>

                    <p className="tags_modal_description">

                        Configurá el usuario del evento

                    </p>

                </div>

                {/* BODY */}
                <div className="tags_modal_body">

                    {/* NAME */}
                    <div className="tags_modal_group">

                        <label className="tags_modal_label">
                            Nombre
                        </label>

                        <input
                            className="tags_modal_input"
                            placeholder="Nombre"
                            value={staffName}
                            onChange={(e) =>
                                setStaffName(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    {/* EMAIL */}
                    <div className="tags_modal_group">

                        <label className="tags_modal_label">
                            Email
                        </label>

                        <input
                            type="email"
                            className="tags_modal_input"
                            placeholder="Email"
                            value={staffEmail}
                            onChange={(e) =>
                                setStaffEmail(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    {/* PASSWORD */}
                    <div className="tags_modal_group">

                        <label className="tags_modal_label">

                            Password

                            {modal?.id && (
                                <small className="ms-2 opacity-75">

                                    (dejar vacío para mantener)

                                </small>
                            )}

                        </label>

                        <input
                            type="password"
                            className="tags_modal_input"
                            placeholder="Password"
                            value={staffPassword}
                            onChange={(e) =>
                                setStaffPassword(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                    {/* ROLE */}
                    <div className="tags_modal_group">

                        <label className="tags_modal_label">
                            Rol
                        </label>

                        <select
                            className="tags_modal_input"
                            value={staffRole}
                            onChange={(e) =>
                                setStaffRole(
                                    e.target.value
                                )
                            }
                        >

                            <option value="event_manager">
                                Event Manager
                            </option>

                            <option value="event_staff">
                                Event Staff
                            </option>

                            <option value="event_scanner">
                                Event Scanner
                            </option>

                        </select>

                    </div>

                    {/* STATUS */}
                    <div className="tags_modal_group">

                        <label className="tags_modal_label">
                            Estado
                        </label>

                        <select
                            className="tags_modal_input"
                            value={staffStatus}
                            onChange={(e) =>
                                setStaffStatus(
                                    e.target.value
                                )
                            }
                        >

                            <option value="active">
                                Activo
                            </option>

                            <option value="inactive">
                                Inactivo
                            </option>

                        </select>

                    </div>

                </div>

                {/* ACTIONS */}
                <div className="tags_modal_actions">

                    <button
                        className="tags_modal_btn tags_modal_btn_success"
                        onClick={saveStaff}
                    >
                        🖫 Guardar
                    </button>

                    <button
                        className="tags_modal_btn tags_modal_btn_cancel"
                        onClick={closeStaffModal}
                    >
                        ✖ Cancelar
                    </button>

                </div>

            </div>

        </div>
    );
}