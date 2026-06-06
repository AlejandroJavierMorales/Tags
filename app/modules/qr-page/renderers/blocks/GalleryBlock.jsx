// src/app/modules/qr-page/renderers/blocks/GalleryBlock.jsx

export default function GalleryBlock({
    content
}) {

    const images =
        Array.isArray(content.images)
            ? content.images
            : [];

    if (!images.length) {
        return null;
    }

    return (
        <div className="qr_public_gallery">
            {
                images.map((image, index) => (
                    <img
                        key={`${image.url}-${index}`}
                        src={image.url}
                        alt={image.alt || `Imagen ${index + 1}`}
                    />
                ))
            }
        </div>
    );
}