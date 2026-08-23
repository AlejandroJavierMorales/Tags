import ChatMarkdown from "./ChatMarkdown";

export default function ChatMessage({ role, content }) {
    return (
        <div className={`tags_ai_chat_message tags_ai_chat_message_${role}`}>
            <div className="tags_ai_chat_message_bubble">
                <ChatMarkdown content={content} />
            </div>
        </div>
    );
}
