// src/app/modules/qr-page/renderers/blocks/ImageBlock.jsx

export default function ImageBlock({
    content
}) {

    if (!content.image_url) {
        return null;
    }

    return (
        <img
            className="qr_public_image"
            src={content.image_url}
            alt={content.alt || ""}
        />
    );
}