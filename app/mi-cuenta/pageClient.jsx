"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FaArrowRight, FaCalendarDays, FaGift, FaHeart, FaIdCard, FaLocationDot, FaPen, FaPhone, FaUser, FaXmark } from "react-icons/fa6";
import ProfileImageUploader from "@/app/modules/users/components/ProfileImageUploader";
import showAlert from "@/app/components/showAlert";
import "./my-account.css";

const EMPTY_FORM = { first_name:"",last_name:"",display_name:"",phone:"",whatsapp:"",document_type:"",document_number:"",birth_date:"",gender:"",nationality:"",address:"",locality:"",province:"",country:"" };
const pending = value => String(value || "").trim() || "Falta completar";

function ProfileValue({ icon: Icon, label, value, wide = false }) {
    const missing = !String(value || "").trim();
    return <div className={`tags_my_account_profile_value${wide ? " is_wide" : ""}${missing ? " is_pending" : ""}`}><Icon/><div><small>{label}</small><span>{pending(value)}</span></div></div>;
}

export default function MyAccountPageClient({ channel = null }) {
    const brand = channel?.brandConfig || {};
    const brandName = brand.displayName || channel?.name || "Tags";
    const brandLogo = brand.logoUrl || brand.logo_url || (channel?.code === "calamuchitar" ? "/directory/calamuchitar/LogoCalamuchitar.webp" : "/logo_tags_transparente.webp");
    const slogan = brand.slogan || (channel?.code === "calamuchitar" ? "La Plataforma Comercial de Calamuchita" : "Plataforma de Experiencias Digitales Inteligentes");
    const primaryColor = brand.primaryColor || "#0fb957";
    const [user,setUser] = useState(null), [loyalty,setLoyalty] = useState(null), [error,setError] = useState("");
    const [editing,setEditing] = useState(false), [saving,setSaving] = useState(false), [form,setForm] = useState(EMPTY_FORM);

    async function load() {
        try {
            const [userResponse, loyaltyResponse] = await Promise.all([
                fetch("/api/users/me",{cache:"no-store"}),
                fetch("/api/loyalty/member/summary",{cache:"no-store"}).catch(()=>null)
            ]);
            const userPayload = await userResponse.json().catch(()=>({}));
            const loyaltyPayload = loyaltyResponse ? await loyaltyResponse.json().catch(()=>null) : null;
            if (!userResponse.ok || !userPayload?.success) throw new Error(userPayload?.error || "No se pudo cargar tu cuenta");
            setUser(userPayload.user);
            if (loyaltyPayload?.success) setLoyalty(loyaltyPayload);
        } catch (currentError) { setError(currentError.message || "No se pudo cargar tu cuenta"); }
    }
    useEffect(()=>{ load(); },[]);

    const completion = useMemo(()=>{
        if(!user) return 0;
        const values=[user.first_name,user.last_name,user.phone||user.whatsapp,user.document_number,user.birth_date,user.address,user.locality,user.province,user.country,user.profile_image_url];
        return Math.round(values.filter(value=>String(value||"").trim()).length/values.length*100);
    },[user]);

    function openEditor(){
        setForm(Object.fromEntries(Object.keys(EMPTY_FORM).map(key=>[key,user?.[key]==null?"":String(user[key]).slice(0,key==="birth_date"?10:undefined)])));
        setEditing(true);
    }
    async function saveProfile(event){
        event.preventDefault(); setSaving(true);
        try{
            const response=await fetch("/api/users/me",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
            const payload=await response.json().catch(()=>({}));
            if(!response.ok) throw new Error(payload.error||"No se pudo guardar el perfil");
            await load(); setEditing(false);
            await showAlert({title:"Perfil actualizado",text:"Tus datos se guardaron correctamente.",icon:"success",timer:1600});
        }catch(currentError){await showAlert({title:"No se pudo guardar",text:currentError.message,icon:"error"});}finally{setSaving(false);}
    }

    if(error) return <main className="tags_my_account_page"><div className="alert alert-danger">{error}</div></main>;
    if(!user) return <main className="tags_my_account_page"><div className="tags_my_account_loading">Cargando tu cuenta...</div></main>;
    const hasLoyalty=Boolean(loyalty?.programs?.length||loyalty?.networkBenefits?.length);
    const fullName=`${user.first_name||""} ${user.last_name||""}`.trim()||"Usuario";

    return <main className="tags_my_account_page" style={{"--tags-account-primary":primaryColor}}>
        <header className="tags_my_account_header"><div className="tags_my_account_brand"><Image src={brandLogo} alt={brandName} width={160} height={90} priority/><span>{slogan}</span></div><a href="/logout" className="tags_my_account_logout">Cerrar sesión</a></header>
        <section className="tags_my_account_intro"><div><p>MI CUENTA</p><h1>Hola, {user.first_name||"bienvenido"}</h1><span>Este es tu espacio personal dentro de {brandName}.</span></div><div className="tags_my_account_completion"><strong>{completion}%</strong><span>Perfil completo</span><i><b style={{width:`${completion}%`}}/></i></div></section>

        <section className="tags_my_account_profile_card">
            <div className="tags_my_account_profile_identity"><div className="tags_my_account_avatar">{user.profile_image_url?<img src={user.profile_image_url} alt={fullName}/>:<FaUser/>}</div><div><small>PERFIL PERSONAL</small><h2>{fullName}</h2><a href={`mailto:${user.email}`}>{user.email}</a></div><button type="button" onClick={openEditor}><FaPen/><span>Editar perfil</span></button></div>
            <div className="tags_my_account_profile_data"><ProfileValue icon={FaPhone} label="Teléfono" value={user.phone}/><ProfileValue icon={FaPhone} label="WhatsApp" value={user.whatsapp}/><ProfileValue icon={FaIdCard} label="Documento" value={[user.document_type,user.document_number].filter(Boolean).join(" ")}/><ProfileValue icon={FaCalendarDays} label="Fecha de nacimiento" value={user.birth_date?new Date(`${String(user.birth_date).slice(0,10)}T12:00:00`).toLocaleDateString("es-AR"):""}/><ProfileValue icon={FaUser} label="Género" value={user.gender}/><ProfileValue icon={FaLocationDot} label="Nacionalidad" value={user.nationality}/><ProfileValue icon={FaLocationDot} label="Domicilio" value={user.address} wide/><ProfileValue icon={FaLocationDot} label="Localidad / Provincia / País" value={[user.locality,user.province,user.country].filter(Boolean).join(", ")} wide/></div>
        </section>

        <section className="tags_my_account_tools"><header><div><small>MIS HERRAMIENTAS</small><h2>Todo lo que tenés disponible</h2></div><p>Accedé rápidamente a cada espacio desde acá.</p></header><div className="tags_my_account_tools_grid">
            {hasLoyalty&&<a href="/fidelizacion" className="tags_my_account_tool is_available"><i><FaGift/></i><span><strong>Fidelización y beneficios</strong><small>Beneficios, puntos y recompensas disponibles.</small></span><FaArrowRight/></a>}
            <article className="tags_my_account_tool is_coming"><i><FaHeart/></i><span><strong>Mis favoritos</strong><small>Próximamente vas a poder guardar tus lugares preferidos.</small></span><em>Próximamente</em></article>
            {!hasLoyalty&&<div className="tags_my_account_tools_empty"><FaGift/><p>Cuando tengas nuevas herramientas habilitadas, aparecerán en este espacio.</p></div>}
        </div></section>

        {editing&&<div className="tags_my_account_modal_backdrop" onMouseDown={()=>!saving&&setEditing(false)}><section className="tags_my_account_modal" onMouseDown={event=>event.stopPropagation()}><header><div><small>MI CUENTA</small><h2>Editar perfil</h2></div><button type="button" aria-label="Cerrar" onClick={()=>setEditing(false)}><FaXmark/></button></header><form onSubmit={saveProfile}>
            <div className="tags_my_account_modal_avatar"><div className="tags_my_account_avatar">{user.profile_image_url?<img src={user.profile_image_url} alt={fullName}/>:<FaUser/>}</div><div><strong>Imagen de perfil</strong><small>Cuadrada, 750 × 750 px. Máximo 2 MB.</small><ProfileImageUploader userId={user.id} value={user.profile_image_url} onChange={url=>setUser(current=>({...current,profile_image_url:url}))}/></div></div>
            <div className="tags_my_account_form_grid">
                <label>Nombre<input required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Apellido<input required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label><label>Nombre para mostrar<input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/></label><label>Teléfono<input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>WhatsApp<input type="tel" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></label><label>Tipo de documento<select value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})}><option value="">Seleccionar</option><option value="DNI">DNI</option><option value="Pasaporte">Pasaporte</option><option value="Otro">Otro</option></select></label><label>Número de documento<input value={form.document_number} onChange={e=>setForm({...form,document_number:e.target.value})}/></label><label>Fecha de nacimiento<input type="date" value={form.birth_date} onChange={e=>setForm({...form,birth_date:e.target.value})}/></label><label>Género<input value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}/></label><label>Nacionalidad<input value={form.nationality} onChange={e=>setForm({...form,nationality:e.target.value})}/></label><label className="is_wide">Domicilio<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Localidad<input value={form.locality} onChange={e=>setForm({...form,locality:e.target.value})}/></label><label>Provincia<input value={form.province} onChange={e=>setForm({...form,province:e.target.value})}/></label><label>País<input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label>
            </div><footer><button type="button" onClick={()=>setEditing(false)} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving?"Guardando...":"Guardar cambios"}</button></footer>
        </form></section></div>}
    </main>;
}
