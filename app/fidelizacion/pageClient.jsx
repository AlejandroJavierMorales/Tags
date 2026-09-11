"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FaArrowLeft, FaArrowRight, FaAward, FaClockRotateLeft, FaExpand, FaGift, FaIdCard, FaQrcode, FaStore, FaXmark } from "react-icons/fa6";
import LoyaltyMerchantClaim from "@/app/modules/loyalty/components/LoyaltyMerchantClaim";
import LoyaltyBenefitBrowser from "@/app/modules/loyalty/components/LoyaltyBenefitBrowser";
import "./loyalty-user.css";

const LIMIT = 5;
const SECTION_META = { programas: { title: "Mis programas", icon: FaIdCard }, disponibles: { title: "Programas disponibles", icon: FaAward }, recompensas: { title: "Recompensas disponibles", icon: FaAward }, beneficios: { title: "Beneficios", icon: FaGift }, movimientos: { title: "Mis movimientos", icon: FaClockRotateLeft } };
const balance = item => item.mechanic === "points" ? `${Number(item.points_balance || 0).toLocaleString("es-AR")} puntos` : item.mechanic === "stamps" ? `${Number(item.stamps_balance || 0)} sellos` : `${Number(item.visits_balance || 0)} visitas`;
const requirement = item => item.required_points ? `${item.required_points} puntos` : item.required_stamps ? `${item.required_stamps} sellos` : item.required_visits ? `${item.required_visits} visitas` : "Condiciones del comercio";
const movement = item => item.points_delta ? `Puntos ${item.points_delta > 0 ? "+" : ""}${item.points_delta}` : item.stamps_delta ? `Sellos ${item.stamps_delta > 0 ? "+" : ""}${item.stamps_delta}` : `Visitas ${item.visits_delta > 0 ? "+" : ""}${item.visits_delta || 0}`;
function Empty({ children }) { return <div className="tags_loyalty_empty"><FaGift /><p>{children}</p></div>; }

export default function LoyaltyUserPageClient({ channel = null, initialSection = "" }) {
  const brand = channel?.brandConfig || {};
  const brandName = brand.displayName || channel?.name || "Tags";
  const brandLogo = brand.logoUrl || brand.logo_url || (channel?.code === "calamuchitar" ? "/directory/calamuchitar/LogoCalamuchita.webp" : "/logo_tags_transparente.webp");
  const primary = brand.primaryColor || "#0fb957";
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState({ programs: [], availablePrograms: [], rewards: [], movements: [], networkBenefits: [] });
  const [memberQr, setMemberQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => { Promise.all([fetch("/api/users/me").then(r => r.json()), fetch("/api/loyalty/member/summary").then(r => r.json()), fetch("/api/loyalty/member/qr").then(r => r.json())]).then(([u, s, q]) => { if (!u.success) throw new Error(u.error || "No se pudo cargar tu cuenta"); setUser(u.user); if (s.success) setSummary(s); if (q.success) setMemberQr(q); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  if (loading) return <main className="tags_loyalty_page"><div className="tags_loyalty_loading">Cargando...</div></main>;
  if (error) return <main className="tags_loyalty_page"><div className="alert alert-danger">{error}</div></main>;
  if (!user) return null;
  const directoryName = brandName === "Tags" ? "la plataforma" : brandName;
  if (SECTION_META[initialSection]) return <FullSection section={initialSection} summary={summary} directoryName={directoryName} primary={primary} />;

  return <main className="tags_loyalty_page" style={{ "--tags-loyalty-primary": primary }}>
    <header className="tags_loyalty_brand"><div><Image src={brandLogo} alt={brandName} width={150} height={84} priority /></div><a href="/mi-cuenta"><FaArrowLeft /> Mi cuenta</a></header>
    <section className="tags_loyalty_hero"><div><small>BENEFICIOS Y RECOMPENSAS</small><h1>Hola, {user.first_name}</h1><p>Consultá tus programas, recompensas, beneficios y movimientos desde un solo lugar.</p></div><div className="tags_loyalty_hero_icon"><FaGift /></div></section>
    {memberQr?.qrValue && <section className="tags_loyalty_qr"><div><i><FaQrcode /></i><span><small>MI IDENTIFICACIÓN</small><h2>Mi QR personal</h2><p>Mostralo en comercios adheridos para identificarte y acreditar tus consumos.</p><strong>{memberQr.memberCode}</strong><button type="button" onClick={() => setQrOpen(true)}><FaExpand /> Mostrar en pantalla completa</button></span></div><button type="button" className="tags_loyalty_qr_image" aria-label="Ampliar QR" onClick={() => setQrOpen(true)}><img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(memberQr.qrValue)}`} width="150" height="150" alt="QR personal" /></button></section>}
    <LoyaltyMerchantClaim />
    <SummarySection code="programas" title="Mis programas" icon={FaIdCard} items={summary.programs} empty="Todavía no participás en ningún programa." render={item => <ProgramItem item={item} joined />} />
    <SummarySection code="disponibles" title="Programas disponibles" icon={FaAward} items={summary.availablePrograms || []} empty={`No hay programas disponibles en ${directoryName} por el momento.`} render={item => <ProgramItem item={item} />} />
    <SummarySection code="recompensas" title="Recompensas disponibles" icon={FaAward} items={summary.rewards} empty="No hay recompensas disponibles por el momento." render={item => <article className="tags_loyalty_reward" key={item.id}><i><FaAward /></i><div><strong>{item.name}</strong><span>{item.description || "Sin descripción"}</span></div><b>{requirement(item)}</b></article>} />
    <SummarySection code="beneficios" title={`Beneficios de ${directoryName}`} icon={FaGift} items={summary.networkBenefits} empty={`No hay beneficios vigentes en ${directoryName}.`} custom={<LoyaltyBenefitBrowser items={summary.networkBenefits.slice(0, LIMIT)} compact />} />
    <SummarySection code="movimientos" title="Mis movimientos" icon={FaClockRotateLeft} items={summary.movements} empty="Todavía no hay movimientos." render={item => <article className="tags_loyalty_movement" key={item.id}><i><FaClockRotateLeft /></i><div><strong>{item.business_name}</strong><span>{item.description || item.transaction_type}</span></div><b>{movement(item)}<small>{new Date(item.created_at).toLocaleString("es-AR")}</small></b></article>} />
    {qrOpen && <div className="tags_loyalty_qr_fullscreen" role="dialog" aria-modal="true"><button type="button" aria-label="Cerrar QR" onClick={() => setQrOpen(false)}><FaXmark /></button><div><small>MI QR PERSONAL</small><h2>Presentá este código en el comercio</h2><img src={`https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=${encodeURIComponent(memberQr.qrValue)}`} width="360" height="360" alt="QR personal ampliado" /><strong>{memberQr.memberCode}</strong><p>También podés indicar este código si no pueden escanear el QR.</p></div></div>}
  </main>;
}

function ProgramItem({ item, joined = false }) { return <a className="tags_loyalty_program_link" href={`/mi-cuenta/fidelizacion/programa/${item.program_id}`}><article className="tags_loyalty_program"><i>{item.business_logo ? <img src={item.business_logo} alt="" /> : <FaStore />}</i><div><strong>{item.business_name}</strong><span>{item.program_name}</span></div><b>{joined ? balance(item) : "Ver y adherirme"}</b></article></a>; }
function SummarySection({ code, title, icon: Icon, items, empty, render, custom }) { const visible = items.slice(0, LIMIT); return <section className="tags_loyalty_section"><header><div><i><Icon /></i><span><small>RESUMEN</small><h2>{title}</h2></span></div><em>{items.length}</em></header>{visible.length ? (custom || <div className="tags_loyalty_preview">{visible.map(render)}{items.length > LIMIT && <div className="tags_loyalty_more">•••</div>}</div>) : <Empty>{empty}</Empty>}{items.length > LIMIT && <a className="tags_loyalty_view_all" href={`/fidelizacion?seccion=${code}`}>Ver todos <FaArrowRight /></a>}</section>; }
function FullSection({ section, summary, directoryName, primary }) { const meta = SECTION_META[section], Icon = meta.icon; let items = [], title = meta.title; if (section === "programas") items = summary.programs; if (section === "disponibles") items = summary.availablePrograms || []; if (section === "recompensas") items = summary.rewards; if (section === "beneficios") { items = summary.networkBenefits; title = `Beneficios de ${directoryName}`; } if (section === "movimientos") items = summary.movements; return <main className="tags_loyalty_page" style={{ "--tags-loyalty-primary": primary }}><header className="tags_loyalty_detail_header"><a href="/fidelizacion"><FaArrowLeft /> Volver</a><div><i><Icon /></i><span><small>BENEFICIOS Y RECOMPENSAS</small><h1>{title}</h1><p>{items.length} registro{items.length === 1 ? "" : "s"}</p></span></div></header>{items.length ? (section === "beneficios" ? <LoyaltyBenefitBrowser items={items} /> : <ResponsiveTable section={section} items={items} />) : <Empty>No hay información disponible por el momento.</Empty>}</main>; }
function ResponsiveTable({ section, items }) { if (section === "programas" || section === "disponibles") return <Table headers={["Comercio", "Programa", "Modalidad", "Estado"]} rows={items.map(i => [<a className="tags_loyalty_table_link" href={`/mi-cuenta/fidelizacion/programa/${i.program_id}`} key={i.program_id}>{i.business_name}</a>, i.program_name, i.mechanic, section === "disponibles" ? "Disponible" : balance(i)])} />; if (section === "recompensas") return <Table headers={["Recompensa", "Descripción", "Requisito"]} rows={items.map(i => [i.name, i.description || "Sin descripción", requirement(i)])} />; return <Table headers={["Fecha y hora", "Comercio", "Detalle", "Movimiento"]} rows={items.map(i => [new Date(i.created_at).toLocaleString("es-AR"), i.business_name, i.description || i.transaction_type, movement(i)])} />; }
function Table({ headers, rows }) { return <section className="tags_loyalty_table_wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i} data-label={headers[i]}>{cell}</td>)}</tr>)}</tbody></table></section>; }
