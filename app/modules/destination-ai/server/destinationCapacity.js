function normalize(value){return String(value||"").toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
const NUMBER_WORDS={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20};
const CAPACITY_VALUE="(\\d{1,3}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte)";

function capacities(value){
  const text=normalize(value),found=[];
  const patterns=[
    new RegExp(`\\b(?:para|somos|hasta|capacidad(?:\\s+para)?|alojamiento\\s+para)\\s*${CAPACITY_VALUE}\\s*(?:persona|personas|pasajero|pasajeros|huesped|huespedes)?\\b`,"gu"),
    new RegExp(`\\b${CAPACITY_VALUE}\\s+(?:persona|personas|pasajero|pasajeros|huesped|huespedes|plazas)\\b`,"gu"),
  ];
  for(const pattern of patterns)for(const match of text.matchAll(pattern)){const number=Number(match[1])||NUMBER_WORDS[match[1]]||0;if(number>0&&number<=200)found.push(number);}
  return found;
}

export function extractRequestedCapacity(value){const found=capacities(Array.isArray(value)?value.join(" "):value);return found[0]||null;}
export function extractPublishedCapacity(value){const found=capacities(Array.isArray(value)?value.join(" "):value);return found.length?Math.max(...found):null;}
