import { FaLocationDot } from "react-icons/fa6";
import { directoryImageUrl } from "../../lib/directoryPublicFormatting";
import DirectoryProviderGallery from "./DirectoryProviderGallery";
import DirectoryProviderFooter from "./DirectoryProviderFooter";
import DirectoryWebSection from "./DirectoryWebSection";
import DirectoryCatalogBlock from "./DirectoryCatalogBlock";
import DirectoryContactBlock from "./DirectoryContactBlock";
import DirectoryBenefitsBlock from "./DirectoryBenefitsBlock";
import DirectoryFloatingActions from "./DirectoryFloatingActions";
import DirectoryNavigationMenu from "./DirectoryNavigationMenu";
import DirectoryReviewsModule from "./DirectoryReviewsModule";
import { buildDirectoryThemeStyle } from "../../lib/directoryThemeStyle";
import "./DirectoryProviderRenderer.css";

function socialConfig(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function baseSlot(section) {
  if (section?.settings_json?.directoryBaseSlot) return section.settings_json.directoryBaseSlot;
  const blockType = section?.blocks?.[0]?.type;
  if (blockType === "web_section" && section.title === "Presentación") return "presentation";
  if (blockType === "gallery") return "gallery";
  if (blockType === "contact_info") return "contact";
  if (blockType === "catalog" || section?.type === "catalog") return "catalog";
  if (blockType === "benefits") return "benefits";
  return "web";
}

export default function DirectoryProviderRenderer({ data, web = null, standalone = false, embeddedStoreContent = null, embeddedStoreName = "Tienda", embeddedRestoContent = null, embeddedRestoName = "Gastronomía" }) {
  const { listing, media = [] } = data;
  const page = web?.page || null;
  const sections = [...(web?.sections || [])].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  const listingSocial = socialConfig(listing.social_config);
  const mergedListing = { ...listing, display_name: listing.display_name, description: listing.description, email: listing.email, phone: listing.phone, whatsapp: listing.whatsapp, address: listing.address, latitude: listing.latitude, longitude: listing.longitude, website_url: listing.website_url, social_config: { ...listingSocial, instagram: listing.business_instagram_url || listingSocial.instagram, facebook: listing.business_facebook_url || listingSocial.facebook } };
  const social = socialConfig(mergedListing.social_config);
  const legacyLogo = media.find(item => item.media_type === "logo");
  const logo = listing.business_logo_url ? { id: `business-logo-${listing.business_id}`, url: listing.business_logo_url } : legacyLogo;
  const tokens = page?.theme?.css_tokens || {};
  const themeStyle = buildDirectoryThemeStyle({ themeTokens: tokens, globalStyles: page?.global_styles || {} });
  const header = page?.header_config || {};
  const moduleSettings = page?.global_styles?.directoryModules || {};
  const reviews = web?.embeddedReviews || null;
  const reviewUsesOwnTheme = Boolean(reviews?.theme?.id && Number(reviews.theme.id) !== Number(page?.theme_id || 0));
  const publicModules = [
    embeddedStoreContent && moduleSettings.store?.enabled !== false ? { code: "store", title: embeddedStoreName, sortOrder: Number(moduleSettings.store?.sortOrder || 1000), content: embeddedStoreContent } : null,
    embeddedRestoContent && moduleSettings.resto?.enabled !== false ? { code: "resto", title: embeddedRestoName, sortOrder: Number(moduleSettings.resto?.sortOrder || 1010), content: embeddedRestoContent } : null,
    reviews && moduleSettings.reviewsInvitation?.enabled !== false ? { code: "reviews-invitation", title: moduleSettings.reviewsInvitation?.content?.menuLabel || "Dejar una reseña", sortOrder: Number(moduleSettings.reviewsInvitation?.sortOrder || 1020), content: <DirectoryReviewsModule variant="invitation" data={reviews} content={moduleSettings.reviewsInvitation?.content} useOwnTheme={reviewUsesOwnTheme} directoryThemeTokens={tokens} /> } : null,
    reviews && moduleSettings.reviewsSlider?.enabled !== false ? { code: "reviews-slider", title: moduleSettings.reviewsSlider?.content?.menuLabel || "Opiniones", sortOrder: Number(moduleSettings.reviewsSlider?.sortOrder || 1030), content: <DirectoryReviewsModule variant="slider" data={reviews} content={moduleSettings.reviewsSlider?.content} useOwnTheme={reviewUsesOwnTheme} directoryThemeTokens={tokens} /> } : null
  ].filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder);
  const visibleCatalogProducts = (web?.products || []).filter(product => Number(product.is_visible));
  const benefits = web?.benefits || [];

  function galleryImages(section) {
    const block = (section.blocks || []).find(item => Number(item.is_visible));
    const configured = Array.isArray(block?.content_json?.images)
      ? block.content_json.images.filter(image => image?.url).map((image, index) => ({ id: `gallery-${section.id}-${index}`, url: image.url, alt_text: image.alt || "" }))
      : [];
    return (configured.length ? configured : media.filter(item => item.media_type === "gallery" && item.url)).slice(0, 8);
  }

  function sectionHasPublicContent(section) {
    if (!Number(section.is_visible)) return false;
    const block = (section.blocks || []).find(item => Number(item.is_visible));
    if (!block) return false;
    const slot = baseSlot(section);
    if (slot === "gallery") return galleryImages(section).length > 0;
    if (slot === "catalog") return visibleCatalogProducts.length > 0;
    if (slot === "benefits") return benefits.length > 0;
    return true;
  }

  const publicSections = sections.filter(sectionHasPublicContent);
  const navigationSections = [
    ...publicSections,
    ...publicModules.map(module => ({ id: module.code, title: module.title, is_visible: 1 }))
  ];

  function renderSection(section) {
    if (!Number(section.is_visible)) return null;
    const block = (section.blocks || []).find(item => Number(item.is_visible));
    if (!block) return null;
    const slot = baseSlot(section);
    const content = block.content_json || {};
    const styles = { ...(section.styles_json || {}), ...(block.styles_json || {}) };
    if (slot === "gallery") {
      return <DirectoryProviderGallery images={galleryImages(section)} providerName={mergedListing.display_name} content={content} styles={styles} />;
    }
    if (slot === "contact") return <DirectoryContactBlock listing={mergedListing} social={social} content={content} styles={styles} />;
    if (slot === "catalog") return <DirectoryCatalogBlock products={visibleCatalogProducts} page={page} content={content} styles={styles} />;
    if (slot === "benefits") return <DirectoryBenefitsBlock benefits={benefits} content={content} styles={styles} />;
    if (slot === "presentation") {
      const configuredParagraphs = Array.isArray(content.paragraphs) ? content.paragraphs.filter(Boolean) : [];
      // La ficha histórica tiene dos campos distintos: description1 es el resumen
      // destacado y description2 es el desarrollo. El listing conserva esa separación;
      // page.description puede contener una copia del desarrollo y no debe pisarla.
      const shortDescription = listing.short_description || page?.short_description || content.highlightedText || "";
      const longDescription = listing.description || page?.description || mergedListing.description || "";
      const normalizeText = value => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
      const shortKey = normalizeText(shortDescription);
      const distinctParagraphs = configuredParagraphs.filter(paragraph => normalizeText(typeof paragraph === "string" ? paragraph : paragraph?.text) !== shortKey);
      const paragraphs = configuredParagraphs.length
        ? distinctParagraphs
        : longDescription && normalizeText(longDescription) !== shortKey
          ? [longDescription]
          : [];
      return <DirectoryWebSection content={{
        ...content,
        title: content.title || mergedListing.display_name,
        highlightedText: shortDescription,
        paragraphs,
      }} styles={styles} />;
    }
    return <DirectoryWebSection content={content} styles={styles} />;
  }

  return <div className="tags_directory_provider_web" style={themeStyle}>
    {header.isVisible !== false && <header className="tags_directory_provider_hero">
      {header.showCover !== false && (listing.business_cover_url || page?.cover_image_url) && <img src={listing.business_cover_url || page.cover_image_url} alt="" className="tags_directory_provider_cover" />}
      {header.showLogo !== false && logo && <img src={directoryImageUrl(logo.url)} alt={`Logo de ${mergedListing.display_name}`} className="tags_directory_provider_logo" />}
      <div>{header.eyebrow && <span>{header.eyebrow}</span>}{header.showName !== false && <h1>{header.title || mergedListing.display_name}</h1>}{header.subtitle && <p className="subtitle">{header.subtitle}</p>}{header.showLocation !== false && listing.locality_name && <p><FaLocationDot /> {listing.locality_name}</p>}</div>
      {header.showMenu !== false && <DirectoryNavigationMenu sections={navigationSections} direction={header.drawerDirection || "right"} />}
    </header>}
    <main className="tags_directory_provider_sections">{publicSections.map(section=><section className="tags_directory_provider_section" id={`directory-section-${section.id}`} key={section.id}>{renderSection(section)}</section>)}{publicModules.map(module=>module.code==="store"||module.code==="resto"?<div className="tags_directory_embedded_module_slot" key={module.code}>{module.content}</div>:<section className="tags_directory_provider_section" id={`directory-section-${module.code}`} key={module.code}>{module.content}</section>)}</main>
    {standalone && <DirectoryProviderFooter listing={mergedListing} logo={logo} social={social} config={page?.footer_config || {}} />}
    <DirectoryFloatingActions whatsapp={mergedListing.whatsapp} showWhatsapp={page?.global_styles?.showFloatingWhatsapp!==false} showBackToTop={page?.global_styles?.showBackToTop!==false} />
  </div>;
}
