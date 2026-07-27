"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";

import {
    FaComments,
    FaPaperPlane
} from "react-icons/fa";

export default function RestoOrderMessages({
    businessId,
    orderId,
    isOpen = true,
    unreadCount = 0,
    needsReply = false,
    onMessagesRead
}) {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const listRef = useRef(null);

    const loadMessages = useCallback(async ({ silent = false } = {}) => {
        try {
            const response = await fetch(
                "/api/resto/admin/orders/messages",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        businessId,
                        orderId,
                        action: "list"
                    })
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo cargar la conversación."
                );
            }

            setMessages(data.messages || []);
            setError("");
            onMessagesRead?.();
        } catch (err) {
            if (!silent) setError(err.message);
        }
    }, [businessId, orderId, onMessagesRead]);

    useEffect(() => {
        loadMessages();
        const interval = window.setInterval(
            () => loadMessages({ silent: true }),
            5000
        );
        return () => window.clearInterval(interval);
    }, [loadMessages]);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop =
                listRef.current.scrollHeight;
        }
    }, [messages]);

    async function sendMessage(event) {
        event.preventDefault();
        const content = message.trim();
        if (!content || sending) return;

        try {
            setSending(true);
            const response = await fetch(
                "/api/resto/admin/orders/messages",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        businessId,
                        orderId,
                        action: "send",
                        message: content
                    })
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    "No se pudo enviar el mensaje."
                );
            }

            setMessages(data.messages || []);
            setMessage("");
            setError("");
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="tags_resto_admin_chat">
            <header className="tags_resto_admin_chat_header">
                <FaComments />
                <div>
                    <h2>Mensajes del pedido</h2>
                    <p>Conversación directa con el cliente.</p>
                </div>
                {
                    Number(unreadCount) > 0
                        ? (
                            <span className="tags_resto_admin_chat_status tags_resto_admin_chat_status_unread">
                                {unreadCount} nuevo{Number(unreadCount) === 1 ? "" : "s"}
                            </span>
                        )
                        : needsReply && (
                            <span className="tags_resto_admin_chat_status">
                                Sin responder
                            </span>
                        )
                }
            </header>

            <div
                ref={listRef}
                className="tags_resto_admin_chat_messages"
            >
                {messages.length ? messages.map(item => (
                    <article
                        key={item.id}
                        className={
                            `tags_resto_admin_chat_message ` +
                            `tags_resto_admin_chat_message_${item.sender_type}`
                        }
                    >
                        <strong>
                            {item.sender_type === "staff"
                                ? item.sender_name || "Restaurante"
                                : item.sender_name || "Cliente"}
                        </strong>
                        <p>{item.message}</p>
                        <time>
                            {new Date(item.created_at).toLocaleString(
                                "es-AR",
                                {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                }
                            )}
                        </time>
                    </article>
                )) : (
                    <p className="tags_resto_admin_chat_empty">
                        Todavía no hay mensajes.
                    </p>
                )}
            </div>

            {error && (
                <p className="tags_resto_admin_chat_error">{error}</p>
            )}

            {isOpen && (
                <form
                    className="tags_resto_admin_chat_form"
                    onSubmit={sendMessage}
                >
                    <textarea
                        value={message}
                        rows={2}
                        maxLength={2000}
                        placeholder="Responder al cliente..."
                        onChange={event => setMessage(event.target.value)}
                    />
                    <button
                        type="submit"
                        className="tags_resto_btn tags_resto_btn_primary"
                        disabled={!message.trim() || sending}
                    >
                        <FaPaperPlane />
                        {sending ? "Enviando..." : "Responder"}
                    </button>
                </form>
            )}
        </section>
    );
}
