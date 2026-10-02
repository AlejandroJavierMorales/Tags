import { deflateRawSync, inflateRawSync } from "node:zlib";

function crcTable(){const table=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;}
const CRC_TABLE=crcTable();
function crc32(buffer){let crc=0xffffffff;for(const byte of buffer)crc=CRC_TABLE[(crc^byte)&0xff]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function escapeXml(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function decodeXml(value){return String(value||"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");}
function columnName(index){let value=index+1,out="";while(value){const rest=(value-1)%26;out=String.fromCharCode(65+rest)+out;value=Math.floor((value-1)/26);}return out;}
function columnIndex(reference){const letters=String(reference||"").match(/^[A-Z]+/i)?.[0]?.toUpperCase()||"A";let value=0;for(const letter of letters)value=value*26+letter.charCodeAt(0)-64;return value-1;}

function zip(entries){
  const local=[];const central=[];let offset=0;
  for(const entry of entries){const name=Buffer.from(entry.name);const source=Buffer.isBuffer(entry.data)?entry.data:Buffer.from(entry.data);const compressed=deflateRawSync(source);const crc=crc32(source);const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x0800,6);header.writeUInt16LE(8,8);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(source.length,22);header.writeUInt16LE(name.length,26);local.push(header,name,compressed);
    const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50,0);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x0800,8);record.writeUInt16LE(8,10);record.writeUInt32LE(crc,16);record.writeUInt32LE(compressed.length,20);record.writeUInt32LE(source.length,24);record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);central.push(record,name);offset+=header.length+name.length+compressed.length;
  }
  const centralBuffer=Buffer.concat(central);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(centralBuffer.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,centralBuffer,end]);
}

const XLSX_STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FF1F5133"/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F6B45"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function renderSheet(sheet){
  const rows=sheet.rows||[];const maxColumns=Math.max(1,...rows.map(row=>row.length));
  const widths=(sheet.widths||[]).map((width,index)=>`<col min="${index+1}" max="${index+1}" width="${Math.max(8,Math.min(80,Number(width)||18))}" customWidth="1"/>`).join("");
  const sheetRows=rows.map((row,rowIndex)=>`<row r="${rowIndex+1}"${rowIndex===0&&sheet.header?" ht=\"30\" customHeight=\"1\"":""}>${Array.from({length:maxColumns},(_,columnIndexValue)=>{const value=row[columnIndexValue]??"";const style=rowIndex===0&&sheet.header?1:rowIndex===0&&sheet.title?3:2;return `<c r="${columnName(columnIndexValue)}${rowIndex+1}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;}).join("")}</row>`).join("");
  const freeze=sheet.freezeHeader?'<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>':'<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  const filter=sheet.header&&rows[0]?.length?`<autoFilter ref="A1:${columnName(rows[0].length-1)}${Math.max(1,rows.length)}"/>`:"";
  const validations=(sheet.validations||[]).map(validation=>{const column=columnName(Math.max(0,Number(validation.column||1)-1));const from=Math.max(2,Number(validation.fromRow||2));const to=Math.max(from,Number(validation.toRow||1000));const values=(validation.values||[]).map(value=>String(value).replace(/"/g,'""')).join(",");const formula=validation.formula?escapeXml(validation.formula):`"${escapeXml(values)}"`;return `<dataValidation type="list" allowBlank="${validation.allowBlank===false?0:1}" showInputMessage="1" showErrorMessage="1" errorStyle="stop" promptTitle="Elegí una opción" prompt="Seleccioná una opción de la lista." errorTitle="Valor no válido" error="Elegí una opción de la lista desplegable." sqref="${column}${from}:${column}${to}"><formula1>${formula}</formula1></dataValidation>`;}).join("");
  const dataValidations=validations?`<dataValidations count="${(sheet.validations||[]).length}">${validations}</dataValidations>`:"";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${widths?`<cols>${widths}</cols>`:""}<sheetData>${sheetRows}</sheetData>${filter}${dataValidations}</worksheet>`;
}

export function createSimpleWorkbookXlsx(sheets){
  const normalized=(sheets||[]).filter(Boolean).map((sheet,index)=>({...sheet,name:String(sheet.name||`Hoja ${index+1}`).slice(0,31)}));
  if(!normalized.length)throw new Error("El libro XLSX necesita al menos una hoja");
  const worksheetTypes=normalized.map((_,index)=>`<Override PartName="/xl/worksheets/sheet${index+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const workbookSheets=normalized.map((sheet,index)=>`<sheet name="${escapeXml(sheet.name)}" sheetId="${index+1}" r:id="rId${index+1}"/>`).join("");
  const worksheetRelationships=normalized.map((_,index)=>`<Relationship Id="rId${index+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index+1}.xml"/>`).join("");
  const files=[
    {name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${worksheetTypes}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`},
    {name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${worksheetRelationships}<Relationship Id="rId${normalized.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:"xl/styles.xml",data:XLSX_STYLES},
    ...normalized.map((sheet,index)=>({name:`xl/worksheets/sheet${index+1}.xml`,data:renderSheet(sheet)})),
  ];
  return zip(files);
}

export function createSimpleXlsx(headers,sampleRows=[]){
  return createSimpleWorkbookXlsx([{name:"contenidos",rows:[headers,...sampleRows],header:true,freezeHeader:true}]);
}

function unzip(buffer){
  let end=-1;for(let index=buffer.length-22;index>=Math.max(0,buffer.length-65557);index--){if(buffer.readUInt32LE(index)===0x06054b50){end=index;break;}}
  if(end<0)throw new Error("El archivo no es un XLSX válido");
  const total=buffer.readUInt16LE(end+10);let cursor=buffer.readUInt32LE(end+16);const files=new Map();
  for(let index=0;index<total;index++){if(buffer.readUInt32LE(cursor)!==0x02014b50)throw new Error("Directorio XLSX inválido");const method=buffer.readUInt16LE(cursor+10);const size=buffer.readUInt32LE(cursor+20);const nameLength=buffer.readUInt16LE(cursor+28);const extraLength=buffer.readUInt16LE(cursor+30);const commentLength=buffer.readUInt16LE(cursor+32);const localOffset=buffer.readUInt32LE(cursor+42);const name=buffer.subarray(cursor+46,cursor+46+nameLength).toString("utf8");const localNameLength=buffer.readUInt16LE(localOffset+26);const localExtraLength=buffer.readUInt16LE(localOffset+28);const start=localOffset+30+localNameLength+localExtraLength;const packed=buffer.subarray(start,start+size);files.set(name,method===8?inflateRawSync(packed):Buffer.from(packed));cursor+=46+nameLength+extraLength+commentLength;}
  return files;
}

function sharedStrings(files){
  const xml=files.get("xl/sharedStrings.xml")?.toString("utf8")||"";
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map(match=>decodeXml([...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(item=>item[1]).join("")));
}

function worksheetRows(xml,shared){
  const rows=[];
  for(const rowMatch of String(xml||"").matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
    const row=[];
    for(const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
      const attributes=cell[1];const reference=attributes.match(/\br="([A-Z]+\d+)"/)?.[1]||"A1";const type=attributes.match(/\bt="([^"]+)"/)?.[1]||"";let value="";
      if(type==="inlineStr")value=[...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(item=>decodeXml(item[1])).join("");
      else{const raw=cell[2].match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1]||"";value=type==="s"?shared[Number(raw)]||"":decodeXml(raw);}
      row[columnIndex(reference)]=value;
    }
    rows.push(row);
  }
  return rows;
}

function recordsFromRows(rows){
  if(!rows.length)return[];
  const headers=rows[0].map(value=>String(value||"").trim());
  return rows.slice(1).filter(row=>row.some(value=>String(value||"").trim())).map(row=>Object.fromEntries(headers.map((header,index)=>[header,String(row[index]??"").trim()])));
}

function worksheetPath(target){
  const clean=String(target||"").replace(/\\/g,"/").replace(/^\//,"");
  if(clean.startsWith("xl/"))return clean;
  const parts=[];
  for(const part of `xl/${clean}`.split("/")){if(part==="..")parts.pop();else if(part!==".")parts.push(part);}
  return parts.join("/");
}

export function parseSimpleWorkbookXlsx(buffer){
  const files=unzip(buffer);const shared=sharedStrings(files);const workbook=files.get("xl/workbook.xml")?.toString("utf8")||"";const relationships=files.get("xl/_rels/workbook.xml.rels")?.toString("utf8")||"";
  const targets=new Map([...relationships.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)].map(match=>{const attributes=match[1];return[decodeXml(attributes.match(/\bId="([^"]+)"/)?.[1]||""),decodeXml(attributes.match(/\bTarget="([^"]+)"/)?.[1]||"")];}));
  const sheets=[];
  for(const match of workbook.matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)){
    const attributes=match[1];const name=decodeXml(attributes.match(/\bname="([^"]+)"/)?.[1]||`Hoja ${sheets.length+1}`);const relationId=attributes.match(/\br:id="([^"]+)"/)?.[1]||"";const target=targets.get(relationId);if(!target)continue;const xml=files.get(worksheetPath(target))?.toString("utf8");if(!xml)continue;const rows=worksheetRows(xml,shared);sheets.push({name,rows,records:recordsFromRows(rows)});
  }
  if(!sheets.length){const xml=files.get("xl/worksheets/sheet1.xml")?.toString("utf8");if(!xml)throw new Error("El XLSX no contiene hojas legibles");const rows=worksheetRows(xml,shared);sheets.push({name:"Hoja 1",rows,records:recordsFromRows(rows)});}
  return{ sheets };
}

export function parseSimpleXlsx(buffer){
  return parseSimpleWorkbookXlsx(buffer).sheets[0]?.records||[];
}
