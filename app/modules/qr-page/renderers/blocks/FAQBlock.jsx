import getTypographyStyle from "../../lib/getTypographyStyle";

export default function FAQBlock({
    content,
    styles = {}
}) {

    const questionStyle =
        getTypographyStyle(
            styles,
            "title"
        );

    const answerStyle =
        getTypographyStyle(
            styles,
            "text"
        );

    const questionBackgroundColor =
        styles.questionBackgroundColor ||
        "var(--qr-surface)";

    const answerBackgroundColor =
        styles.answerBackgroundColor ||
        "var(--qr-surface)";

    const questionTextColor =
        styles.questionTextColor ||
        styles.textColor ||
        "var(--qr-text)";

    const answerTextColor =
        styles.answerTextColor ||
        styles.textColor ||
        "var(--qr-muted)";

    const items =
        Array.isArray(content.items)
            ? content.items
            : [];

    if (!items.length) {
        return null;
    }

    return (
        <div className="qr_public_faq">

            {
                items.map((item, index) => (

                    <details
                        key={index}
                        className="qr_public_faq_item"
                    >

                        <summary
                            className="qr_public_faq_question"
                            style={{
                                ...questionStyle,
                                backgroundColor:
                                    questionBackgroundColor,
                                color:
                                    questionTextColor
                            }}
                        >
                            {item.question}
                        </summary>

                        <div
                            className="qr_public_faq_answer"
                            style={{
                                backgroundColor:
                                    answerBackgroundColor
                            }}
                        >
                            <p
                                style={{
                                    ...answerStyle,
                                    color:
                                        answerTextColor
                                }}
                            >
                                {item.answer}
                            </p>
                        </div>

                    </details>

                ))
            }

        </div>
    );
}