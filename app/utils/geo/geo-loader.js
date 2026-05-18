import maxmind from "maxmind";
import path from "path";
import fs from "fs";

const dbPath = path.join(
  process.cwd(),
  "/app/utils/geo/GeoLite2-City.mmdb"
);

// 🧠 cache en memoria (ultra importante)
let lookup = null;
const ipCache = new Map();

export async function getGeo() {
  if (!lookup) {
    if (!fs.existsSync(dbPath)) {
      throw new Error("GeoLite DB not found: " + dbPath);
    }

    lookup = await maxmind.open(dbPath);
  }

  return lookup;
}

// 🚀 cache de IPs (evita lookup repetido)
export function getCachedGeo(ip) {
  return ipCache.get(ip) || null;
}

export function setCachedGeo(ip, data) {
  ipCache.set(ip, data);

  // 🧹 limpieza básica (evita memory leak)
  if (ipCache.size > 5000) {
    const firstKey = ipCache.keys().next().value;
    ipCache.delete(firstKey);
  }
}