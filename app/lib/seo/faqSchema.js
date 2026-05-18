export function getFAQSchema(
    faqs,
    id
) {

    return {

        "@context": "https://schema.org",

        "@type": "FAQPage",

        "@id": id,

        mainEntity: faqs.map(faq => ({

            "@type": "Question",

            name: faq.question,

            acceptedAnswer: {

                "@type": "Answer",

                text: faq.answer
            }
        }))
    };
}