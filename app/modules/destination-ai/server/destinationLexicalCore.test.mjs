import assert from "node:assert/strict";
import { stemDestinationSearchTerm } from "./destinationLexicalCore.js";

assert.equal(stemDestinationSearchTerm("instalador"), "instal");
assert.equal(stemDestinationSearchTerm("instalación"), "instal");
assert.equal(stemDestinationSearchTerm("instalamos"), "instal");
assert.equal(stemDestinationSearchTerm("antenas"), "anten");
assert.equal(stemDestinationSearchTerm("Starlink"), "starlink");

console.log("destinationLexicalCore: variantes comerciales en español verificadas");
