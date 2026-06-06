// src/app/modules/qr-page/renderers/blocks/SpacerBlock.jsx

export default function SpacerBlock({
    content
}) {

    return (
        <div
            style={{
                height: Number(content.height || 32)
            }}
        />
    );
}