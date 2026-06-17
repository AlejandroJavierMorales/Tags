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

import {
    buildSocialUrl,
    normalizeWebsite
}
    from "../../lib/normalizeContactFields";

const ICONS = {
    instagram: <FaInstagram />,
    facebook: <FaFacebookF />,
    tiktok: <FaTiktok />,
    youtube: <FaYoutube />,
    linkedin: <FaLinkedinIn />,
    website: <FaGlobe />
};

function getUrl(key, value) {
    if (!value) {
        return "";
    }

    if (key === "website") {
        return normalizeWebsite(value);
    }

    return buildSocialUrl(
        key,
        value
    );
}

export default function SocialLinksBlock({
    content = {},
    page = {},
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
            url: getUrl(
                "instagram",
                 content?.instagram || page?.instagram_url
            )
        },
        {
            key: "facebook",
            label: "Facebook",
            url: getUrl(
                "facebook",
                 content?.facebook || page?.facebook_url
            )
        },
        {
            key: "tiktok",
            label: "TikTok",
            url: getUrl(
                "tiktok",
                 content?.tiktok || page?.tiktok_url
            )
        },
        {
            key: "youtube",
            label: "YouTube",
            url: getUrl(
                "youtube",
                 content?.youtube || page?.youtube_url
            )
        },
        {
            key: "linkedin",
            label: "LinkedIn",
            url: getUrl(
                "linkedin",
                 content?.linkedin || page?.linkedin_url
            )
        },
        {
            key: "website",
            label: "Web",
            url: getUrl(
                "website",
                 content?.website || page?.website_url
            )
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