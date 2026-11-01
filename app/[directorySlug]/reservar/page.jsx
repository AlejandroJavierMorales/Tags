import { cache } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/app/lib/tags-db";
import { getHeadersHost } from "@/app/lib/channelContext";
import {
  getDirectoryListingBySlug,
  getDirectorySiteCodeByHost,
} from "@/app/modules/directory/lib/getDirectoryPublicData";
import { parseGuestJson } from "@/app/modules/guest-experience/lib/guestExperienceService";
import { getDirectoryThemeStyleForBusiness } from "@/app/modules/directory/lib/getDirectoryThemeStyleForBusiness";
import LodgingBookingPage from "@/app/modules/guest-experience/components/public/LodgingBookingPage";
import { selectBusinessBookingHeroImages } from "@/app/modules/guest-experience/lib/selectBookingHeroImages";
import { getBookingCatalogImages } from "@/app/modules/guest-experience/server/getBookingCatalogImages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getListing = cache((slug, siteCode) => getDirectoryListingBySlug(slug, siteCode));

async function context(slug) {
  const requestHeaders = await headers();
  const siteCode = await getDirectorySiteCodeByHost(getHeadersHost(requestHeaders));
  const directory = await getListing(slug, siteCode);
  if (
    !directory ||
    directory.listing.status !== "published" ||
    directory.listing.publication_status !== "published"
  ) {
    return null;
  }
  const [apps] = await db.query(
    `SELECT id,business_id,name,slug,logo_url,cover_url,welcome_message,currency,settings_json
       FROM tags_guest_apps
      WHERE business_id=? AND status='published'
      ORDER BY id DESC LIMIT 1`,
    [directory.listing.business_id],
  );
  if (!apps[0]) return null;
  const themeStyle = await getDirectoryThemeStyleForBusiness(directory.listing.business_id);
  const configuredImages = [];
  if (directory.listing.qr_page_id) {
    const [blocks] = await db.query(
      `SELECT b.content_json
         FROM tags_qr_page_blocks b
         INNER JOIN tags_qr_page_sections s ON s.id=b.section_id
        WHERE s.page_id=? AND s.is_visible=1 AND b.is_visible=1
        ORDER BY s.sort_order,b.sort_order,b.id`,
      [directory.listing.qr_page_id],
    );
    blocks.forEach((block) => {
      const content = parseGuestJson(block.content_json);
      if (Array.isArray(content.images)) {
        content.images.forEach((image) => {
          if (image?.url) configuredImages.push({ url: image.url, alt: image.alt || "" });
        });
      }
    });
  }
  const mediaImages = (directory.media || [])
    .filter((image) => ["cover", "gallery"].includes(image.media_type) && image.url)
    .map((image) => ({ url: image.url, alt: image.alt_text || "" }));
  const catalogImages = await getBookingCatalogImages(directory.listing.business_id);
  const allImages = [...configuredImages, ...mediaImages, ...catalogImages].filter(
    (image, index, list) => list.findIndex((candidate) => candidate.url === image.url) === index,
  );
  const bookingSettings = parseGuestJson(apps[0].settings_json);
  const businessLogo = directory.listing.business_logo_url || apps[0].logo_url || "";
  const businessCover = directory.listing.business_cover_url || apps[0].cover_url || allImages[0]?.url || "";
  const coverUrl = bookingSettings.bookingShowCover === false
    ? ""
    : bookingSettings.bookingCoverSource === "custom"
      ? bookingSettings.bookingCoverUrl || ""
      : businessCover;
  const bookingImages = selectBusinessBookingHeroImages(allImages, coverUrl, directory.listing.business_id);
  return {
    directory,
    app: {
      ...apps[0],
      logo_url: bookingSettings.bookingShowLogo === false ? "" : businessLogo,
      cover_url: coverUrl,
      themeStyle,
      bookingImages,
    },
  };
}

export async function generateMetadata({ params }) {
  const { directorySlug } = await params;
  const result = await context(directorySlug);
  return {
    title: result ? `Reservar | ${result.app.name}` : "Reservar alojamiento",
    description: result
      ? `Consultá disponibilidad y tarifas para alojarte en ${result.app.name}.`
      : "Consultá disponibilidad de alojamiento.",
    alternates: { canonical: `/${directorySlug}/reservar` },
    robots: result ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function DirectoryLodgingBookingPage({ params }) {
  const { directorySlug } = await params;
  const result = await context(directorySlug);
  if (!result) notFound();
  return (
    <LodgingBookingPage
      app={{ ...result.app, settings: parseGuestJson(result.app.settings_json) }}
    />
  );
}
