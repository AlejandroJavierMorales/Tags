import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/app/lib/tags-db";
import { requireQRPageAccess } from "@/app/modules/qr-page/lib/requireQRPageAccess";
import { safeParseJSON } from "@/app/modules/qr-page/lib/safeParseJSON";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const xml = value => String(value || "").replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]);
const dataUrl = (buffer, mime) => `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;

async function remoteImage(url) {
  if (!url || !/^https:\/\//i.test(url)) return null;
  const host = new URL(url).hostname.toLowerCase();
  if (!(host === "storage.googleapis.com" || host.endsWith(".tags.com.ar") || host.endsWith(".calamuchita.ar"))) return null;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!response.ok) return null;
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 4_000_000) return null;
  return dataUrl(await sharp(Buffer.from(bytes)).png().toBuffer(), "image/png");
}

export async function GET(request) {
  const url = new URL(request.url);
  const businessId = Number(url.searchParams.get("businessId") || 0);
  const pageId = Number(url.searchParams.get("pageId") || 0);
  const preview = url.searchParams.get("preview") === "1";
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";
  if (!businessId || !pageId) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  const access = await requireQRPageAccess(businessId, { skipQRPageValidation: true });
  if (!access.ok) return Response.json({ error: access.error }, { status: access.status });
  const [[row]] = await db.query(
    `SELECT b.name,b.logo_url,s.settings_json,q.code
       FROM tags_qr_pages p
       INNER JOIN tags_businesses b ON b.id=p.business_id
       INNER JOIN tags_qr_page_sections s ON s.page_id=p.id AND s.type='catalog'
       LEFT JOIN tags_qr_codes q ON q.id=CAST(JSON_UNQUOTE(JSON_EXTRACT(s.settings_json,'$.catalogStandalone.qrCodeId')) AS UNSIGNED) AND q.business_id=p.business_id
      WHERE p.id=? AND p.business_id=? AND p.page_type='directory' LIMIT 1`,
    [pageId, businessId]
  );
  const config = safeParseJSON(row?.settings_json).catalogStandalone || {};
  if (!row?.code) return Response.json({ error: "Guardá la configuración para generar el QR" }, { status: 409 });
  const target = `${process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.tags.com.ar"}/t/${row.code}`;
  const qrSvg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "H", margin: 1, color: { dark: "#111111", light: "#ffffff" } });
  const qrData = dataUrl(Buffer.from(qrSvg), "image/svg+xml");
  let clientLogo = null;
  try { clientLogo = await remoteImage(row.logo_url); } catch {}
  const platformLogoSource = await readFile(path.join(process.cwd(), "public", "assets", "images", "logos", "LogoCalamuchitar.webp"));
  const platformLogo = dataUrl(await sharp(platformLogoSource).png().toBuffer(), "image/png");
  const frameColor = /^#[0-9a-f]{6}$/i.test(config.frameColor || "") ? config.frameColor : "#f58220";
  const title = Object.prototype.hasOwnProperty.call(config, "title") ? String(config.title || "").trim() : "Mirá nuestro catálogo";
  const subtitle = Object.prototype.hasOwnProperty.call(config, "subtitle") ? String(config.subtitle || "").trim() : "Productos, precios y promociones";
  const requestedPreset = url.searchParams.get("preset") || config.socialPreset;
  const preset = ["square", "portrait", "story"].includes(requestedPreset) ? requestedPreset : "portrait";
  const layouts = {
    square: { width: 1080, height: 1080, logoY: 30, logoHeight: 105, titleY: 175, subtitleY: 220, qrY: 270, qrSize: 580, platformY: 885, platformHeight: 65 },
    portrait: { width: 1080, height: 1350, logoY: 65, logoHeight: 160, titleY: 295, subtitleY: 352, qrY: 405, qrSize: 650, platformY: 1110, platformHeight: 95 },
    story: { width: 1080, height: 1920, logoY: 135, logoHeight: 190, titleY: 430, subtitleY: 500, qrY: 585, qrSize: 700, platformY: 1480, platformHeight: 125 }
  };
  const layout = layouts[preset];
  const qrX = (layout.width - layout.qrSize) / 2;
  const inset = 34;
  const radius = 42;
  const frameStyle = ["full", "top-right", "top-left", "none"].includes(config.frameStyle) ? config.frameStyle : "full";
  const frame = frameStyle === "full"
    ? `<rect x="${inset}" y="${inset}" width="${layout.width - inset * 2}" height="${layout.height - inset * 2}" rx="${radius}" fill="none" stroke="${frameColor}" stroke-width="12"/>`
    : frameStyle === "top-right"
      ? `<path d="M ${layout.width * .3} ${inset} H ${layout.width - inset - radius} Q ${layout.width - inset} ${inset} ${layout.width - inset} ${inset + radius} V ${layout.height * .78}" fill="none" stroke="${frameColor}" stroke-width="12" stroke-linecap="round"/>`
      : frameStyle === "top-left"
        ? `<path d="M ${inset} ${layout.height * .78} V ${inset + radius} Q ${inset} ${inset} ${inset + radius} ${inset} H ${layout.width * .7}" fill="none" stroke="${frameColor}" stroke-width="12" stroke-linecap="round"/>`
        : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">
    <rect width="${layout.width}" height="${layout.height}" fill="#fff"/>${frame}
    ${config.showLogo !== false ? (clientLogo ? `<image href="${clientLogo}" x="290" y="${layout.logoY}" width="500" height="${layout.logoHeight}" preserveAspectRatio="xMidYMid meet"/>` : `<text x="540" y="${layout.logoY + layout.logoHeight * .65}" text-anchor="middle" font-family="Arial,sans-serif" font-size="58" font-weight="700" fill="#222">${xml(row.name)}</text>`) : ""}
    ${title ? `<text x="540" y="${layout.titleY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="800" fill="#222">${xml(title)}</text>` : ""}
    ${subtitle ? `<text x="540" y="${layout.subtitleY}" text-anchor="middle" font-family="Arial,sans-serif" font-size="29" fill="#555">${xml(subtitle)}</text>` : ""}
    <rect x="${qrX - 20}" y="${layout.qrY - 20}" width="${layout.qrSize + 40}" height="${layout.qrSize + 40}" rx="28" fill="#fff" stroke="${frameColor}" stroke-width="7"/>
    <image href="${qrData}" x="${qrX}" y="${layout.qrY}" width="${layout.qrSize}" height="${layout.qrSize}"/>
    <image href="${platformLogo}" x="365" y="${layout.platformY}" width="350" height="${layout.platformHeight}" preserveAspectRatio="xMidYMid meet"/>
    <text x="540" y="${layout.platformY + layout.platformHeight + 28}" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="600" fill="#555">La Plataforma Comercial de Calamuchita</text>
  </svg>`;
  if (format === "png") {
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", ...(preview ? {} : { "Content-Disposition": `attachment; filename="catalogo-${row.code}-${preset}.png"` }) } });
  }
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store", ...(preview ? {} : { "Content-Disposition": `attachment; filename="catalogo-${row.code}-${preset}.svg"` }) } });
}
