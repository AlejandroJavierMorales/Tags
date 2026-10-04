import { FaLocationDot } from "react-icons/fa6";
import { directoryImageUrl } from "../../lib/directoryPublicFormatting";
import DirectoryProviderGallery from "./DirectoryProviderGallery";
import DirectoryProviderFooter from "./DirectoryProviderFooter";
import DirectoryWebSection from "./DirectoryWebSection";
import DirectoryCatalogBlock from "./DirectoryCatalogBlock";
import DirectoryContactBlock from "./DirectoryContactBlock";
import DirectoryBenefitsBlock from "./DirectoryBenefitsBlock";
import DirectoryLoyaltyBlock from "./DirectoryLoyaltyBlock";
import DirectoryFloatingActions from "./DirectoryFloatingActions";
import DirectoryNavigationMenu from "./DirectoryNavigationMenu";
import DirectoryReviewsModule from "./DirectoryReviewsModule";
import DirectorySectionGroup from "./DirectorySectionGroup";
import DirectoryReveal from "./DirectoryReveal";
import { buildDirectoryThemeStyle } from "../../lib/directoryThemeStyle";
import { getDirectorySectionGroups, isDirectorySectionGroupable } from "../../lib/directorySectionGroups";
import ChatWidget from "@/app/modules/ai-chat/components/ChatWidget";
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
  if (blockType === "loyalty_program") return "loyalty";
  return "web";
}

export default function DirectoryProviderRenderer({ data, web = null, standalone = false, embeddedStoreContent = null, embeddedStoreName = "Tienda", embeddedRestoContent = null, embeddedRestoName = "Gastronomía", embeddedTurnosContent = null, embeddedTurnosName = "Reservas" }) {
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
  const animationMode = ["none", "slide-up", "fade", "slide-left", "zoom"].includes(page?.global_styles?.contentAnimation)
    ? page.global_styles.contentAnimation
    : "slide-up";
  const reviews = web?.embeddedReviews || null;
  const reviewUsesOwnTheme = Boolean(reviews?.theme?.id && Number(reviews.theme.id) !== Number(page?.theme_id || 0));
  const publicModules = [
    embeddedStoreContent && moduleSettings.store?.enabled !== false ? { code: "store", title: embeddedStoreName, sortOrder: Number(moduleSettings.store?.sortOrder || 1000), content: embeddedStoreContent } : null,
    embeddedRestoContent && moduleSettings.resto?.enabled !== false ? { code: "resto", title: embeddedRestoName, sortOrder: Number(moduleSettings.resto?.sortOrder || 1010), content: embeddedRestoContent } : null,
    embeddedTurnosContent && moduleSettings.turnos?.enabled !== false ? { code: "turnos", title: embeddedTurnosName, sortOrder: Number(moduleSettings.turnos?.sortOrder || 1020), content: embeddedTurnosContent } : null,
    reviews && moduleSettings.reviewsInvitation?.enabled !== false ? { code: "reviewsInvitation", anchorCode: "reviews-invitation", title: moduleSettings.reviewsInvitation?.content?.menuLabel || "Dejar una reseña", sortOrder: Number(moduleSettings.reviewsInvitation?.sortOrder || 1040), content: <DirectoryReviewsModule variant="invitation" data={reviews} content={moduleSettings.reviewsInvitation?.content} useOwnTheme={reviewUsesOwnTheme} directoryThemeTokens={tokens} /> } : null,
    reviews && moduleSettings.reviewsSlider?.enabled !== false ? { code: "reviewsSlider", anchorCode: "reviews-slider", title: moduleSettings.reviewsSlider?.content?.menuLabel || "Opiniones", sortOrder: Number(moduleSettings.reviewsSlider?.sortOrder || 1050), content: <DirectoryReviewsModule variant="slider" data={reviews} content={moduleSettings.reviewsSlider?.content} useOwnTheme={reviewUsesOwnTheme} directoryThemeTokens={tokens} /> } : null
  ].filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder);
  const visibleCatalogProducts = (web?.products || []).filter(product => Number(product.is_visible));
  const benefits = web?.benefits || [];
  const loyalty = web?.loyalty || null;

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
    if (slot === "loyalty") return Array.isArray(loyalty) ? loyalty.length > 0 : Boolean(loyalty);
    return true;
  }

  const publicSections = sections.filter(sectionHasPublicContent);
  const publicSectionById = new Map(publicSections.map(section => [Number(section.id), section]));
  const configuredGroups = getDirectorySectionGroups(page?.global_styles || {}).map(group => ({
    ...group,
    sectionIds: group.sectionIds.filter(sectionId => {
      const section = publicSectionById.get(Number(sectionId));
      return section && isDirectorySectionGroupable(section);
    })
  }));
  const assignedSectionIds = new Set(configuredGroups.flatMap(group => group.sectionIds.map(Number)));
  const publicGroups = configuredGroups.filter(group => group.enabled !== false && group.sectionIds.length > 0);
  const publicGroupById = new Map(publicGroups.map(group => [group.id, group]));
  const groupIdBySection = new Map();
  configuredGroups.forEach(group => group.sectionIds.forEach(sectionId => groupIdBySection.set(Number(sectionId), group.id)));
  const insertedGroups = new Set();
  const contentLayoutItems = [];
  publicSections.forEach(section => {
    const groupId = groupIdBySection.get(Number(section.id));
    if (!assignedSectionIds.has(Number(section.id))) {
      contentLayoutItems.push({ key: `section:${section.id}`, type: "section", section });
    } else if (groupId && publicGroupById.has(groupId) && !insertedGroups.has(groupId)) {
      insertedGroups.add(groupId);
      contentLayoutItems.push({ key: `group:${groupId}`, type: "group", group: publicGroupById.get(groupId) });
    }
  });
  publicGroups.filter(group => !insertedGroups.has(group.id)).forEach(group => contentLayoutItems.push({ key: `group:${group.id}`, type: "group", group }));
  const baseLayoutItems = [
    ...contentLayoutItems,
    ...publicModules.map(module => ({ key: `module:${module.code}`, type: "module", module }))
  ];
  const savedLayoutOrder = Array.isArray(page?.global_styles?.directoryLayoutOrder) ? page.global_styles.directoryLayoutOrder : [];
  const layoutRank = new Map(savedLayoutOrder.map((key, index) => [key, index]));
  const publicLayoutItems = savedLayoutOrder.length
    ? [...baseLayoutItems].sort((a, b) => (layoutRank.has(a.key) ? layoutRank.get(a.key) : savedLayoutOrder.length + baseLayoutItems.indexOf(a)) - (layoutRank.has(b.key) ? layoutRank.get(b.key) : savedLayoutOrder.length + baseLayoutItems.indexOf(b)))
    : baseLayoutItems;
  const navigationSections = publicLayoutItems.map(item => item.type === "section"
    ? item.section
    : item.type === "group"
      ? { id: `group-${item.group.id}`, title: item.group.title, is_visible: 1 }
      : { id: item.module.anchorCode || item.module.code, title: item.module.title, is_visible: 1 });

  function renderSection(section, { groupLayout = null } = {}) {
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
    if (slot === "loyalty") return <DirectoryLoyaltyBlock program={loyalty} content={content} styles={styles} />;
    if (slot === "presentation") {
      if (content.contentManaged === true) {
        return <DirectoryWebSection content={content} styles={styles} />;
      }
      const ownsTitle = Object.prototype.hasOwnProperty.call(content, "title");
      const ownsHighlightedText = Object.prototype.hasOwnProperty.call(content, "highlightedText");
      const highlightedText = ownsHighlightedText
        ? content.highlightedText || ""
        : listing.short_description || page?.short_description || "";
      const longDescription = listing.description || page?.description || mergedListing.description || "";
      const normalizeText = value => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
      const highlightedKey = normalizeText(highlightedText);
      const configuredParagraphs = (Array.isArray(content.paragraphs) ? content.paragraphs : [])
        .map(paragraph => typeof paragraph === "string" ? paragraph : paragraph?.text)
        .filter(Boolean)
        .filter(paragraph => normalizeText(paragraph) !== highlightedKey);
      const paragraphKeys = new Set(configuredParagraphs.map(normalizeText));
      const descriptionKey = normalizeText(longDescription);
      const paragraphs = [...configuredParagraphs];
      if (longDescription && descriptionKey !== highlightedKey && !paragraphKeys.has(descriptionKey)) {
        paragraphs.push(longDescription);
      }
      return <DirectoryWebSection content={{
        ...content,
        title: ownsTitle ? content.title || "" : mergedListing.display_name,
        highlightedText,
        paragraphs,
      }} styles={styles} />;
    }
    const groupedContent = groupLayout === "accordion"
      ? { ...content, title: "" }
      : groupLayout === "cards"
        ? { ...content, title: content.title || section.title || "" }
        : content;
    return <DirectoryWebSection content={groupedContent} styles={styles} />;
  }

  return <div className="tags_directory_provider_web" style={themeStyle}>
    {header.isVisible !== false && <header className="tags_directory_provider_hero">
      {header.showCover !== false && (listing.business_cover_url || page?.cover_image_url) && <img src={listing.business_cover_url || page.cover_image_url} alt="" className="tags_directory_provider_cover" />}
      {header.showLogo !== false && logo && <img src={directoryImageUrl(logo.url)} alt={`Logo de ${mergedListing.display_name}`} className="tags_directory_provider_logo" />}
      <div>{header.eyebrow && <span>{header.eyebrow}</span>}{header.showName !== false && <h1>{header.title || mergedListing.display_name}</h1>}{header.subtitle && <p className="subtitle">{header.subtitle}</p>}{header.showLocation !== false && listing.locality_name && <p><FaLocationDot /> {listing.locality_name}</p>}</div>
      {header.showMenu !== false && <DirectoryNavigationMenu sections={navigationSections} direction={header.drawerDirection || "right"} />}
    </header>}
    <main className="tags_directory_provider_sections">{publicLayoutItems.map(item => {
      if (item.type === "section") return <DirectoryReveal mode={animationMode} key={item.key}><section className="tags_directory_provider_section" id={`directory-section-${item.section.id}`}>{renderSection(item.section)}</section></DirectoryReveal>;
      if (item.type === "group") {
        const groupItems = item.group.sectionIds.map(sectionId => publicSectionById.get(Number(sectionId))).filter(Boolean).map(section => ({ id: section.id, title: section.title || "Sección", content: renderSection(section, { groupLayout: item.group.layout }) }));
        return <DirectoryReveal mode={animationMode} key={item.key}><section className="tags_directory_provider_section" id={`directory-section-group-${item.group.id}`}><DirectorySectionGroup group={item.group} items={groupItems} /></section></DirectoryReveal>;
      }
      const module = item.module;
      const anchorCode = module.anchorCode || module.code;
      return <DirectoryReveal mode={animationMode} key={item.key}>{["store", "resto", "turnos"].includes(module.code)
        ? <div className="tags_directory_embedded_module_slot" id={`directory-section-${anchorCode}`}>{module.content}</div>
        : <section className="tags_directory_provider_section" id={`directory-section-${anchorCode}`}>{module.content}</section>}</DirectoryReveal>;
    })}</main>
    {standalone && <DirectoryProviderFooter listing={mergedListing} logo={logo} social={social} config={page?.footer_config || {}} />}
    <DirectoryFloatingActions whatsapp={mergedListing.whatsapp} showWhatsapp={page?.global_styles?.showFloatingWhatsapp!==false} showBackToTop={page?.global_styles?.showBackToTop!==false} />
    {web?.aiChatConfig && moduleSettings.chatbot?.enabled !== false && <ChatWidget config={web.aiChatConfig} />}
  </div>;
}
