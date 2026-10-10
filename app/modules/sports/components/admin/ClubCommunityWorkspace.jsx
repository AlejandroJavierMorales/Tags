"use client";
import {useEffect,useState} from "react";
import ClubCommunityAdmin from "./ClubCommunityAdmin";

export default function ClubCommunityWorkspace({businessId,turnosId}){
    const [disciplines,setDisciplines]=useState([]);
    useEffect(()=>{
        const controller=new AbortController();
        fetch(`/api/sports/admin/settings?businessId=${businessId}&turnosId=${turnosId}`,{cache:"no-store",signal:controller.signal})
            .then(response=>response.json())
            .then(payload=>setDisciplines(payload.disciplines||[]))
            .catch(()=>{});
        return()=>controller.abort();
    },[businessId,turnosId]);
    return <ClubCommunityAdmin businessId={businessId} turnosId={turnosId} disciplines={disciplines}/>;
}
