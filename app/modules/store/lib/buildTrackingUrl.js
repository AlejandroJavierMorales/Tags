// app/modules/store/lib/buildTrackingUrl.js

export function buildTrackingUrl(template, trackingCode) {
    if (!template || !trackingCode) {
        return null;
    }

    return template.replace(
        "{tracking}",
        encodeURIComponent(trackingCode)
    );
}