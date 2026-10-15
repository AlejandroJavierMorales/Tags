"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaArrowRight, FaGraduationCap } from "react-icons/fa6";
import "./BusinessTutorialShortcut.css";

export default function BusinessTutorialShortcut({ businessId }) {
  const [total,setTotal]=useState(0);
  useEffect(()=>{let active=true;fetch(`/api/business/tutorials?businessId=${businessId}`,{cache:"no-store"}).then(response=>response.ok?response.json():null).then(payload=>{if(active)setTotal(Number(payload?.total||0));}).catch(()=>null);return()=>{active=false;};},[businessId]);
  if(!total)return null;
  return <section className="tags_business_tutorial_shortcut"><div><FaGraduationCap/><span><small>AYUDA Y CAPACITACIÓN</small><strong>Tutoriales de la plataforma</strong><p>{total} video{total===1?"":"s"} disponible{total===1?"":"s"}, ordenados por producto.</p></span></div><Link href={`/dashboard/businesses/${businessId}/tutoriales`}>Ver tutoriales <FaArrowRight/></Link></section>;
}
