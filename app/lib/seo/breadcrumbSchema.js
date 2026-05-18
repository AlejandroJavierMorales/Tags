export function getBreadcrumbSchema(
    items,
    id
) {

    return {

        "@context": "https://schema.org",

        "@type": "BreadcrumbList",

        "@id": id,

        itemListElement:
            items.map((item, index) => ({

                "@type": "ListItem",

                position: index + 1,

                name: item.name,

                item: item.url
            }))
    };
}