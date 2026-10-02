"use client";

import { useEffect, useRef, useState } from "react";
import { FaComments, FaRobot, FaXmark } from "react-icons/fa6";
import ChatWindow from "./ChatWindow";
import MuchiCharacter from "@/app/modules/destination-ai/components/MuchiCharacter";
import "./ChatWidget.css";

const initialMessage = { role: "assistant", content: "Hola, soy el asistente de Tags. ¿Qué solución o funcionalidad querés conocer?" };

export default function ChatWidget({ config = null }) {
    const destination = config?.assistantType === "destination";
    const [open, setOpen] = useState(Boolean(config?.initialOpen));
    const [visible, setVisible] = useState(true);
    const [mode, setMode] = useState(config?.initialMode || (destination ? "tourist" : null));
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [messages, setMessages] = useState([{ ...initialMessage, content: config?.greeting || initialMessage.content }]);
    const [scrollToIndex, setScrollToIndex] = useState(null);
    const [recording, setRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [speechEnabled, setSpeechEnabled] = useState(Boolean(config?.voiceResponseEnabled));
    const [lastAnswer, setLastAnswer] = useState("");
    const [userLocation, setUserLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState("idle");
    const [conversationState, setConversationState] = useState(null);
    const [suggestedPrompts, setSuggestedPrompts] = useState([]);
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const audioRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const recordingStartedRef = useRef(0);
    const conversationIdRef = useRef("");
    const avatarSrc = config?.widgetType === "avatar_woman" ? "/assets/icons/chat_woman.webp" : config?.widgetType === "avatar_man" ? "/assets/icons/chat_men.webp" : null;

    useEffect(() => {
        if (!destination) return undefined;
        const show = event => { setVisible(true); setOpen(true); if (["tourist","resident"].includes(event?.detail?.mode)) setMode(event.detail.mode); if (event?.detail?.prompt) setMessage(String(event.detail.prompt)); };
        const changeMode = event => { if (["tourist","resident"].includes(event?.detail?.mode)) setMode(event.detail.mode); };
        window.addEventListener("tags:destination-assistant:open", show);
        window.addEventListener("tags:destination-assistant:mode", changeMode);
        return () => { window.removeEventListener("tags:destination-assistant:open", show); window.removeEventListener("tags:destination-assistant:mode", changeMode); };
    }, [destination]);

    useEffect(() => () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        audioRef.current?.pause();
        window.clearTimeout(recordingTimerRef.current);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && window.parent !== window) {
            const notifyParent = () => window.parent.postMessage({ type: "tags-ai-chat-resize", open, position: config?.position || "right", launcherOffsetBottom: Number(config?.launcherOffsetBottom ?? 120) }, "*");
            notifyParent();
            const retry = window.setTimeout(notifyParent, 80);
            return () => window.clearTimeout(retry);
        }
        return undefined;
    }, [open, config?.position, config?.launcherOffsetBottom]);

    async function speak(text) {
        if (!destination || !config?.voiceResponseEnabled || !speechEnabled || !text) return;
        try {
            audioRef.current?.pause();
            const response = await fetch("/api/ai/audio/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, siteCode: config?.siteCode }) });
            if (!response.ok) return;
            const url = URL.createObjectURL(await response.blob());
            const audio = new Audio(url);
            audioRef.current = audio;
            const release = () => URL.revokeObjectURL(url);
            audio.addEventListener("ended", release, { once: true });
            await audio.play().catch(release);
        } catch {}
    }

    async function sendQuestion(rawQuestion) {
        const question = String(rawQuestion || "").trim();
        if (!question || loading) return;
        const nextMessages = [...messages, { role: "user", content: question }];
        setMessages(nextMessages);
        setScrollToIndex(nextMessages.length - 1);
        setMessage("");
        setError("");
        setLoading(true);
        try {
            if (!conversationIdRef.current) conversationIdRef.current = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question, businessId: Number(config?.businessId || 0), siteCode: destination ? config?.siteCode : undefined, mode: destination ? mode : undefined, userLocation: destination ? userLocation : undefined, source: destination ? `destination:${config?.siteCode}` : undefined, conversationId: destination ? conversationIdRef.current : undefined, history: nextMessages.slice(-6), conversationState: destination ? conversationState : undefined })
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload.error || "No pudimos responder en este momento.");
            setMessages(current => [...current, { role: "assistant", content: payload.answer, candidates: payload.candidates || [] }]);
            if (destination && payload.conversationState) setConversationState(payload.conversationState);
            if (destination) setSuggestedPrompts(Array.isArray(payload.suggestedPrompts) ? payload.suggestedPrompts.slice(0,3) : []);
            setLastAnswer(payload.answer);
            await speak(payload.answer);
        } catch (requestError) {
            setError(requestError.message || "No pudimos responder en este momento.");
        } finally { setLoading(false); }
    }

    async function submit(event) {
        event.preventDefault();
        await sendQuestion(message);
    }

    async function startRecording() {
        setError("");
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            setError("Este navegador no permite grabar audio. Podés seguir escribiendo tu consulta.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const preferred = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(type => MediaRecorder.isTypeSupported(type));
            const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
            chunksRef.current = [];
            streamRef.current = stream;
            recorderRef.current = recorder;
            recorder.ondataavailable = event => { if (event.data?.size) chunksRef.current.push(event.data); };
            recorder.onstop = async () => {
                window.clearTimeout(recordingTimerRef.current);
                stream.getTracks().forEach(track => track.stop());
                setRecording(false);
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
                if (!blob.size) return;
                setTranscribing(true);
                try {
                    const form = new FormData();
                    form.set("audio", blob, blob.type.includes("mp4") ? "consulta.m4a" : "consulta.webm");
                    form.set("siteCode", String(config?.siteCode || ""));
                    form.set("durationSeconds", String(Math.max(0, (Date.now() - recordingStartedRef.current) / 1000)));
                    const response = await fetch("/api/ai/audio/transcribe", { method: "POST", body: form });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok || !payload.success) throw new Error(payload.error || "No pudimos entender el audio.");
                    setMessage(payload.text);
                    await sendQuestion(payload.text);
                } catch (voiceError) {
                    setError(voiceError.message || "No pudimos entender el audio.");
                } finally { setTranscribing(false); }
            };
            recorder.start();
            recordingStartedRef.current = Date.now();
            setRecording(true);
            recordingTimerRef.current = window.setTimeout(() => {
                if (recorder.state === "recording") recorder.stop();
            }, 45000);
        } catch {
            setError("No pudimos acceder al micrófono. Revisá el permiso del navegador o escribí tu consulta.");
        }
    }

    function stopRecording() {
        window.clearTimeout(recordingTimerRef.current);
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    }

    function requestLocation() {
        setError("");
        if (!navigator.geolocation) { setLocationStatus("unavailable"); setError("Este dispositivo no permite compartir la ubicación."); return; }
        setLocationStatus("loading");
        navigator.geolocation.getCurrentPosition(position => {
            const nextLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            const insideCalamuchita = nextLocation.latitude >= -33.15 && nextLocation.latitude <= -31.35 && nextLocation.longitude >= -65.35 && nextLocation.longitude <= -63.7;
            if (!insideCalamuchita) { setUserLocation(null); setLocationStatus("outside"); return; }
            setUserLocation(nextLocation);
            setLocationStatus("ready");
        }, () => {
            setLocationStatus("denied");
            setError("No pudimos acceder a tu ubicación. Podés indicar tu localidad escribiéndola.");
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    }

    function dismiss() {
        stopRecording();
        audioRef.current?.pause();
        setOpen(false);
    }

    if (!visible) return null;

    return <div className={`tags_ai_chat_widget${config?.embedded ? " tags_ai_chat_widget_embedded" : ""}${destination ? " tags_destination_widget" : ""}`} data-position={config?.position || "right"} data-open={open ? "true" : "false"} data-fullscreen={destination || config?.fullscreen ? "true" : "false"} style={{ "--tags-ai-primary": config?.primaryColor || "#1f9d55", "--tags-ai-launcher": config?.launcherColor || "#1f9d55", "--tags-ai-bottom": `${Number(config?.launcherOffsetBottom ?? 100)}px` }}>
        {open && <ChatWindow messages={messages} message={message} loading={loading} error={error} onChange={setMessage} onSubmit={submit} onClose={destination ? dismiss : () => setOpen(false)} scrollToIndex={scrollToIndex} title={config?.title} subtitle={config?.subtitle} mode={mode} onModeChange={destination ? nextMode => { setMode(nextMode); window.dispatchEvent(new CustomEvent("tags:destination-assistant:mode", { detail: { mode: nextMode } })); } : undefined} suggestions={suggestedPrompts} onSuggestion={destination ? sendQuestion : undefined} location={destination ? { status: locationStatus, request: requestLocation } : undefined} voice={destination && config?.voiceInputEnabled ? { recording, transcribing, responseEnabled: Boolean(config?.voiceResponseEnabled), speechEnabled, canReplay: Boolean(lastAnswer), start: startRecording, stop: stopRecording, replay: () => speak(lastAnswer), toggleSpeech: () => { audioRef.current?.pause(); setSpeechEnabled(value => !value); } } : undefined} />}
        {destination && config?.character ? <MuchiCharacter images={config.character.images} mode={mode || "tourist"} open={open} title={config.characterTitle} buttonLabel={config.characterButtonLabel} onDismiss={config?.dismissible ? () => setVisible(false) : undefined} onClick={() => config?.launchHref ? window.location.assign(config.launchHref) : setOpen(value => !value)} /> : <button type="button" className={`tags_ai_chat_launcher${avatarSrc ? " tags_ai_chat_launcher_avatar_mode" : ""}`} style={{ bottom: `${config?.embedded ? 0 : Number(config?.launcherOffsetBottom ?? 100)}px` }} onClick={() => setOpen(value => !value)} aria-label={open ? "Cerrar asistente de Tags" : "Abrir asistente de Tags"}>{open ? <FaXmark /> : avatarSrc ? <img className="tags_ai_chat_launcher_avatar" src={avatarSrc} alt="Asistente del chatbot" /> : config?.widgetType === "robot" ? <FaRobot /> : <FaComments />}</button>}
        {!open && config?.launcherPrompt && <span className="tags_ai_chat_launcher_prompt" style={{ bottom: `${(config?.embedded ? 0 : Number(config?.launcherOffsetBottom ?? 100)) + 64}px`, fontSize: `${Number(config.launcherPromptSize || 12)}px` }}>{config.launcherPrompt}</span>}
    </div>;
}
