import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

export default function ChatWindow({ messages, message, loading, error, onChange, onSubmit, onClose, scrollToIndex, title = "Asistente Tags", subtitle = "Te ayudamos a conocer nuestras soluciones" }) {
    const messagesRef = useRef(null);
    const scrollAnchorRef = useRef(null);

    useEffect(() => {
        if (scrollToIndex !== null && scrollToIndex !== undefined && scrollAnchorRef.current) {
            scrollAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages, loading, scrollToIndex]);

    return (
        <section className="tags_ai_chat_window" aria-label="Chat de Tags">
            <header className="tags_ai_chat_header">
                <div>
                    <strong>{title}</strong>
                    <small>{subtitle}</small>
                </div>
                <button type="button" className="tags_ai_chat_close" onClick={onClose} aria-label="Cerrar chat">×</button>
            </header>

            <div ref={messagesRef} className="tags_ai_chat_messages" aria-live="polite">
                {messages.map((item, index) => (
                    <div key={`${item.role}-${index}`} ref={index === scrollToIndex ? scrollAnchorRef : undefined}>
                        <ChatMessage {...item} />
                    </div>
                ))}
                {loading && <div className="tags_ai_chat_loading">Escribiendo…</div>}
                {error && <div className="tags_ai_chat_error">{error}</div>}
            </div>

            <form className="tags_ai_chat_form" onSubmit={onSubmit}>
                <input
                    value={message}
                    onChange={event => onChange(event.target.value)}
                    placeholder="Escribí tu pregunta…"
                    maxLength={1200}
                    disabled={loading}
                    aria-label="Pregunta"
                />
                <button type="submit" disabled={loading || !message.trim()}>Enviar</button>
            </form>
        </section>
    );
}
