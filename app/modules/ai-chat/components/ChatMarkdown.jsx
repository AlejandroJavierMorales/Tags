function renderInline(text, keyPrefix) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={`${keyPrefix}-bold-${index}`}>{part.slice(2, -2)}</strong>;
        }

        return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
    });
}

export default function ChatMarkdown({ content }) {
    const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let list = [];

    function flushList() {
        if (!list.length) return;
        blocks.push(
            <ul key={`list-${blocks.length}`}>
                {list.map((item, index) => (
                    <li key={`item-${index}`}>{renderInline(item, `list-${index}`)}</li>
                ))}
            </ul>
        );
        list = [];
    }

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
            list.push(trimmed.slice(2).trim());
            return;
        }

        flushList();

        if (!trimmed) return;

        if (trimmed.startsWith("### ")) {
            blocks.push(<h5 key={`heading-${index}`}>{renderInline(trimmed.slice(4), `heading-${index}`)}</h5>);
            return;
        }

        if (trimmed.startsWith("## ")) {
            blocks.push(<h4 key={`heading-${index}`}>{renderInline(trimmed.slice(3), `heading-${index}`)}</h4>);
            return;
        }

        blocks.push(<p key={`paragraph-${index}`}>{renderInline(trimmed, `paragraph-${index}`)}</p>);
    });

    flushList();

    return <div className="tags_ai_chat_markdown">{blocks}</div>;
}
