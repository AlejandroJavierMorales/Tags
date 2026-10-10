"use client";

import { useState } from "react";
import { FaAddressBook, FaArrowDown, FaArrowUp, FaAward, FaCalendarDays, FaCommentDots, FaEye, FaEyeSlash, FaImages, FaLayerGroup, FaPen, FaPlus, FaStar, FaStore, FaTag, FaTrash, FaUser, FaUtensils } from "react-icons/fa6";
import TagsSpinner from "@/app/components/TagsSpinner";
import showAlert from "@/app/components/showAlert";
import { getDirectoryModuleSettings } from "../../lib/directoryModuleSettings";
import { getDirectorySectionGroups, isDirectorySectionGroupable } from "../../lib/directorySectionGroups";
import DirectorySectionEditor from "./DirectorySectionEditor";
import DirectorySectionGroupEditor from "./DirectorySectionGroupEditor";
import "./DirectoryStructureManager.css";

async function responsePayload(response) { const text = await response.text(); try { return text ? JSON.parse(text) : {}; } catch { return {}; } }
function kindOf(section) { const type = section?.blocks?.[0]?.type; return section?.settings_json?.directoryBaseSlot || (type === "gallery" ? "gallery" : type === "contact_info" ? "contact" : type === "catalog" || section.type === "catalog" ? "catalog" : type === "benefits" ? "benefits" : type === "loyalty_program" ? "loyalty" : "web"); }

const META = {
  presentation: [FaUser, "Presentación", "Título, textos y párrafos."],
  gallery: [FaImages, "Galería", "Imágenes de la Web."],
  catalog: [FaStore, "Catálogo", "Productos y categorías."],
  contact: [FaAddressBook, "Contacto", "Datos y acciones de contacto."],
  benefits: [FaTag, "Beneficios", "Promociones privadas y públicas."],
  loyalty: [FaAward, "Fidelización", "Programa y recompensas para tus clientes."],
  web: [FaLayerGroup, "Sección web", "Contenido libre de la Web."]
};

const MODULE_META = {
  store: [FaStore, "Tienda", "Tienda incorporada a la Web."],
  resto: [FaUtensils, "Gastronomía", "Carta y pedidos incorporados a la Web."],
  turnos: [FaCalendarDays, "Reservas", "Solicitud de turnos y horarios disponibles."],
  events: [FaCalendarDays, "Eventos", "Próximos eventos e inscripciones públicas."],
  reviewsInvitation: [FaCommentDots, "Invitar a reseñar", "Acceso al formulario de experiencia."],
  reviewsSlider: [FaStar, "Reseñas públicas", "Opiniones visibles de clientes."]
};

function availableModuleCodes(web) {
  return Object.keys(MODULE_META).filter(code => ({
    store: Boolean(web?.embeddedStore?.store),
    resto: Boolean(web?.embeddedResto?.store),
    turnos: Boolean(web?.embeddedTurnos?.length),
    events: Boolean(web?.availableModules?.events || web?.embeddedEvents?.length),
    reviewsInvitation: Boolean(web?.embeddedReviews?.form),
    reviewsSlider: Boolean(web?.embeddedReviews?.form)
  })[code]);
}

function createGroupId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return `grupo-${globalThis.crypto.randomUUID()}`;
  return `grupo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function DirectoryStructureManager({ businessId, pageId, sections = [], web = null, presentationFallback = null, onReload, onEditModule }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const orderedSections = [...sections].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const sectionById = new Map(orderedSections.map(section => [Number(section.id), section]));
  const moduleSettings = getDirectoryModuleSettings(web?.page?.global_styles || {});
  const groups = getDirectorySectionGroups(web?.page?.global_styles || {}).map(group => ({
    ...group,
    sectionIds: group.sectionIds.filter(sectionId => sectionById.has(Number(sectionId)) && isDirectorySectionGroupable(sectionById.get(Number(sectionId))))
  }));
  const groupById = new Map(groups.map(group => [group.id, group]));
  const groupBySection = new Map();
  groups.forEach(group => group.sectionIds.forEach(sectionId => groupBySection.set(Number(sectionId), group.id)));
  const moduleCodes = availableModuleCodes(web).sort((a, b) => Number(moduleSettings[a]?.sortOrder || 0) - Number(moduleSettings[b]?.sortOrder || 0));

  const insertedGroups = new Set();
  const baseItems = [];
  orderedSections.forEach(section => {
    const groupId = groupBySection.get(Number(section.id));
    if (!groupId) baseItems.push({ key: `section:${section.id}`, type: "section", section });
    else if (!insertedGroups.has(groupId)) {
      insertedGroups.add(groupId);
      baseItems.push({ key: `group:${groupId}`, type: "group", group: groupById.get(groupId) });
    }
  });
  groups.filter(group => !insertedGroups.has(group.id)).forEach(group => baseItems.push({ key: `group:${group.id}`, type: "group", group }));
  moduleCodes.forEach(code => baseItems.push({ key: `module:${code}`, type: "module", code }));

  const storedOrder = Array.isArray(web?.page?.global_styles?.directoryLayoutOrder) ? web.page.global_styles.directoryLayoutOrder : [];
  const rank = new Map(storedOrder.map((key, index) => [key, index]));
  const items = storedOrder.length
    ? [...baseItems].sort((a, b) => (rank.has(a.key) ? rank.get(a.key) : storedOrder.length + baseItems.indexOf(a)) - (rank.has(b.key) ? rank.get(b.key) : storedOrder.length + baseItems.indexOf(b)))
    : baseItems;

  async function post(url, body) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, pageId, ...body }) });
    const result = await responsePayload(response);
    if (!response.ok) throw new Error(result.error || "No se pudo completar la operación");
    return result;
  }

  async function run(action, success) {
    setBusy(true);
    try {
      await action();
      await onReload();
      if (success) await showAlert({ title: success, icon: "success", timer: 1100 });
      return true;
    } catch (error) {
      await showAlert({ title: "No se pudo completar", text: error.message, icon: "error" });
      return false;
    } finally { setBusy(false); }
  }

  function saveStructure(nextGroups, layoutOrder, success) {
    return run(() => post("/api/directory/client/modules", { modules: moduleSettings, sectionGroups: nextGroups, layoutOrder }), success);
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    saveStructure(groups, next.map(item => item.key));
  }

  function startGroup() {
    setEditingGroup({
      id: createGroupId(), title: "", eyebrow: "", description: "", imageUrl: "", imageAlt: "",
      layout: "cards", enabled: true, sectionIds: [], isNew: true
    });
  }

  async function saveGroup(group) {
    const isNew = Boolean(group.isNew);
    const cleanGroup = { ...group };
    delete cleanGroup.isNew;
    const previous = groups.find(item => item.id === cleanGroup.id);
    const nextGroups = isNew ? [...groups, cleanGroup] : groups.map(item => item.id === cleanGroup.id ? cleanGroup : item);
    const selectedKeys = new Set(cleanGroup.sectionIds.map(sectionId => `section:${sectionId}`));
    let nextOrder = items.map(item => item.key);

    if (isNew) {
      const selectedPositions = nextOrder.map((key, index) => selectedKeys.has(key) ? index : -1).filter(index => index >= 0);
      const insertionBefore = selectedPositions.length ? Math.min(...selectedPositions) : nextOrder.length;
      const insertionIndex = nextOrder.slice(0, insertionBefore).filter(key => !selectedKeys.has(key)).length;
      nextOrder = nextOrder.filter(key => !selectedKeys.has(key));
      nextOrder.splice(insertionIndex, 0, `group:${cleanGroup.id}`);
    } else {
      nextOrder = nextOrder.filter(key => !selectedKeys.has(key));
      const assignedAfterSave = new Set(nextGroups.flatMap(item => item.sectionIds));
      const releasedIds = (previous?.sectionIds || []).filter(sectionId => !assignedAfterSave.has(sectionId));
      const groupIndex = nextOrder.indexOf(`group:${cleanGroup.id}`);
      if (releasedIds.length) nextOrder.splice(groupIndex >= 0 ? groupIndex + 1 : nextOrder.length, 0, ...releasedIds.map(sectionId => `section:${sectionId}`));
    }
    nextGroups.forEach(item => { if (!nextOrder.includes(`group:${item.id}`)) nextOrder.push(`group:${item.id}`); });

    const saved = await saveStructure(nextGroups, nextOrder, isNew ? "Grupo creado" : "Grupo actualizado");
    if (saved) setEditingGroup(null);
    return saved;
  }

  function toggleGroup(group) {
    const nextGroups = groups.map(item => item.id === group.id ? { ...item, enabled: item.enabled === false } : item);
    saveStructure(nextGroups, items.map(item => item.key));
  }

  async function removeGroup(group) {
    const confirmed = await showAlert({
      title: "¿Desarmar este grupo?",
      text: "Las secciones no se eliminarán: volverán a mostrarse como bloques independientes.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Desarmar grupo",
      cancelButtonText: "Cancelar"
    });
    if (!confirmed) return;
    const nextGroups = groups.filter(item => item.id !== group.id);
    const groupKey = `group:${group.id}`;
    const nextOrder = items.map(item => item.key);
    const groupIndex = nextOrder.indexOf(groupKey);
    if (groupIndex >= 0) nextOrder.splice(groupIndex, 1, ...group.sectionIds.map(sectionId => `section:${sectionId}`));
    await saveStructure(nextGroups, nextOrder, "Grupo desarmado");
  }

  function add() { run(async () => { const created = await post("/api/qr-page/sections/create", { type: "content", title: "Nueva sección", settings_json: { directoryBaseSlot: "web" }, styles_json: {} }); await post("/api/qr-page/blocks/create", { sectionId: created.sectionId, type: "web_section", content_json: { eyebrow: "", title: "Nueva sección", subtitle: "", highlightedText: "", paragraphs: ["Escribí aquí el contenido de esta sección."], images: [], imageLayout: "grid" }, styles_json: { alignment: "left" } }); }, "Sección creada"); }
  function addBenefits() { if (orderedSections.some(section => kindOf(section) === "benefits")) return showAlert({ title: "Beneficios ya existe", text: "Editá la sección existente en la lista.", icon: "info" }); run(async () => { const created = await post("/api/qr-page/sections/create", { type: "content", title: "Beneficios", settings_json: { directoryBaseSlot: "benefits" }, styles_json: {} }); await post("/api/qr-page/blocks/create", { sectionId: created.sectionId, type: "benefits", content_json: { eyebrow: "BENEFICIOS", title: "Beneficios para vos", subtitle: "Promociones vigentes de este negocio" }, styles_json: { alignment: "left" } }); }, "Sección de beneficios creada"); }
  function addLoyalty() { if (orderedSections.some(section => kindOf(section) === "loyalty")) return showAlert({ title: "Fidelización ya existe", text: "Editá la sección existente en la lista.", icon: "info" }); run(async () => { const response = await fetch(`/api/loyalty/admin/program?business_id=${businessId}`); const status = await responsePayload(response); if (!response.ok || !status.program || status.program.status !== "active") throw new Error("Primero configurá y activá el programa de fidelización del negocio."); const created = await post("/api/qr-page/sections/create", { type: "content", title: "Fidelización", settings_json: { directoryBaseSlot: "loyalty" }, styles_json: {} }); await post("/api/qr-page/blocks/create", { sectionId: created.sectionId, type: "loyalty_program", content_json: { eyebrow: "PROGRAMA DE FIDELIZACIÓN", title: status.program.name, subtitle: status.program.description || "Sumate y accedé a recompensas por elegirnos.", joinLabel: "Quiero participar", memberLabel: "Ver mi progreso", rewardLimit: 3 }, styles_json: { alignment: "left" } }); }, "Sección de fidelización creada"); }
  function toggleSection(section) { run(() => post("/api/qr-page/sections/update", { sectionId: section.id, type: section.type, title: section.title, is_visible: Number(section.is_visible) ? 0 : 1, settings_json: section.settings_json || {}, styles_json: section.styles_json || {} })); }
  function toggleModule(code) { run(() => post("/api/directory/client/modules", { modules: { ...moduleSettings, [code]: { ...moduleSettings[code], enabled: !moduleSettings[code].enabled } }, sectionGroups: groups, layoutOrder: items.map(item => item.key) })); }
  async function remove(section) { if (!["web", "benefits", "loyalty"].includes(kindOf(section))) return; const confirmed = await showAlert({ title: "¿Eliminar esta sección?", text: "Se eliminará el bloque de la Web, no el programa ni sus movimientos.", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar", cancelButtonText: "Cancelar" }); if (confirmed) run(() => post("/api/qr-page/sections/delete", { sectionId: section.id }), "Sección eliminada"); }

  return <div className="tags_directory_structure">
    {busy && <div className="tags_directory_structure_busy"><TagsSpinner /></div>}
    <header><div><h2>Estructura de la Web</h2><p>Ordená en una sola lista el contenido, los grupos y los módulos contratados.</p></div><div><button type="button" onClick={add}><FaPlus /> Agregar sección</button><button type="button" onClick={startGroup}><FaLayerGroup /> Agregar grupo</button><button type="button" onClick={addBenefits}><FaTag /> Agregar beneficios</button><button type="button" onClick={addLoyalty}><FaAward /> Agregar fidelización</button></div></header>
    <div className="tags_directory_structure_list">{items.map((item, index) => {
      if (item.type === "module") {
        const [Icon, label, description] = MODULE_META[item.code];
        const visible = moduleSettings[item.code]?.enabled !== false;
        return <article className={`is_module ${visible ? "" : "is_hidden"}`} key={item.key}><div className="tags_directory_structure_identity"><span><Icon /></span><div><small>Módulo funcional</small><h3>{label}</h3><p>{description}</p></div></div><div className="tags_directory_structure_actions"><button type="button" onClick={() => move(index, -1)} disabled={index === 0}><FaArrowUp /><span>Subir</span></button><button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1}><FaArrowDown /><span>Bajar</span></button><button type="button" onClick={() => onEditModule?.(item.code)}><FaPen /><span>Configurar</span></button><button type="button" onClick={() => toggleModule(item.code)}>{visible ? <FaEye /> : <FaEyeSlash />}<span>{visible ? "Visible" : "Oculto"}</span></button></div></article>;
      }
      if (item.type === "group") {
        const group = item.group;
        return <article className={`is_group ${group.enabled !== false ? "" : "is_hidden"}`} key={item.key}>
          <div className="tags_directory_structure_group_content"><div className="tags_directory_structure_identity"><span><FaLayerGroup /></span><div><small>Grupo de secciones</small><h3>{group.title}</h3><p>{group.sectionIds.length} {group.sectionIds.length === 1 ? "sección incluida" : "secciones incluidas"} · {group.layout === "accordion" ? "Acordeón" : "Tarjetas"}</p></div></div><div className="tags_directory_structure_group_children">{group.sectionIds.map(sectionId => { const section = sectionById.get(Number(sectionId)); return section ? <button type="button" onClick={() => setEditing(section)} key={sectionId}><span>{section.title || "Sección sin título"}</span><FaPen /></button> : null; })}</div></div>
          <div className="tags_directory_structure_actions"><button type="button" onClick={() => move(index, -1)} disabled={index === 0}><FaArrowUp /><span>Subir</span></button><button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1}><FaArrowDown /><span>Bajar</span></button><button type="button" onClick={() => setEditingGroup(group)}><FaPen /><span>Configurar</span></button><button type="button" onClick={() => toggleGroup(group)}>{group.enabled !== false ? <FaEye /> : <FaEyeSlash />}<span>{group.enabled !== false ? "Visible" : "Oculto"}</span></button><button type="button" className="danger" onClick={() => removeGroup(group)}><FaTrash /><span>Desarmar</span></button></div>
        </article>;
      }
      const section = item.section, kind = kindOf(section), [Icon, label, description] = META[kind] || META.web;
      return <article className={Number(section.is_visible) ? "" : "is_hidden"} key={item.key}><div className="tags_directory_structure_identity"><span><Icon /></span><div><small>{label}</small><h3>{section.title || label}</h3><p>{description}</p></div></div><div className="tags_directory_structure_actions"><button type="button" onClick={() => move(index, -1)} disabled={index === 0}><FaArrowUp /><span>Subir</span></button><button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1}><FaArrowDown /><span>Bajar</span></button><button type="button" onClick={() => setEditing(section)}><FaPen /><span>Editar</span></button><button type="button" onClick={() => toggleSection(section)}>{Number(section.is_visible) ? <FaEye /> : <FaEyeSlash />}<span>{Number(section.is_visible) ? "Visible" : "Oculto"}</span></button>{["web", "benefits", "loyalty"].includes(kind) && <button type="button" className="danger" onClick={() => remove(section)}><FaTrash /><span>Eliminar</span></button>}</div></article>;
    })}</div>
    {editing && <DirectorySectionEditor businessId={businessId} pageId={pageId} section={editing} presentationFallback={presentationFallback} onClose={() => setEditing(null)} onSaved={onReload} />}
    {editingGroup && <DirectorySectionGroupEditor businessId={businessId} pageId={pageId} group={editingGroup} groups={groups} sections={orderedSections} onClose={() => setEditingGroup(null)} onSave={saveGroup} />}
  </div>;
}
