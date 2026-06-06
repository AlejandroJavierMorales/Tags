import getTypographyStyle from "../../lib/getTypographyStyle";


export default function ProfileCardBlock({
    content,
    styles = {}
}) {

    return (
        <div className="qr_public_profile_card">

            {
                content.photo_url && (
                    <img
                        className="qr_public_profile_photo"
                        src={content.photo_url}
                        alt={content.name || ""}
                    />
                )
            }

            {
                content.name && (
                    <h2 style={getTypographyStyle(styles, "title")}>
                        {content.name}
                    </h2>
                )
            }

            {
                content.jobTitle && (
                    <div
                        className="qr_public_profile_job"
                        style={getTypographyStyle(styles, "subtitle")}
                    >
                        {content.jobTitle}
                    </div>
                )
            }

            {
                content.company && (
                    <div
                        className="qr_public_profile_company"
                        style={getTypographyStyle(styles, "meta")}
                    >
                        {content.company}
                    </div>
                )
            }

            {
                content.bio && (
                    <p style={getTypographyStyle(styles, "text")}>
                        {content.bio}
                    </p>
                )
            }

        </div>
    );
}