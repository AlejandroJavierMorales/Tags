import {
    FaInstagram,
    FaFacebookF,
    FaTiktok,
    FaYoutube,
    FaLinkedinIn,
    FaGlobe
}
from "react-icons/fa";

import getTypographyStyle from "../../lib/getTypographyStyle";

const ICONS = {
    instagram: <FaInstagram />,
    facebook: <FaFacebookF />,
    tiktok: <FaTiktok />,
    youtube: <FaYoutube />,
    linkedin: <FaLinkedinIn />,
    website: <FaGlobe />
};

export default function SocialLinksBlock({
    content,
    page,
    styles = {}
}) {

    const buttonStyle =
        getTypographyStyle(
            styles,
            "button"
        );

    const links = [
        {
            key: "instagram",
            label: "Instagram",
            url: content.instagram || page?.instagram_url
        },
        {
            key: "facebook",
            label: "Facebook",
            url: content.facebook || page?.facebook_url
        },
        {
            key: "tiktok",
            label: "TikTok",
            url: content.tiktok || page?.tiktok_url
        },
        {
            key: "youtube",
            label: "YouTube",
            url: content.youtube || page?.youtube_url
        },
        {
            key: "linkedin",
            label: "LinkedIn",
            url: content.linkedin || page?.linkedin_url
        },
        {
            key: "website",
            label: "Web",
            url: content.website || page?.website_url
        }
    ].filter((item) => item.url);

    if (!links.length) {
        return null;
    }

    return (
        <div className="qr_public_social_links">

            {
                links.map((item) => (

                    <a
                        key={item.key}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.label}
                        title={item.label}
                        style={buttonStyle}
                    >
                        {ICONS[item.key]}
                    </a>

                ))
            }

        </div>
    );
}