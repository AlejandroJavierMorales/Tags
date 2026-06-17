import TextBlock from "./blocks/TextBlock";
import ImageBlock from "./blocks/ImageBlock";
import VideoBlock from "./blocks/VideoBlock";
import ButtonBlock from "./blocks/ButtonBlock";
import WhatsAppBlock from "./blocks/WhatsAppBlock";
import SocialLinksBlock from "./blocks/SocialLinksBlock";
import GalleryBlock from "./blocks/GalleryBlock";
import MapBlock from "./blocks/MapBlock";
import CatalogBlock from "./blocks/CatalogBlock";
import DividerBlock from "./blocks/DividerBlock";
import SpacerBlock from "./blocks/SpacerBlock";

import CardsBlock from "./blocks/CardsBlock";
import FeatureListBlock from "./blocks/FeatureListBlock";
import ContactInfoBlock from "./blocks/ContactInfoBlock";
import FAQBlock from "./blocks/FAQBlock";
import TestimonialsBlock from "./blocks/TestimonialsBlock";
import PricingCardsBlock from "./blocks/PricingCardsBlock";
import CTABlock from "./blocks/CTABlock";
import StatsBlock from "./blocks/StatsBlock";
import TeamBlock from "./blocks/TeamBlock";
import VCardBlock from "./blocks/VCardBlock";
import ProfileCardBlock from "./blocks/ProfileCardBlock";
import SocialActionsBlock from "./blocks/SocialActionsBlock";
import ShareProfileBlock from "./blocks/ShareProfileBlock";
import ProfileQRBlock from "./blocks/ProfileQRBlock";
import CustomLinksBlock from "./blocks/CustomLinksBlock";
import BulletListBlock from "./blocks/BulletListBlock";



export default function QRBlockRenderer({
    block,
    page,
    products
}) {

    if (!block?.is_visible) {
        return null;
    }

    const content =
        block.content_json || {};

    const styles =
        block.styles_json || {};

    const wrapperStyle = {
        textAlign:
            styles.alignment || "inherit",

        color:
            styles.textColor || "inherit",

        backgroundColor:
            styles.backgroundColor || "transparent",

        padding:
            styles.padding || undefined,

        marginTop:
            styles.marginTop || undefined,

        marginBottom:
            styles.marginBottom || undefined,

        marginLeft:
            styles.marginLeft || undefined,

        marginRight:
            styles.marginRight || undefined
    };

    return (
        <div
            className={`qr_public_block qr_public_block_${block.type}`}
            style={wrapperStyle}
        >
            {
                block.type === "text" && (
                    <TextBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "image" && (
                    <ImageBlock content={content} />
                )
            }

            {
                block.type === "video" && (
                    <VideoBlock content={content} />
                )
            }

            {
                block.type === "button" && (
                    <ButtonBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "whatsapp" && (
                    <WhatsAppBlock
                        content={content}
                        page={page}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "social_links" && (
                    <SocialLinksBlock
                        content={content}
                        page={page}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "gallery" && (
                    <GalleryBlock content={content} />
                )
            }

            {
                block.type === "map" && (
                    <MapBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "catalog" && (
                    <CatalogBlock
                        products={products}
                        productCategory={content.productCategory}
                        page={page}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "cards" && (
                    <CardsBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "feature_list" && (
                    <FeatureListBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "bullet_list" && (

                    <BulletListBlock
                        content={content}
                        styles={styles}
                    />

                )
            }

            {
                block.type === "contact_info" && (
                    <ContactInfoBlock
                        content={content}
                        page={page}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "faq" && (
                    <FAQBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "testimonials" && (
                    <TestimonialsBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "pricing_cards" && (
                    <PricingCardsBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "cta" && (
                    <CTABlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "stats" && (
                    <StatsBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "team" && (
                    <TeamBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "vcard" && (
                    <VCardBlock
                        content={content}
                        page={page}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "profile_card" && (
                    <ProfileCardBlock
                        content={content}
                        styles={styles}
                        page={page}
                    />
                )
            }

            {
                block.type === "social_actions" && (
                    <SocialActionsBlock
                        content={content}
                        page={page}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "share_profile" && (
                    <ShareProfileBlock
                        content={content}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "profile_qr" && (
                    <ProfileQRBlock
                        content={content}
                        page={page}
                        styles={styles}
                    />
                )
            }

            {
                block.type === "divider" && (
                    <DividerBlock />
                )
            }

            {
                block.type === "spacer" && (
                    <SpacerBlock content={content} />
                )
            }
            {
                block.type === "custom_links" && (
                    <CustomLinksBlock
                        content={content}
                        styles={styles}
                    />
                )
            }
        </div>
    );
}