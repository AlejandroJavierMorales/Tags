import { useEffect, useRef } from "react";
import { FaLocationCrosshairs, FaMicrophone, FaStop, FaVolumeHigh, FaVolumeXmark } from "react-icons/fa6";
import ChatMessage from "./ChatMessage";

export default function ChatWindow({ messages, message, loading, error, onChange, onSubmit, onClose, scrollToIndex, title = "Asistente Tags", subtitle = "Te ayudamos a conocer nuestras soluciones", mode, onModeChange, suggestions = [], onSuggestion, voice, location }) {
    const messagesRef = useRef(null);
    const scrollAnchorRef = useRef(null);

    useEffect(() => {
        if (scrollToIndex !== null && scrollToIndex !== undefined && scrollAnchorRef.current) {
            scrollAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages, loading, scrollToIndex]);

    return <section className="tags_ai_chat_window" aria-label="Chat de Tags">
        <header className="tags_ai_chat_header">
            <div><strong>{title}</strong><small>{subtitle}</small></div>
            <button type="button" className="tags_ai_chat_close" onClick={onClose} aria-label="Cerrar asistente">×</button>
        </header>
        <div ref={messagesRef} className="tags_ai_chat_messages" aria-live="polite">
            {onModeChange && <div className="tags_destination_modes" aria-label="Elegí cómo querés usar el asistente">
                <button type="button" data-active={mode === "tourist"} onClick={() => onModeChange("tourist")}>Estoy de visita</button>
                <button type="button" data-active={mode === "resident"} onClick={() => onModeChange("resident")}>Vivo acá</button>
            </div>}
            {location && <button type="button" className="tags_destination_location" data-status={location.status} onClick={location.request} disabled={location.status === "loading" || location.status === "ready" || location.status === "outside"}><FaLocationCrosshairs /> {location.status === "ready" ? "Ubicación activada" : location.status === "outside" ? "Estás fuera de Calamuchita" : location.status === "loading" ? "Obteniendo ubicación…" : "Usar mi ubicación para calcular distancias"}</button>}
            {messages.map((item, index) => <div key={`${item.role}-${index}`} ref={index === scrollToIndex ? scrollAnchorRef : undefined}><ChatMessage {...item} /></div>)}
            {loading && <div className="tags_ai_chat_loading">Muchi está pensando…</div>}
            {voice?.transcribing && <div className="tags_ai_chat_loading">Entendiendo tu mensaje de voz…</div>}
            {error && <div className="tags_ai_chat_error">{error}</div>}
        </div>
        {suggestions.length>0&&onSuggestion&&<div className="tags_ai_chat_suggestions" aria-label="Podés seguir preguntando">{suggestions.map(prompt=><button type="button" key={prompt} onClick={()=>onSuggestion(prompt)} disabled={loading}>{prompt}</button>)}</div>}
        <form className="tags_ai_chat_form" onSubmit={onSubmit}>
            {voice && <button type="button" className={`tags_ai_chat_voice_button${voice.recording ? " is_recording" : ""}`} onClick={voice.recording ? voice.stop : voice.start} disabled={loading || voice.transcribing} aria-label={voice.recording ? "Detener grabación" : "Hablar con Muchi"}>{voice.recording ? <FaStop /> : <FaMicrophone />}</button>}
            <input value={message} onChange={event => onChange(event.target.value)} placeholder={voice?.recording ? "Te escucho…" : "Escribí o hablá con Muchi…"} maxLength={1200} disabled={loading || voice?.transcribing} aria-label="Pregunta" />
            <button type="submit" disabled={loading || voice?.transcribing || !message.trim()}>Enviar</button>
        </form>
        {voice?.responseEnabled && <div className="tags_ai_chat_voice_footer">
            <div><button type="button" onClick={voice.toggleSpeech} aria-label={voice.speechEnabled ? "Silenciar respuestas" : "Activar respuestas habladas"}>{voice.speechEnabled ? <FaVolumeHigh /> : <FaVolumeXmark />}{voice.speechEnabled ? " Voz activada" : " Voz desactivada"}</button>{voice.canReplay && <button type="button" onClick={voice.replay}><FaVolumeHigh /> Escuchar última</button>}</div>
            <small>La voz de Muchi es generada por IA.</small>
        </div>}
    </section>;
}
