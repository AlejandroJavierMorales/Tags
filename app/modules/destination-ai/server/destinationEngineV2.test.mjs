import assert from "node:assert/strict";
import { fallbackDestinationIntentV2, normalizeDestinationIntentV2 } from "./destinationIntentV2.js";
import { normalizeDestinationTerm, pruneAncestorTaxonomyIds, resolveTaxonomyTerms } from "./destinationTaxonomyCore.js";
import { rankDestinationCandidates } from "./destinationRankingCore.js";
import { createSimpleXlsx, parseSimpleXlsx } from "./simpleXlsx.js";
import { extractPublishedCapacity, extractRequestedCapacity } from "./destinationCapacity.js";

const taxonomy=[
  {id:1,parentId:null,name:"Gastronomía",slug:"gastronomia",depth:0,aliases:[]},
  {id:2,parentId:1,name:"Pizzerías",slug:"pizzerias",depth:1,aliases:["pizza"]},
  {id:5,parentId:1,name:"Restoranes",slug:"restoranes",depth:1,aliases:["merendar", "merienda"]},
  {id:3,parentId:null,name:"Ferreterías",slug:"ferreterias",depth:1,aliases:["ferretería"]},
  {id:4,parentId:null,name:"Alojamientos",slug:"alojamientos",depth:0,aliases:["hospedaje"]},
];

assert.equal(normalizeDestinationTerm("  Electrónica / TV  "),"electronica tv");
assert.deepEqual(resolveTaxonomyTerms(taxonomy,"quiero una pizzería"),[2]);
assert.deepEqual(resolveTaxonomyTerms(taxonomy,"busco hospedaje"),[4]);
assert.deepEqual(pruneAncestorTaxonomyIds(taxonomy,[1,5]),[5],"un rubro específico debe desplazar a su padre amplio");

const fallback=fallbackDestinationIntentV2({message:"Necesito una ferretería",taxonomyCatalog:taxonomy});
assert.equal(fallback.tasks[0].type,"find_business_category");
assert.deepEqual(fallback.tasks[0].taxonomyNodeIds,[3]);
assert.equal(fallbackDestinationIntentV2({message:"Busco una pizzería y también necesito una ferretería",taxonomyCatalog:taxonomy}).tasks.length,2,"el fallback también debe separar necesidades múltiples sin vocabulario de rubros en código");

const normalized=normalizeDestinationIntentV2({conversationalAction:"search",continuesPrevious:false,answerDirective:"",tasks:[
  {type:"find_product",query:"control remoto",subject:"control remoto",taxonomyNodeIds:[999,3],locality:"",localityPreference:"any",resultReferenceKeys:[],constraints:[],needsClarification:false},
  {type:"find_service",query:"electricista",subject:"electricista",taxonomyNodeIds:[3],locality:"Los Reartes",localityPreference:"specified",resultReferenceKeys:[],constraints:[],needsClarification:false}
]},fallback,taxonomy);
assert.equal(normalized.tasks.length,2,"debe conservar dos necesidades independientes");
assert.deepEqual(normalized.tasks[0].taxonomyNodeIds,[],"debe descartar tambiÃ©n un ID existente pero ajeno a la consulta");
assert.equal(normalized.tasks[1].locality,"Los Reartes");

const capacityFollowUp=normalizeDestinationIntentV2({conversationalAction:"follow_up",continuesPrevious:true,answerDirective:"",tasks:[
  {type:"other",query:"y para dos",subject:"para dos",taxonomyNodeIds:[],locality:"",localityPreference:"any",resultReferenceKeys:[],constraints:["2 personas"],needsClarification:false}
]},fallback,taxonomy,[{type:"find_business_category",query:"alojamiento en Villa Ciudad Parque",subject:"alojamiento",taxonomyNodeIds:[4],locality:"Villa Ciudad Parque",localityPreference:"specified",constraints:[]}]);
assert.equal(capacityFollowUp.tasks[0].type,"find_business_category");
assert.deepEqual(capacityFollowUp.tasks[0].taxonomyNodeIds,[4]);
assert.equal(capacityFollowUp.tasks[0].locality,"Villa Ciudad Parque");
assert.equal(extractRequestedCapacity("necesito alojamiento para 2 personas"),2);
assert.equal(extractRequestedCapacity("y para dos?"),2);
assert.equal(extractPublishedCapacity("Dormi compartido con capacidad para 10 personas"),10);
assert.equal(extractRequestedCapacity("productos destacados"),null);

const dining=normalizeDestinationIntentV2({conversationalAction:"search",continuesPrevious:false,answerDirective:"",tasks:[
  {type:"find_business_category",query:"merendar",subject:"un lugar para merendar",taxonomyNodeIds:[1],locality:"Villa General Belgrano",localityPreference:"specified",resultReferenceKeys:[],constraints:[],needsClarification:false}
]},fallback,taxonomy);
assert.deepEqual(dining.tasks[0].taxonomyNodeIds,[5],"un sinónimo editorial específico debe impedir que compitan todos los descendientes de Gastronomía");

const ranked=rankDestinationCandidates([
  {entityKey:"business_location:1",entityType:"business_location",id:1,evidenceLevel:"structural_category",distanceKm:1,rankingScore:100},
  {entityKey:"business_location:2",entityType:"product",id:2,evidenceLevel:"structured_item",distanceKm:20,rankingScore:10},
  {entityKey:"business_location:3",entityType:"product",id:3,evidenceLevel:"structured_item",distanceKm:4,rankingScore:5},
],3);
assert.deepEqual(ranked.map(item=>item.entityKey),["business_location:3","business_location:2","business_location:1"],"la evidencia válida precede alternativas de rubro y, dentro del mismo nivel, manda la cercanía");
const workbook=createSimpleXlsx(["template_version","title","locality"],[["1.0","Paseo de prueba","Los Reartes"]]);
assert.deepEqual(parseSimpleXlsx(workbook),[{template_version:"1.0",title:"Paseo de prueba",locality:"Los Reartes"}],"la plantilla XLSX debe poder descargarse y reimportarse sin dependencias externas");

console.log("destinationEngineV2: invariantes de intenciÃ³n, capacidad y ranking verificadas");
