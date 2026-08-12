"use client";
import { useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import "./GuestExperienceOccupancyGrid.css";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const COLORS = ["#377d63","#8461a8","#c56c38","#3978ad","#b04f64","#708237","#8a633f","#3e8991"];
const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const localDate = value => { const [year,month,day] = String(value||"").slice(0,10).split("-").map(Number); return new Date(year,month-1,day,12); };
const addDays = (date, amount) => { const next = new Date(date); next.setDate(next.getDate()+amount); return next; };
const diffDays = (a,b) => Math.round((a-b)/86400000);
const configuredDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value||"")) ? localDate(value) : null;
const configuredDays = value => Math.min(120,Math.max(7,Number(value||30)));

export default function GuestExperienceOccupancyGrid({ units, stays, settings={}, onReservationClick, onAvailableClick, onRangeChange }) {
    const today = new Date(); today.setHours(12,0,0,0);
    const initialStart = settings.occupancyFixedPeriod && configuredDate(settings.occupancyStartDate) ? configuredDate(settings.occupancyStartDate) : today;
    const [start,setStart] = useState(initialStart), [daysCount,setDaysCount] = useState(configuredDays(settings.occupancyDays));
    const [unitId,setUnitId] = useState("all"), [month,setMonth] = useState(initialStart.getMonth()+1), [year,setYear] = useState(initialStart.getFullYear());
    const days = useMemo(() => Array.from({length:daysCount},(_,index)=>addDays(start,index)),[start,daysCount]);
    const monthGroups = useMemo(() => days.reduce((groups,day,index) => { const id=`${day.getFullYear()}-${day.getMonth()}`; const previous=groups[groups.length-1]; if(previous?.id===id) previous.count+=1; else groups.push({id,start:index,count:1,label:`${MONTHS[day.getMonth()]} ${day.getFullYear()}`}); return groups; },[]),[days]);
    const visibleUnits = unitId==="all" ? units : units.filter(unit=>Number(unit.id)===Number(unitId));
    const end = addDays(start,daysCount);
    useEffect(()=>{onRangeChange?.({start:key(start),end:key(end),days:daysCount})},[start,daysCount]);
    function go(date){const value=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);setStart(value);setMonth(value.getMonth()+1);setYear(value.getFullYear())}
    function jump(){go(new Date(Number(year),Number(month)-1,1,12))}
    return <section className="tags_guest_occupancy">
        <header><div><h3>Grilla de Ocupación</h3></div><div className="tags_guest_occupancy_views">
            <label>Unidad<select value={unitId} onChange={event=>setUnitId(event.target.value)}><option value="all">Todas las unidades</option>{units.map(unit=><option value={unit.id} key={unit.id}>{unit.name}</option>)}</select></label>
            <label>Período<select value={daysCount} onChange={event=>setDaysCount(Number(event.target.value))}>{[7,15,30,45,60,90,120].map(value=><option key={value} value={value}>{value} días</option>)}</select></label>
        </div></header>
        <div className="tags_guest_occupancy_navigation">
            <button type="button" onClick={()=>go(addDays(start,-daysCount))}><FaChevronLeft/><span>Anterior</span></button>
            <button type="button" onClick={()=>go(today)}>Hoy</button>
            <label>Mes<select value={month} onChange={event=>setMonth(Number(event.target.value))}>{MONTHS.map((name,index)=><option value={index+1} key={name}>{name}</option>)}</select></label>
            <label>Año<input type="number" min="2020" max="2100" value={year} onChange={event=>setYear(Number(event.target.value))}/></label>
            <button type="button" onClick={jump}>Ir</button>
            <button type="button" onClick={()=>go(addDays(start,daysCount))}><span>Siguiente</span><FaChevronRight/></button>
        </div>
        <div className="tags_guest_occupancy_scroll"><div className="tags_guest_occupancy_grid" style={{gridTemplateColumns:`var(--tags-guest-unit-column) repeat(${daysCount},minmax(42px,1fr))`,gridTemplateRows:`38px 52px repeat(${visibleUnits.length},64px)`}}>
            <div className="tags_guest_occupancy_corner">Unidad</div>
            {monthGroups.map(group=><div className="tags_guest_occupancy_month" style={{gridColumn:`${group.start+2}/span ${group.count}`,gridRow:1}} key={group.id}>{group.label}</div>)}
            {days.map((day,index)=><div className={`tags_guest_occupancy_day ${[0,6].includes(day.getDay())?"is_weekend":""} ${key(day)===key(today)?"is_today":""}`} style={{gridColumn:index+2,gridRow:2}} key={key(day)}><strong>{day.getDate()}</strong><small>{day.toLocaleDateString("es-AR",{weekday:"short"})}</small></div>)}
            {visibleUnits.map((unit,rowIndex)=>{const row=rowIndex+3,bookings=stays.filter(stay=>Number(stay.unit_id)===Number(unit.id)&&localDate(stay.starts_at)<end&&localDate(stay.ends_at)>start&&!['cancelled','checked_out'].includes(stay.status));return <div className="tags_guest_occupancy_row_contents" key={unit.id}>
                <div className="tags_guest_occupancy_unit" style={{gridColumn:1,gridRow:row}}><strong>{unit.name}</strong><small>{unit.code||`Unidad ${unit.id}`}</small></div>
                {days.map((day,index)=><button type="button" aria-label={`Reservar ${unit.name} el ${day.toLocaleDateString("es-AR")}`} className={`tags_guest_occupancy_cell ${[0,6].includes(day.getDay())?"is_weekend":""}`} style={{gridColumn:index+2,gridRow:row}} key={`${unit.id}-${key(day)}`} onClick={()=>onAvailableClick?.(unit,key(day))} onContextMenu={event=>{event.preventDefault();onAvailableClick?.(unit,key(day))}}/>)}
                {bookings.map(stay=>{const from=Math.max(0,diffDays(localDate(stay.starts_at),start)),to=Math.min(daysCount,diffDays(localDate(stay.ends_at),start));return <button type="button" className={`tags_guest_occupancy_booking status_${stay.status}`} style={{gridColumn:`${from+2}/${to+2}`,gridRow:row,background:COLORS[Number(stay.id)%COLORS.length]}} key={stay.id} onClick={()=>onReservationClick?.(stay)} title={`${stay.stay_code} · ${stay.guest_name}`}><strong>{stay.stay_code}</strong><span>{stay.guest_name} · {Number(stay.adults||0)+Number(stay.children||0)} pax</span></button>})}
            </div>})}
        </div></div>
    </section>;
}
