// =====================================
// PAGE CLIENT: /dashboard/businesses/[id]/loyalty
// Descripcion: Panel inicial de configuracion, miembros y acreditacion.
// =====================================

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import { FaArrowsRotate, FaAward, FaClockRotateLeft, FaGear, FaPen, FaQrcode, FaTrash, FaUsers } from "react-icons/fa6";
import showAlert from "@/app/components/showAlert";
import LoyaltyMerchantClaimsAdmin from "@/app/modules/loyalty/components/LoyaltyMerchantClaimsAdmin";
import "../../../../styles/tags_dashboard.css";
import "./loyalty.css";
import "./loyalty-scanner.css";

const EMPTY_PROGRAM = {
    name: "",
    description: "",
    mechanic: "points",
    directory_site_id: ""
};

const EMPTY_ACCREDIT = {
    member_code: "",
    email: "",
    first_name: "",
    last_name: "",
    transaction_type: "CREDIT_POINTS",
    points_delta: "",
    stamps_delta: "",
    visits_delta: "",
    amount: "",
    description: ""
};

const EMPTY_REWARD = {
    id: 0,
    name: "",
    description: "",
    reward_type: "percentage",
    reward_value: "",
    required_points: "",
    required_stamps: "",
    required_visits: ""
};

async function readPayload(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo completar la operación");
    return payload;
}

export default function LoyaltyAdminPageClient({ businessId, isAdmin }) {
    const router = useRouter();
    const [program, setProgram] = useState(EMPTY_PROGRAM);
    const [members, setMembers] = useState([]);
    const [accredit, setAccredit] = useState(EMPTY_ACCREDIT);
    const [rewards, setRewards] = useState([]);
    const [movements, setMovements] = useState([]);
    const [reward, setReward] = useState(EMPTY_REWARD);
    const [redemption, setRedemption] = useState({ account_id: "", reward_id: "", notes: "" });
    const [search, setSearch] = useState("");
    const [scannerOpen, setScannerOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("configuration");
    const codeInputRef = useRef(null);

    const query = isAdmin ? `?business_id=${encodeURIComponent(businessId)}` : "";

    async function load() {
        setLoading(true);
        try {
            const [programResponse, membersResponse, rewardsResponse, movementsResponse] = await Promise.all([
                fetch(`/api/loyalty/admin/program${query}`),
                fetch(`/api/loyalty/admin/members${query}`),
                fetch(`/api/loyalty/admin/rewards${query}`),
                fetch(`/api/loyalty/admin/movements${query}`)
            ]);
            const programPayload = await readPayload(programResponse);
            const membersPayload = await readPayload(membersResponse);
            const rewardsPayload = await readPayload(rewardsResponse);
            const movementsPayload = await readPayload(movementsResponse);
            if (programPayload.program) setProgram({ ...EMPTY_PROGRAM, ...programPayload.program, directory_site_id: programPayload.program.directory_site_id || "" });
            setMembers(membersPayload.members || []);
            setRewards(rewardsPayload.rewards || []);
            setMovements(movementsPayload.movements || []);
        } catch (error) {
            await showAlert({ title: "No se pudo cargar Fidelización", text: error.message, icon: "error" });
        } finally {
            setLoading(false);
        }
    }

    async function lookupMember(value) {
        if (!String(value || "").trim()) {
            await showAlert({ title: "Ingresá el código", text: "Usá el código que aparece debajo del QR del cliente.", icon: "warning" });
            return;
        }
        try {
            const payload = await readPayload(await fetch("/api/loyalty/admin/member/lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ business_id: businessId, value })
            }));
            setAccredit(current => ({
                ...current,
                member_code: payload.member.member_code,
                email: payload.member.email || "",
                first_name: payload.member.first_name || "",
                last_name: payload.member.last_name || ""
            }));
            if (payload.member.account_id) {
                setRedemption(current => ({ ...current, account_id: String(payload.member.account_id) }));
            }
            await showAlert({ title: "Miembro encontrado", text: payload.member.display_name || payload.member.email, icon: "success", timer: 1400 });
        } catch (error) {
            await showAlert({ title: "No se pudo leer el miembro", text: error.message, icon: "error" });
        }
    }

    async function handleMemberScan(detectedCodes) {
        const value = detectedCodes?.[0]?.rawValue;
        if (!value) return;
        setScannerOpen(false);
        await lookupMember(value);
    }

    useEffect(() => { load(); }, [businessId]);

    function focusMemberCode() {
        setActiveTab("operations");
        window.setTimeout(() => {
            codeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            codeInputRef.current?.focus();
        }, 120);
    }

    async function saveProgram(event) {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = await readPayload(await fetch("/api/loyalty/admin/program", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...program, business_id: businessId })
            }));
            setProgram({ ...program, ...payload.program });
            await showAlert({ title: "Programa guardado", icon: "success", timer: 1400 });
        } catch (error) {
            await showAlert({ title: "No se pudo guardar", text: error.message, icon: "error" });
        } finally {
            setSaving(false);
        }
    }

    async function toggleProgram() {
        const nextStatus = program.status === "active" ? "inactive" : "active";
        const confirmed = await showAlert({
            title: nextStatus === "active" ? "¿Activar el programa?" : "¿Desactivar el programa?",
            text: nextStatus === "active" ? "Los usuarios podrán verlo y adherirse." : "Dejará de aparecer entre los programas disponibles. Los miembros y movimientos se conservarán.",
            icon: "warning", showCancelButton: true,
            confirmButtonText: nextStatus === "active" ? "Activar" : "Desactivar",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;
        setSaving(true);
        try {
            const payload = await readPayload(await fetch("/api/loyalty/admin/program", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...program, business_id: businessId, status: nextStatus }) }));
            setProgram({ ...program, ...payload.program });
            await showAlert({ title: nextStatus === "active" ? "Programa activado" : "Programa desactivado", icon: "success", timer: 1400 });
        } catch (error) { await showAlert({ title: "No se pudo cambiar el estado", text: error.message, icon: "error" }); }
        finally { setSaving(false); }
    }

    async function submitAccreditation(event) {
        event.preventDefault();
        if (!accredit.email.trim() && !accredit.member_code.trim()) {
            await showAlert({ title: "Falta el email", text: "Buscá al miembro por su email o completá sus datos para registrarlo.", icon: "warning" });
            return;
        }
        setSaving(true);
        try {
            await readPayload(await fetch("/api/loyalty/admin/accredit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...accredit, business_id: businessId })
            }));
            setAccredit(EMPTY_ACCREDIT);
            await load();
            await showAlert({ title: "Movimiento registrado", text: "El saldo del miembro fue actualizado.", icon: "success", timer: 1600 });
        } catch (error) {
            await showAlert({ title: "No se pudo acreditar", text: error.message, icon: "error" });
        } finally {
            setSaving(false);
        }
    }

    async function saveReward(event) {
        event.preventDefault();
        setSaving(true);
        try {
            const editing = Boolean(reward.id);
            await readPayload(await fetch("/api/loyalty/admin/rewards", {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...reward, business_id: businessId })
            }));
            setReward(EMPTY_REWARD);
            await load();
            await showAlert({ title: editing ? "Recompensa actualizada" : "Recompensa creada", icon: "success", timer: 1400 });
        } catch (error) {
            await showAlert({ title: "No se pudo crear", text: error.message, icon: "error" });
        } finally {
            setSaving(false);
        }
    }

    async function toggleReward(item) {
        const nextStatus = item.status === "active" ? "inactive" : "active";
        try {
            await readPayload(await fetch("/api/loyalty/admin/rewards", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ business_id: businessId, id: item.id, status: nextStatus })
            }));
            await load();
            await showAlert({ title: nextStatus === "active" ? "Recompensa activada" : "Recompensa desactivada", icon: "success", timer: 1200 });
        } catch (error) {
            await showAlert({ title: "No se pudo actualizar", text: error.message, icon: "error" });
        }
    }

    function editReward(item) {
        setReward({
            ...EMPTY_REWARD,
            id: item.id,
            name: item.name || "",
            description: item.description || "",
            reward_type: item.reward_type || "custom",
            reward_value: item.reward_value ?? "",
            required_points: item.required_points ?? "",
            required_stamps: item.required_stamps ?? "",
            required_visits: item.required_visits ?? ""
        });
        setActiveTab("rewards");
        window.setTimeout(() => document.querySelector(".tags_loyalty_rewards_layout")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }

    async function deleteReward(item) {
        const confirmed = await showAlert({
            title: "¿Eliminar esta recompensa?",
            text: `Se eliminará «${item.name}» junto con todos sus canjes, solicitudes y movimientos asociados. Los saldos de los clientes serán recalculados. Esta acción no se puede deshacer.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar definitivamente",
            cancelButtonText: "Cancelar"
        });
        if (!confirmed) return;
        setSaving(true);
        try {
            const payload = await readPayload(await fetch("/api/loyalty/admin/rewards", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ business_id: businessId, id: item.id })
            }));
            if (Number(reward.id) === Number(item.id)) setReward(EMPTY_REWARD);
            await load();
            const total = Number(payload.deleted?.redemptions || 0) + Number(payload.deleted?.movements || 0) + Number(payload.deleted?.claims || 0);
            await showAlert({ title: "Recompensa eliminada", text: total ? `También se eliminaron ${total} registros asociados.` : "No tenía movimientos asociados.", icon: "success" });
        } catch (error) {
            await showAlert({ title: "No se pudo eliminar", text: error.message, icon: "error" });
        } finally {
            setSaving(false);
        }
    }

    async function redeemReward(event) {
        event.preventDefault();
        setSaving(true);
        try {
            await readPayload(await fetch("/api/loyalty/admin/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ business_id: businessId, ...redemption })
            }));
            setRedemption({ account_id: "", reward_id: "", notes: "" });
            await load();
            await showAlert({ title: "Canje registrado", text: "El beneficio fue descontado del saldo del miembro.", icon: "success", timer: 1600 });
        } catch (error) {
            await showAlert({ title: "No se pudo registrar el canje", text: error.message, icon: "error" });
        } finally { setSaving(false); }
    }

    const visibleMembers = members.filter(item => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return [item.display_name, item.first_name, item.last_name, item.email, item.member_code].some(value => String(value || "").toLowerCase().includes(term));
    });

    return (
        <main className="tags_loyalty_admin container-fluid p-3">
            <div className="tags_loyalty_toolbar">
                <div>
                    <button type="button" className="tags_loyalty_back" onClick={() => router.push(`/dashboard/businesses/${businessId}`)}>← Volver al dashboard</button>
                    <p className="tags_loyalty_kicker">HERRAMIENTA CONTRATADA</p>
                    <h1>Tags Fidelización</h1>
                    <p>Configurá tu programa, acreditá consumos y consultá el progreso de tus clientes.</p>
                </div>
            </div>

            <nav className="tags_loyalty_tabs" aria-label="Administración de fidelización">
                <button type="button" className={activeTab === "configuration" ? "active" : ""} onClick={() => setActiveTab("configuration")}><FaGear /><span>Programa</span></button>
                <button type="button" className={activeTab === "operations" ? "active" : ""} onClick={() => setActiveTab("operations")}><FaQrcode /><span>Operaciones</span></button>
                <button type="button" className={activeTab === "members" ? "active" : ""} onClick={() => setActiveTab("members")}><FaUsers /><span>Clientes</span></button>
                <button type="button" className={activeTab === "rewards" ? "active" : ""} onClick={() => setActiveTab("rewards")}><FaAward /><span>Recompensas</span></button>
                <button type="button" className={activeTab === "movements" ? "active" : ""} onClick={() => setActiveTab("movements")}><FaClockRotateLeft /><span>Movimientos</span></button>
            </nav>

            <section className="tags_loyalty_quick_access" hidden={activeTab !== "operations"}>
                <div><span>ACCESO RÁPIDO</span><h2>Atender a un cliente</h2><p>Escaneá su QR personal o ingresá el código que aparece debajo.</p></div>
                <nav><button type="button" onClick={() => setScannerOpen(true)}>Escanear QR</button><button type="button" onClick={focusMemberCode}>Ingresar código</button></nav>
            </section>

            {!loading && program?.id && activeTab === "operations" && <LoyaltyMerchantClaimsAdmin businessId={businessId} isAdmin={isAdmin} />}

            {loading ? <div className="tags_loyalty_loading">Cargando programa...</div> : (activeTab === "configuration" || activeTab === "operations") && (
                <div className="tags_loyalty_grid">
                    <section className="tags_loyalty_card" hidden={activeTab !== "configuration"}>
                        <div className="tags_loyalty_card_header"><div><span>CONFIGURACIÓN</span><h2>Mi programa</h2></div><button type="button" className={`tags_loyalty_status_btn ${program.status === "active" ? "is_active" : "is_inactive"}`} onClick={toggleProgram} disabled={saving}>{program.status === "active" ? "Programa activo" : "Programa desactivado"}</button></div>
                        <form onSubmit={saveProgram} className="tags_loyalty_form">
                            <label>Nombre del programa<input required value={program.name || ""} onChange={event => setProgram({ ...program, name: event.target.value })} placeholder="Ej. Club de clientes" /></label>
                            <label>Descripción<textarea value={program.description || ""} onChange={event => setProgram({ ...program, description: event.target.value })} placeholder="Contale a tus clientes cómo funciona." /></label>
                            <label>Modalidad principal<select value={program.mechanic || "points"} onChange={event => setProgram({ ...program, mechanic: event.target.value })}><option value="points">Puntos</option><option value="stamps">Sellos</option><option value="visits">Visitas</option></select></label>
                            <button className="tags_loyalty_primary_btn" disabled={saving}>{saving ? "Guardando..." : "Guardar programa"}</button>
                        </form>
                    </section>

                    <section className="tags_loyalty_card" hidden={activeTab !== "operations"}>
                        <div className="tags_loyalty_card_header"><div><span>ACREDITAR</span><h2>Registrar un consumo</h2></div></div>
                        <form onSubmit={submitAccreditation} className="tags_loyalty_form">
                            <div className="tags_loyalty_scan_row"><label>Código del miembro<input ref={codeInputRef} value={accredit.member_code} onChange={event => setAccredit({ ...accredit, member_code: event.target.value.trim().toUpperCase(), email: "" })} placeholder="MEM-..." /></label><button type="button" className="tags_loyalty_secondary_btn" onClick={() => setScannerOpen(true)}>Leer QR personal</button><label>Tipo<select value={accredit.transaction_type} onChange={event => setAccredit({ ...accredit, transaction_type: event.target.value })}><option value="CREDIT_POINTS">Acreditar puntos</option><option value="ADD_STAMP">Agregar sello</option><option value="ADD_VISIT">Registrar visita</option></select></label></div>
                            <label>Email del miembro (alternativa)<input type="email" value={accredit.email} onChange={event => setAccredit({ ...accredit, email: event.target.value, member_code: "" })} placeholder="cliente@email.com" /></label>
                            <div className="tags_loyalty_member_code_actions"><button type="button" className="tags_loyalty_secondary_btn" onClick={() => lookupMember(accredit.member_code)}>Validar código</button>{accredit.member_code && <p className="tags_loyalty_selected_member">{accredit.email || accredit.first_name ? "Miembro seleccionado" : "Código ingresado"}: <strong>{accredit.member_code}</strong></p>}</div>
                            <div className="tags_loyalty_form_row"><label>Nombre si es nuevo<input value={accredit.first_name} onChange={event => setAccredit({ ...accredit, first_name: event.target.value })} /></label><label>Apellido si es nuevo<input value={accredit.last_name} onChange={event => setAccredit({ ...accredit, last_name: event.target.value })} /></label></div>
                            {accredit.transaction_type === "CREDIT_POINTS" && <label>Puntos a acreditar<input type="number" min="1" value={accredit.points_delta} onChange={event => setAccredit({ ...accredit, points_delta: event.target.value })} required /></label>}
                            {accredit.transaction_type === "ADD_STAMP" && <label>Sellos a acreditar<input type="number" min="1" value={accredit.stamps_delta} onChange={event => setAccredit({ ...accredit, stamps_delta: event.target.value })} required /></label>}
                            {accredit.transaction_type === "ADD_VISIT" && <label>Visitas a acreditar<input type="number" min="1" value={accredit.visits_delta} onChange={event => setAccredit({ ...accredit, visits_delta: event.target.value })} required /></label>}
                            <label>Importe de la operación (opcional)<input type="number" min="0" step="0.01" value={accredit.amount} onChange={event => setAccredit({ ...accredit, amount: event.target.value })} /></label>
                            <label>Detalle<textarea value={accredit.description} onChange={event => setAccredit({ ...accredit, description: event.target.value })} /></label>
                            <button className="tags_loyalty_primary_btn" disabled={saving}>{saving ? "Registrando..." : "Registrar movimiento"}</button>
                        </form>
                    </section>
                </div>
            )}

            <section className="tags_loyalty_card tags_loyalty_members_card" hidden={activeTab !== "members"}>
                <div className="tags_loyalty_card_header"><div><span>CLIENTES</span><h2>Miembros del programa</h2></div><input className="tags_loyalty_search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre, email o código" /></div>
                <div className="tags_loyalty_table_wrap"><table className="tags_loyalty_table"><thead><tr><th>Miembro</th><th>Email</th><th>Puntos</th><th>Sellos</th><th>Visitas</th><th>Actividad</th></tr></thead><tbody>{visibleMembers.map(item => <tr key={item.member_id}><td><strong>{item.display_name || `${item.first_name} ${item.last_name}`}</strong><small>{item.member_code}</small></td><td>{item.email}</td><td>{Number(item.points_balance || 0).toLocaleString("es-AR")}</td><td>{item.stamps_balance || 0}</td><td>{item.visits_balance || 0}</td><td>{item.last_activity_at ? new Date(item.last_activity_at).toLocaleDateString("es-AR") : "-"}</td></tr>)}{!visibleMembers.length && <tr><td colSpan="6" className="tags_loyalty_empty">Todavía no hay miembros registrados.</td></tr>}</tbody></table></div>
            </section>

            <section className="tags_loyalty_card tags_loyalty_standalone_card" hidden={activeTab !== "movements"}>
                <div className="tags_loyalty_card_header"><div><span>MOVIMIENTOS</span><h2>Historial del programa</h2></div></div>
                <div className="tags_loyalty_table_wrap"><table className="tags_loyalty_table"><thead><tr><th>Fecha</th><th>Miembro</th><th>Movimiento</th><th>Variación</th><th>Saldo</th><th>Detalle</th></tr></thead><tbody>{movements.map(item => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString("es-AR")}</td><td><strong>{item.display_name || `${item.first_name} ${item.last_name}`}</strong><small>{item.email}</small></td><td>{item.transaction_type}</td><td>{item.points_delta ? `Puntos ${item.points_delta > 0 ? "+" : ""}${item.points_delta}` : item.stamps_delta ? `Sellos ${item.stamps_delta > 0 ? "+" : ""}${item.stamps_delta}` : `Visitas ${item.visits_delta > 0 ? "+" : ""}${item.visits_delta}`}</td><td>{item.points_balance_after || 0} pts · {item.stamps_balance_after || 0} sellos · {item.visits_balance_after || 0} visitas</td><td>{item.description || "-"}</td></tr>)}{!movements.length && <tr><td colSpan="6" className="tags_loyalty_empty">Todavía no hay movimientos.</td></tr>}</tbody></table></div>
            </section>

            <section className="tags_loyalty_card tags_loyalty_standalone_card" hidden={activeTab !== "operations"}>
                <div className="tags_loyalty_card_header"><div><span>CANJEAR</span><h2>Registrar un beneficio entregado</h2></div></div>
                <form onSubmit={redeemReward} className="tags_loyalty_form">
                    <div className="tags_loyalty_form_row">
                        <label>Miembro<select required value={redemption.account_id} onChange={event => setRedemption({ ...redemption, account_id: event.target.value })}><option value="">Seleccionar miembro</option>{members.map(item => <option key={item.account_id} value={item.account_id}>{item.display_name || `${item.first_name} ${item.last_name}`} · {item.email}</option>)}</select></label>
                        <label>Recompensa<select required value={redemption.reward_id} onChange={event => setRedemption({ ...redemption, reward_id: event.target.value })}><option value="">Seleccionar recompensa</option>{rewards.filter(item => item.status === "active").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    </div>
                    <label>Nota del canje (opcional)<input value={redemption.notes} onChange={event => setRedemption({ ...redemption, notes: event.target.value })} placeholder="Ej. Beneficio entregado en mostrador" /></label>
                    <button className="tags_loyalty_primary_btn" disabled={saving}>Registrar canje</button>
                </form>
            </section>

            <section className="tags_loyalty_card tags_loyalty_rewards_card" hidden={activeTab !== "rewards"}>
                <div className="tags_loyalty_card_header"><div><span>RECOMPENSAS</span><h2>Qué puede obtener el cliente</h2></div></div>
                <div className="tags_loyalty_rewards_layout">
                    <form onSubmit={saveReward} className="tags_loyalty_form">
                        <label>Nombre de la recompensa<input required value={reward.name} onChange={event => setReward({ ...reward, name: event.target.value })} placeholder="Ej. 10% de descuento" /></label>
                        <label>Descripción<textarea value={reward.description} onChange={event => setReward({ ...reward, description: event.target.value })} /></label>
                        <div className="tags_loyalty_form_row"><label>Tipo<select value={reward.reward_type} onChange={event => setReward({ ...reward, reward_type: event.target.value })}><option value="percentage">Descuento porcentual</option><option value="fixed_amount">Descuento fijo</option><option value="free_product">Producto gratis</option><option value="free_service">Servicio gratis</option><option value="custom">Beneficio personalizado</option></select></label><label>Valor<input type="number" min="0" step="0.01" value={reward.reward_value} onChange={event => setReward({ ...reward, reward_value: event.target.value })} /></label></div>
                        <div className="tags_loyalty_form_row"><label>Puntos requeridos<input type="number" min="1" value={reward.required_points} onChange={event => setReward({ ...reward, required_points: event.target.value })} /></label><label>Sellos requeridos<input type="number" min="1" value={reward.required_stamps} onChange={event => setReward({ ...reward, required_stamps: event.target.value })} /></label></div>
                        <label>Visitas requeridas<input type="number" min="1" value={reward.required_visits} onChange={event => setReward({ ...reward, required_visits: event.target.value })} /></label>
                        <div className="tags_loyalty_reward_form_actions"><button className="tags_loyalty_primary_btn" disabled={saving}>{saving ? "Guardando..." : reward.id ? "Guardar cambios" : "Crear recompensa"}</button>{reward.id ? <button type="button" className="tags_loyalty_secondary_btn" onClick={() => setReward(EMPTY_REWARD)}>Cancelar edición</button> : null}</div>
                    </form>
                    <div className="tags_loyalty_reward_list">{rewards.map(item => <article key={item.id} className="tags_loyalty_reward_item"><div><strong>{item.name}</strong><p>{item.description || "Sin descripción"}</p><small>{item.reward_type} · {item.status === "active" ? "Activa" : "Inactiva"}</small></div><nav><button type="button" title="Editar recompensa" onClick={() => editReward(item)}><FaPen /> Editar</button><button type="button" title={item.status === "active" ? "Desactivar" : "Activar"} onClick={() => toggleReward(item)}><FaArrowsRotate /> {item.status === "active" ? "Desactivar" : "Activar"}</button><button type="button" className="danger" title="Eliminar recompensa" onClick={() => deleteReward(item)}><FaTrash /> Eliminar</button></nav></article>)}{!rewards.length && <p className="tags_loyalty_empty">Todavía no hay recompensas configuradas.</p>}</div>
                </div>
            </section>

            {scannerOpen && <div className="tags_loyalty_scanner_backdrop" role="dialog" aria-modal="true"><div className="tags_loyalty_scanner_modal"><div className="tags_loyalty_card_header"><div><span>ACREDITAR</span><h2>Leer QR personal</h2></div><button type="button" className="tags_loyalty_close_btn" onClick={() => setScannerOpen(false)}>Cerrar</button></div><Scanner onScan={handleMemberScan} onError={() => {}} paused={false} /></div></div>}
        </main>
    );
}
