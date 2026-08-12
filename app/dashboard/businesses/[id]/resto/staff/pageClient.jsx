"use client";

import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useRouter
} from "next/navigation";

import {
    FaEnvelope,
    FaHistory,
    FaHome,
    FaPlus,
    FaSave,
    FaShieldAlt,
    FaUserEdit,
    FaUsers
} from "react-icons/fa";

import TagsSpinner
    from "@/app/components/TagsSpinner";
import showAlert
    from "@/app/components/showAlert";

import "@/app/styles/qr-page.css";
import "@/app/styles/tags_dashboard.css";
import "@/app/modules/resto/styles/orders/index.css";
import "@/app/modules/resto/styles/resto-staff.css";
import "@/app/modules/resto/styles/resto-staff-permissions.css";
import "@/app/modules/resto/styles/resto-staff-responsibilities.css";
import {
    getRestoPermissionLabel,
    getRestoPermissionModule
} from "@/app/modules/resto/lib/staff/permissionLabels";
import {
    RESTO_NOTIFICATION_OPTIONS,
    RESTO_NOTIFICATION_SCOPES
} from "@/app/modules/resto/lib/staff/responsibilityOptions";

const EMPTY_STAFF = {
    id: null,
    name: "",
    email: "",
    phone: "",
    notes: "",
    role_id: "",
    status: "active",
    overrides: {},
    assignedLocationIds: [],
    notificationPreferences: {}
};

const AUDIT_PERIODS = [
    ["today", "Hoy"],
    ["7", "Últimos 7 días"],
    ["30", "Últimos 30 días"],
    ["90", "Últimos 90 días"],
    ["365", "Último año"],
    ["all", "Todo el historial"],
    ["custom", "Período personalizado"]
];

export default function RestoStaffClient({
    businessId
}) {
    const router = useRouter();
    const [data, setData] =
        useState(null);
    const [loading, setLoading] =
        useState(true);
    const [saving, setSaving] =
        useState(false);
    const [tab, setTab] =
        useState("staff");
    const [staffForm, setStaffForm] =
        useState(null);
    const [roleForm, setRoleForm] =
        useState(null);
    const [auditSearch, setAuditSearch] =
        useState("");
    const [auditPeriod, setAuditPeriod] =
        useState("today");
    const [auditFrom, setAuditFrom] =
        useState("");
    const [auditTo, setAuditTo] =
        useState("");

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, [
        auditPeriod,
        auditFrom,
        auditTo
    ]);

    async function load() {
        try {
            const params =
                new URLSearchParams({
                    businessId:
                        String(
                            businessId
                        ),
                    auditPeriod
                });

            if (
                auditPeriod ===
                "custom"
            ) {
                if (auditFrom) {
                    params.set(
                        "auditFrom",
                        auditFrom
                    );
                }

                if (auditTo) {
                    params.set(
                        "auditTo",
                        auditTo
                    );
                }
            }

            const response =
                await fetch(
                    `/api/resto/admin/staff?${params.toString()}`,
                    { cache: "no-store" }
                );
            const result =
                await response.json();
            if (!response.ok) {
                throw new Error(
                    result?.error
                );
            }
            setData(result);
        } catch (error) {
            showAlert({
                icon: "error",
                title: "Personal",
                text: error.message
            });
        } finally {
            setLoading(false);
        }
    }

    const modules =
        useMemo(() => {
            const grouped = {};
            for (
                const permission of
                    data?.permissions || []
            ) {
                const moduleName = getRestoPermissionModule(permission);
                grouped[moduleName] ||= [];
                grouped[
                    moduleName
                ].push(permission);
            }
            return Object.entries(grouped);
        }, [data]);

    const filteredAudit =
        useMemo(
            () =>
                (data?.audit || [])
                    .filter(
                        item => {
                            const search =
                                auditSearch
                                    .trim()
                                    .toLowerCase();

                            if (!search) {
                                return true;
                            }

                            return [
                                item.actor_name,
                                item.staff_email,
                                item.action_code,
                                item.entity_type,
                                item.entity_id,
                                item.description
                            ].some(
                                value =>
                                    String(
                                        value ||
                                        ""
                                    )
                                        .toLowerCase()
                                        .includes(
                                            search
                                        )
                            );
                        }
                    ),
            [
                auditSearch,
                data
            ]
        );

    async function post(body) {
        setSaving(true);
        try {
            const response =
                await fetch(
                    "/api/resto/admin/staff",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            ...body
                        })
                    }
                );
            const result =
                await response.json();
            if (!response.ok) {
                throw new Error(
                    result?.error
                );
            }
            await load();
            return true;
        } catch (error) {
            showAlert({
                icon: "error",
                title: "Personal",
                text: error.message
            });
            return false;
        } finally {
            setSaving(false);
        }
    }

    async function saveStaff() {
        const ok =
            await post({
                action: "save_staff",
                staff: staffForm
            });
        if (ok) {
            setStaffForm(null);
            showAlert({
                icon: "success",
                title: "Empleado guardado",
                timer: 1300
            });
        }
    }

    async function saveRole() {
        const isNew =
            !roleForm.id;
        const ok =
            await post({
                action:
                    isNew
                        ? "save_role"
                        : "save_role_permissions",
                ...(isNew
                    ? { role: roleForm }
                    : {
                        roleId: roleForm.id,
                        permissions:
                            roleForm.permissions
                    })
            });
        if (ok) {
            setRoleForm(null);
            showAlert({
                icon: "success",
                title:
                    isNew
                        ? "Rol creado"
                        : "Permisos actualizados",
                timer: 1300
            });
        }
    }

    async function sendLink(staff) {
        try {
            const response =
                await fetch(
                    "/api/resto/admin/staff/send-link",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            businessId,
                            staffId: staff.id
                        })
                    }
                );
            const result =
                await response.json();
            if (!response.ok) {
                throw new Error(
                    result?.error
                );
            }
            showAlert({
                icon: "success",
                title: "Acceso enviado",
                text:
                    `Enviamos el Magic Link a ${result.email}.`
            });
        } catch (error) {
            showAlert({
                icon: "error",
                title: "Magic Link",
                text: error.message
            });
        }
    }

    if (loading) {
        return (
            <div className="qr_page_builder">
                <TagsSpinner />
            </div>
        );
    }

    return (
        <main className="tags_resto_staff_page">
            <header className="tags_resto_orders_header">
                <div className="tags_resto_orders_header_identity">
                    <div className="tags_resto_orders_header_icon">
                        <FaUsers />
                    </div>
                    <div className="tags_resto_orders_header_content">
                        <h1 className="tags_resto_orders_title">
                            Personal
                        </h1>
                        <p className="tags_resto_orders_subtitle">
                            Empleados, roles, accesos y permisos
                        </p>
                    </div>
                </div>
                <div className="tags_resto_btn_group">
                    <button
                        className="tags_resto_btn tags_resto_btn_secondary"
                        onClick={() =>
                            router.push(
                                `/dashboard/businesses/${businessId}/resto`
                            )
                        }
                    >
                        <FaHome /> Inicio
                    </button>
                    {data?.canManage && (
                        <button
                            className="tags_resto_btn tags_resto_btn_primary"
                            onClick={() =>
                                tab === "staff"
                                    ? setStaffForm({
                                        ...EMPTY_STAFF
                                    })
                                    : setRoleForm({
                                        id: null,
                                        code: "",
                                        name: "",
                                        description: ""
                                    })
                            }
                        >
                            <FaPlus />
                            {tab === "staff"
                                ? "Agregar empleado"
                                : "Agregar rol"}
                        </button>
                    )}
                </div>
            </header>

            <nav className="tags_resto_staff_tabs">
                <button
                    className={tab === "staff" ? "active" : ""}
                    onClick={() => setTab("staff")}
                >
                    <FaUsers /> Empleados
                </button>
                <button
                    className={tab === "roles" ? "active" : ""}
                    onClick={() => setTab("roles")}
                >
                    <FaShieldAlt /> Roles y permisos
                </button>
                {data?.canViewAudit && (
                    <button
                        className={tab === "audit" ? "active" : ""}
                        onClick={() => setTab("audit")}
                    >
                        <FaHistory /> Actividad
                    </button>
                )}
            </nav>

            {tab === "staff" && (
                <section className="tags_resto_staff_grid">
                    {(data?.staff || []).map(staff => (
                        <article key={staff.id}>
                            <div>
                                <span className={`tags_resto_staff_status ${staff.status}`}>
                                    {staff.status === "active" ? "Activo" : "Inactivo"}
                                </span>
                                <h2>{staff.name}</h2>
                                <p>{staff.email}</p>
                                <strong>{staff.role_name || "Sin rol"}</strong>
                            </div>
                            <div className="tags_resto_btn_group">
                                {data.canManage && (
                                    <>
                                        <button
                                            className="tags_resto_btn tags_resto_btn_secondary"
                                            onClick={() =>
                                                setStaffForm({
                                                    ...staff,
                                                    role_id: staff.role_id || "",
                                                    assignedLocationIds: staff.assignedLocationIds || [],
                                                    notificationPreferences: staff.notificationPreferences || {}
                                                })
                                            }
                                        >
                                            <FaUserEdit /> Editar
                                        </button>
                                        <button
                                            className="tags_resto_btn tags_resto_btn_primary"
                                            disabled={staff.status !== "active"}
                                            onClick={() => sendLink(staff)}
                                        >
                                            <FaEnvelope /> Enviar acceso
                                        </button>
                                    </>
                                )}
                            </div>
                        </article>
                    ))}
                </section>
            )}

            {tab === "roles" && (
                <section className="tags_resto_staff_grid">
                    {(data?.roles || []).map(role => (
                        <article key={role.id}>
                            <div>
                                <span className="tags_resto_staff_status active">
                                    {role.is_system ? "Rol inicial" : "Rol personalizado"}
                                </span>
                                <h2>{role.name}</h2>
                                <p>{role.description}</p>
                                <strong>
                                    {role.permissions.length} permisos
                                </strong>
                            </div>
                            {data.canManage && (
                                <button
                                    className="tags_resto_btn tags_resto_btn_secondary"
                                    onClick={() =>
                                        setRoleForm({
                                            ...role,
                                            permissions: [
                                                ...role.permissions
                                            ]
                                        })
                                    }
                                >
                                    <FaShieldAlt /> Configurar
                                </button>
                            )}
                        </article>
                    ))}
                </section>
            )}

            {tab === "audit" && data?.canViewAudit && (
                <section className="tags_resto_staff_audit">
                    <header>
                        <div>
                            <h2>Registro de actividad</h2>
                            <p>
                                Últimas acciones administrativas y operativas.
                            </p>
                        </div>
                        <div className="tags_resto_staff_audit_filters">
                            <label>
                                <span>Período</span>
                                <select
                                    value={auditPeriod}
                                    onChange={
                                        event =>
                                            setAuditPeriod(
                                                event.target.value
                                            )
                                    }
                                >
                                    {
                                        AUDIT_PERIODS.map(
                                            option => (
                                                <option
                                                    key={option[0]}
                                                    value={option[0]}
                                                >
                                                    {option[1]}
                                                </option>
                                            )
                                        )
                                    }
                                </select>
                            </label>

                            {
                                auditPeriod === "custom" && (
                                    <>
                                        <label>
                                            <span>Desde</span>
                                            <input
                                                type="date"
                                                value={auditFrom}
                                                max={auditTo || undefined}
                                                onChange={
                                                    event =>
                                                        setAuditFrom(
                                                            event.target.value
                                                        )
                                                }
                                            />
                                        </label>

                                        <label>
                                            <span>Hasta</span>
                                            <input
                                                type="date"
                                                value={auditTo}
                                                min={auditFrom || undefined}
                                                onChange={
                                                    event =>
                                                        setAuditTo(
                                                            event.target.value
                                                        )
                                                }
                                            />
                                        </label>
                                    </>
                                )
                            }
                        </div>

                        <input
                            type="search"
                            value={auditSearch}
                            placeholder="Buscar persona, acción o entidad"
                            onChange={
                                event =>
                                    setAuditSearch(
                                        event.target.value
                                    )
                            }
                        />
                    </header>
                    <div>
                        {
                            filteredAudit
                                .filter(
                                    item => {
                                        const search =
                                            auditSearch
                                                .trim()
                                                .toLowerCase();

                                        if (!search) {
                                            return true;
                                        }

                                        return [
                                            item.actor_name,
                                            item.staff_email,
                                            item.action_code,
                                            item.entity_type,
                                            item.entity_id,
                                            item.description
                                        ].some(
                                            value =>
                                                String(
                                                    value ||
                                                    ""
                                                )
                                                    .toLowerCase()
                                                    .includes(
                                                        search
                                                    )
                                        );
                                    }
                                )
                                .map(
                                    item => (
                                        <article key={item.id}>
                                            <div>
                                                <strong>
                                                    {item.actor_name || "Sistema"}
                                                </strong>
                                                <span>
                                                    {item.actor_type === "staff" ? "Personal" : "Propietario"}
                                                </span>
                                            </div>
                                            <div>
                                                <strong>{item.action_code}</strong>
                                                <span>
                                                    {
                                                        item.entity_type
                                                            ? `${item.entity_type}${item.entity_id ? ` #${item.entity_id}` : ""}`
                                                            : "Acción general"
                                                    }
                                                </span>
                                                {
                                                    item.description && (
                                                        <small>{item.description}</small>
                                                    )
                                                }
                                            </div>
                                            <time>
                                                {formatAuditDate(item.created_at)}
                                            </time>
                                        </article>
                                    )
                                )
                        }
                        {
                            filteredAudit.length === 0 && (
                                <p className="tags_resto_staff_audit_empty">
                                    Todavía no hay acciones registradas.
                                </p>
                            )
                        }
                    </div>
                </section>
            )}

            {staffForm && (
                <Editor
                    title={staffForm.id ? "Editar empleado" : "Nuevo empleado"}
                    onClose={() => setStaffForm(null)}
                    onSave={saveStaff}
                    saving={saving}
                >
                    <div className="tags_resto_staff_form_grid">
                        <Field label="Nombre" value={staffForm.name} onChange={value => setStaffForm(current => ({ ...current, name: value }))} />
                        <Field label="Email" value={staffForm.email} onChange={value => setStaffForm(current => ({ ...current, email: value }))} />
                        <Field label="Teléfono" value={staffForm.phone} onChange={value => setStaffForm(current => ({ ...current, phone: value }))} />
                        <label><span>Rol</span><select value={staffForm.role_id} onChange={event => setStaffForm(current => ({ ...current, role_id: event.target.value }))}><option value="">Sin rol</option>{data.roles.filter(role => role.is_active).map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
                        <label><span>Estado</span><select value={staffForm.status} onChange={event => setStaffForm(current => ({ ...current, status: event.target.value }))}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
                        <Field label="Observaciones" value={staffForm.notes} onChange={value => setStaffForm(current => ({ ...current, notes: value }))} />
                    </div>
                    <PermissionMatrix
                        modules={modules}
                        mode="overrides"
                        values={staffForm.overrides || {}}
                        onChange={(code, value) =>
                            setStaffForm(current => ({
                                ...current,
                                overrides: {
                                    ...current.overrides,
                                    [code]: value
                                }
                            }))
                        }
                    />
                    <ResponsibilityMatrix
                        locations={data.locations || []}
                        assignedLocationIds={staffForm.assignedLocationIds || []}
                        notificationPreferences={staffForm.notificationPreferences || {}}
                        onLocationsChange={assignedLocationIds =>
                            setStaffForm(current => ({ ...current, assignedLocationIds }))
                        }
                        onNotificationsChange={notificationPreferences =>
                            setStaffForm(current => ({ ...current, notificationPreferences }))
                        }
                    />
                </Editor>
            )}

            {roleForm && (
                <Editor
                    title={roleForm.id ? `Permisos de ${roleForm.name}` : "Nuevo rol"}
                    onClose={() => setRoleForm(null)}
                    onSave={saveRole}
                    saving={saving}
                >
                    {!roleForm.id ? (
                        <div className="tags_resto_staff_form_grid">
                            <Field label="Nombre" value={roleForm.name} onChange={value => setRoleForm(current => ({ ...current, name: value }))} />
                            <Field label="Código" value={roleForm.code} onChange={value => setRoleForm(current => ({ ...current, code: value }))} />
                            <Field label="Descripción" value={roleForm.description} onChange={value => setRoleForm(current => ({ ...current, description: value }))} />
                        </div>
                    ) : (
                        <PermissionMatrix
                            modules={modules}
                            mode="role"
                            values={roleForm.permissions}
                            onChange={(code, checked) =>
                                setRoleForm(current => ({
                                    ...current,
                                    permissions:
                                        checked
                                            ? [...current.permissions, code]
                                            : current.permissions.filter(item => item !== code)
                                }))
                            }
                        />
                    )}
                </Editor>
            )}
        </main>
    );
}

function formatAuditDate(
    value
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            String(value).replace(
                " ",
                "T"
            )
        );

    return Number.isNaN(
        date.getTime()
    )
        ? String(value)
        : new Intl.DateTimeFormat(
            "es-AR",
            {
                dateStyle:
                    "short",
                timeStyle:
                    "short"
            }
        ).format(date);
}

function Field({
    label,
    value,
    onChange
}) {
    return (
        <label>
            <span>{label}</span>
            <input
                value={value || ""}
                onChange={event =>
                    onChange(event.target.value)
                }
            />
        </label>
    );
}

function Editor({
    title,
    children,
    onClose,
    onSave,
    saving
}) {
    return (
        <div className="tags_resto_staff_modal">
            <section>
                <header>
                    <h2>{title}</h2>
                    <button onClick={onClose}>×</button>
                </header>
                <div>{children}</div>
                <footer>
                    <button className="tags_resto_btn tags_resto_btn_secondary" onClick={onClose}>Cancelar</button>
                    <button className="tags_resto_btn tags_resto_btn_primary" disabled={saving} onClick={onSave}><FaSave /> Guardar</button>
                </footer>
            </section>
        </div>
    );
}

function PermissionMatrix({
    modules,
    mode,
    values,
    onChange
}) {
    const allCodes = modules.flatMap(([, permissions]) => permissions.map(permission => permission.code));
    const grantAll = () => {
        if (mode === "role") {
            allCodes.forEach(code => onChange(code, true));
            return;
        }
        allCodes.forEach(code => onChange(code, "allow"));
    };

    const resetAll = () => {
        if (mode === "role") {
            allCodes.forEach(code => onChange(code, false));
            return;
        }
        allCodes.forEach(code => onChange(code, ""));
    };

    return (
        <div className="tags_resto_staff_permissions">
            <div className="tags_resto_staff_permissions_header">
                <div>
                    <h3>Permisos operativos</h3>
                    <p>Podés combinar responsabilidades aunque el empleado tenga un solo rol principal.</p>
                </div>
                <div className="tags_resto_staff_permissions_actions">
                    <button type="button" onClick={grantAll}>Conceder todos</button>
                    <button type="button" onClick={resetAll}>Restablecer</button>
                </div>
            </div>
            {modules.map(([module, permissions]) => (
                <section key={module}>
                    <h4>{module}</h4>
                    {permissions.map(permission => (
                        <label key={permission.code}>
                            <span>
                                <strong>{getRestoPermissionLabel(permission)}</strong>
                            </span>
                            {mode === "role" ? (
                                <input
                                    type="checkbox"
                                    checked={values.includes(permission.code)}
                                    onChange={event => onChange(permission.code, event.target.checked)}
                                />
                            ) : (
                                <select
                                    value={values[permission.code] || ""}
                                    onChange={event => onChange(permission.code, event.target.value)}
                                >
                                    <option value="">Usar permiso del rol</option>
                                    <option value="allow">Conceder</option>
                                    <option value="deny">Denegar</option>
                                </select>
                            )}
                        </label>
                    ))}
                </section>
            ))}
        </div>
    );
}

function ResponsibilityMatrix({
    locations,
    assignedLocationIds,
    notificationPreferences,
    onLocationsChange,
    onNotificationsChange
}) {
    const toggleLocation = locationId => {
        const current = assignedLocationIds.includes(Number(locationId));
        onLocationsChange(current
            ? assignedLocationIds.filter(id => Number(id) !== Number(locationId))
            : [...assignedLocationIds, Number(locationId)]);
    };

    return (
        <div className="tags_resto_staff_responsibilities">
            <div className="tags_resto_staff_permissions_header">
                <div>
                    <h3>Responsabilidades y notificaciones</h3>
                    <p>Las mesas asignadas se usan para limitar los avisos operativos de ese empleado.</p>
                </div>
            </div>
            <section>
                <h4>Mesas asignadas</h4>
                {locations.length === 0 ? (
                    <p className="tags_resto_staff_empty_hint">Todavía no hay mesas activas para asignar.</p>
                ) : (
                    <div className="tags_resto_staff_location_options">
                        {locations.map(location => (
                            <label key={location.id}>
                                <input
                                    type="checkbox"
                                    checked={assignedLocationIds.includes(Number(location.id))}
                                    onChange={() => toggleLocation(location.id)}
                                />
                                <span>{location.name}{location.location_code ? ` (${location.location_code})` : ""}</span>
                            </label>
                        ))}
                    </div>
                )}
            </section>
            <section>
                <h4>Qué notificaciones recibe</h4>
                {RESTO_NOTIFICATION_OPTIONS.map(option => (
                    <label key={option.code} className="tags_resto_staff_notification_option">
                        <span>
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                        </span>
                        <select
                            value={notificationPreferences[option.code] || "none"}
                            onChange={event => onNotificationsChange({
                                ...notificationPreferences,
                                [option.code]: event.target.value
                            })}
                        >
                            {RESTO_NOTIFICATION_SCOPES.map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>
                ))}
            </section>
        </div>
    );
}
