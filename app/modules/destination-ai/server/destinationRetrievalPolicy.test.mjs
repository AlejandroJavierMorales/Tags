import assert from "node:assert/strict";
import { shouldIncludeCategoryProviders } from "./destinationRetrievalPolicy.js";

assert.equal(shouldIncludeCategoryProviders({ type: "find_service", taxonomyNodeIds: [15] }), true);
assert.equal(shouldIncludeCategoryProviders({ type: "find_service", taxonomyNodeIds: [] }), false);
assert.equal(shouldIncludeCategoryProviders({ type: "find_product", taxonomyNodeIds: [15] }), false);
assert.equal(shouldIncludeCategoryProviders({ type: "find_dish", taxonomyNodeIds: [15] }), false);

console.log("destinationRetrievalPolicy: prestadores por rubro habilitados sólo para servicios explícitos");
