// src/app/modules/qr-page/renderers/blocks/VideoBlock.jsx

export default function VideoBlock({
    content
}) {

    if (!content.video_url) {
        return null;
    }

    const isEmbed =
        content.video_url.includes("youtube.com") ||
        content.video_url.includes("youtu.be") ||
        content.video_url.includes("vimeo.com");

    if (isEmbed) {
        return (
            <div className="qr_public_video_wrap">
                <iframe
                    src={content.video_url}
                    title="Video"
                    allowFullScreen
                />
            </div>
        );
    }

    return (
        <video
            className="qr_public_video"
            src={content.video_url}
            controls
        />
    );
}