"use client";

import { useEffect, useState } from "react";
import { FaComments, FaRobot, FaXmark } from "react-icons/fa6";
import ChatWindow from "./ChatWindow";
import "./ChatWidget.css";

const initialMessage = {
    role: "assistant",
    content: "Hola, soy el asistente de Tags. ¿Qué solución o funcionalidad querés conocer?"
};

export default function ChatWidget({ config = null }) {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [messages, setMessages] = useState([{ ...initialMessage, content: config?.greeting || initialMessage.content }]);
    const [scrollToIndex, setScrollToIndex] = useState(null);

    useEffect(() => {
        if (typeof window !== "undefined" && window.parent !== window) {
            const notifyParent = () => window.parent.postMessage({
                type: "tags-ai-chat-resize",
                open,
                position: config?.position || "right",
                launcherOffsetBottom: Number(config?.launcherOffsetBottom ?? 120)
            }, "*");

            notifyParent();
            const retry = window.setTimeout(notifyParent, 80);
            return () => window.clearTimeout(retry);
        }
    }, [open, config?.position, config?.launcherOffsetBottom]);

    async function submit(event) {
        event.preventDefault();
        const question = message.trim();
        if (!question || loading) return;

        const nextMessages = [...messages, { role: "user", content: question }];
        setMessages(nextMessages);
        setScrollToIndex(nextMessages.length - 1);
        setMessage("");
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: question,
                    businessId: Number(config?.businessId || 0),
                    history: nextMessages.slice(-6)
                })
            });
            const payload = await response.json();

            if (!response.ok || !payload.success) {
                throw new Error(payload.error || "No pudimos responder en este momento.");
            }

            setMessages(current => [...current, { role: "assistant", content: payload.answer }]);
        } catch (requestError) {
            setError(requestError.message || "No pudimos responder en este momento.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`tags_ai_chat_widget${config?.embedded ? " tags_ai_chat_widget_embedded" : ""}`} data-position={config?.position || "right"} data-open={open ? "true" : "false"} style={{ "--tags-ai-primary": config?.primaryColor || "#1f9d55", "--tags-ai-launcher": config?.launcherColor || "#1f9d55" }}>
            {open && (
                <ChatWindow
                    messages={messages}
                    message={message}
                    loading={loading}
                    error={error}
                    onChange={setMessage}
                    onSubmit={submit}
                    onClose={() => setOpen(false)}
                    scrollToIndex={scrollToIndex}
                    title={config?.title}
                    subtitle={config?.subtitle}
                />
            )}
            <button
                type="button"
                className="tags_ai_chat_launcher"
                style={{ bottom: `${config?.embedded ? 0 : Number(config?.launcherOffsetBottom ?? 100)}px` }}
                onClick={() => setOpen(value => !value)}
                aria-label={open ? "Cerrar asistente de Tags" : "Abrir asistente de Tags"}
            >
                {open ? <FaXmark /> : config?.widgetType === "robot" ? <FaRobot /> : <FaComments />}
            </button>
        </div>
    );
}
