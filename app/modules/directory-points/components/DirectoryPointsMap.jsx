"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadDirectoryPointsGoogleMaps, validPointCoordinates } from "./directoryPointsMapUtils";
import "./DirectoryPointsMap.css";

export default function DirectoryPointsMap({ points = [], apiKey = "", mapId = "DEMO_MAP_ID", editablePosition = null, onPositionChange = null, onSelect = null, className = "" }) {
  const element = useRef(null);const [error,setError] = useState("");
  const validPoints = useMemo(() => points.filter(validPointCoordinates), [points]);

  useEffect(() => {
    if (!element.current || !apiKey) return;
    let cancelled = false;
    loadDirectoryPointsGoogleMaps(apiKey).then(async maps => {
      if (cancelled || !element.current) return;
      const markerLibrary = await maps.importLibrary("marker");
      const positions = validPoints.map(item => ({ lat:Number(item.latitude),lng:Number(item.longitude) }));
      if (validPointCoordinates(editablePosition)) positions.push({ lat:Number(editablePosition.latitude),lng:Number(editablePosition.longitude) });
      const center = positions[0] || { lat:-32.10,lng:-64.45 };
      const map = new maps.Map(element.current,{ center,zoom:positions.length ? 12 : 9,mapId,streetViewControl:false,mapTypeControl:false,fullscreenControl:true });
      const bounds = new maps.LatLngBounds(), info = new maps.InfoWindow();
      for (const item of validPoints) {
        const position = { lat:Number(item.latitude),lng:Number(item.longitude) };bounds.extend(position);
        const pin = document.createElement("button");pin.type="button";pin.className="tags_directory_point_map_pin";pin.style.setProperty("--point-color",item.color_hex||"#ef7d22");
        if (item.marker_icon_url) { const image=document.createElement("img");image.src=item.marker_icon_url;image.alt="";image.addEventListener("error",()=>{ image.remove();const fallback=document.createElement("span");fallback.textContent="QR";pin.appendChild(fallback); });pin.appendChild(image); } else { const fallback=document.createElement("span");fallback.textContent="QR";pin.appendChild(fallback); }
        const marker = new markerLibrary.AdvancedMarkerElement({ map,position,title:`${item.type_name||"Punto"} ${item.point_number||""}`,content:pin });
        marker.addListener("click",()=>{ const content=document.createElement("div"),strong=document.createElement("strong"),span=document.createElement("span");strong.textContent=`${item.type_name||"Punto"} ${item.point_number||""}`;span.textContent=[item.host_display_name||item.host_name,item.locality_name].filter(Boolean).join(" · ");content.className="tags_directory_point_map_popup";content.append(strong,span);info.setContent(content);info.open({map,anchor:marker});onSelect?.(item); });
      }
      if (validPointCoordinates(editablePosition)) {
        const position={lat:Number(editablePosition.latitude),lng:Number(editablePosition.longitude)};bounds.extend(position);
        const pin=document.createElement("div");pin.className="tags_directory_point_edit_pin";pin.textContent="+";
        const marker=new markerLibrary.AdvancedMarkerElement({map,position,title:"Ubicación del punto",content:pin,gmpDraggable:Boolean(onPositionChange)});
        if (onPositionChange) marker.addListener("dragend",event=>onPositionChange({latitude:event.latLng.lat(),longitude:event.latLng.lng(),source:"map"}));
      }
      if (onPositionChange) map.addListener("click",event=>onPositionChange({latitude:event.latLng.lat(),longitude:event.latLng.lng(),source:"map"}));
      if (!bounds.isEmpty()) map.fitBounds(bounds,60);
      setError("");
    }).catch(reason=>setError(reason?.message||"No se pudo mostrar el mapa."));
    return()=>{cancelled=true;};
  },[validPoints,apiKey,mapId,editablePosition,onPositionChange,onSelect]);

  if (!apiKey) return <div className="tags_directory_point_map_error">Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.</div>;
  return <div className={`tags_directory_points_map ${className}`}><div ref={element} className="tags_directory_points_map_canvas" />{error&&<p className="tags_directory_point_map_error">{error}</p>}</div>;
}
