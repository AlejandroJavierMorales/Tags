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

export default function RestoOrderChat({
    sessionToken,
    isSessionOpen
}) {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const listRef = useRef(null);

    const loadMessages = useCallback(async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true);

            const response = await fetch(
                "/api/resto/public/orders/messages",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sessionToken,
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

            setMessages(
                Array.isArray(data?.messages) ? data.messages : []
            );
            setError("");
        } catch (err) {
            if (!silent) setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [sessionToken]);

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
                "/api/resto/public/orders/messages",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        sessionToken,
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
        <section className="tags_resto_order_chat">
            <header className="tags_resto_order_chat_header">
                <FaComments />
                <div>
                    <h2>Mensajes con el restaurante</h2>
                    <p>Consultá o aclará cualquier detalle de tu pedido.</p>
                </div>
            </header>

            <div
                ref={listRef}
                className="tags_resto_order_chat_messages"
                aria-live="polite"
            >
                {loading ? (
                    <p className="tags_resto_order_chat_empty">
                        Cargando conversación...
                    </p>
                ) : messages.length ? (
                    messages.map(item => (
                        <article
                            key={item.id}
                            className={
                                `tags_resto_order_chat_message ` +
                                `tags_resto_order_chat_message_${item.sender_type}`
                            }
                        >
                            <strong>
                                {item.sender_type === "customer"
                                    ? "Vos"
                                    : item.sender_name || "Restaurante"}
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
                    ))
                ) : (
                    <p className="tags_resto_order_chat_empty">
                        Todavía no hay mensajes.
                    </p>
                )}
            </div>

            {error && (
                <p className="tags_resto_order_chat_error">{error}</p>
            )}

            {isSessionOpen && (
                <form
                    className="tags_resto_order_chat_form"
                    onSubmit={sendMessage}
                >
                    <textarea
                        value={message}
                        maxLength={2000}
                        rows={2}
                        placeholder="Escribí tu mensaje..."
                        onChange={event => setMessage(event.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim() || sending}
                    >
                        <FaPaperPlane />
                        {sending ? "Enviando..." : "Enviar"}
                    </button>
                </form>
            )}
        </section>
    );
}
