function parseJson(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
}

const MUCHI_IMAGES = {
  tourist: {
    idle: "/assets/destination-ai/muchi/tourist-idle.webp",
    wave: "/assets/destination-ai/muchi/tourist-wave.webp",
    blink: "/assets/destination-ai/muchi/tourist-blink.webp",
    tail: "/assets/destination-ai/muchi/tourist-tail.webp",
  },
  resident: {
    idle: "/assets/destination-ai/muchi/resident-idle.webp",
    wave: "/assets/destination-ai/muchi/resident-wave.webp",
    blink: "/assets/destination-ai/muchi/resident-blink.webp",
    tail: "/assets/destination-ai/muchi/resident-tail.webp",
  },
};

export function getDestinationAssistantConfig(site, overrides = {}) {
  if (!site) return null;
  const directoryConfig = parseJson(site.directory_config);
  const configured = directoryConfig.destinationAssistant || {};
  const isMuchi = site.code === "calamuchitar";
  const enabled = configured.enabled ?? isMuchi;
  if (!enabled) return null;
  const interactionMode = ["text_text", "voice_text", "voice_voice"].includes(configured.interactionMode)
    ? configured.interactionMode
    : configured.voiceResponseEnabled ? "voice_voice" : "voice_text";

  return {
    assistantType: "destination",
    siteCode: site.code,
    title: configured.title || (isMuchi ? "Muchi · Tu asistente del Valle" : `Asistente de ${site.name}`),
    subtitle: configured.subtitle || "Información real del directorio",
    greeting: configured.greeting || (isMuchi
      ? "¡Hola! Soy Muchi. ¿Estás de visita o vivís en Calamuchita?"
      : `¡Hola! Soy el asistente de ${site.name}. ¿Estás de visita o vivís en la zona?`),
    primaryColor: configured.primaryColor || "#1b6d4b",
    launcherColor: configured.launcherColor || "transparent",
    launcherPrompt: configured.launcherPrompt || "¡Hola! ¿Te ayudo?",
    characterTitle: configured.characterTitle || (isMuchi ? "¡Hola! Soy Muchi!" : "¡Hola!"),
    characterButtonLabel: configured.characterButtonLabel || (isMuchi ? "Charlá con Muchi" : "Iniciar conversación"),
    menuLabel: configured.menuLabel || (isMuchi ? "Charlá con Muchi" : "Asistente"),
    launcherOffsetBottom: Number(configured.launcherOffsetBottom ?? 12),
    position: configured.position || "right",
    interactionMode,
    voiceInputEnabled: interactionMode !== "text_text",
    voiceResponseEnabled: interactionMode === "voice_voice",
    character: isMuchi ? { name: "Muchi", images: MUCHI_IMAGES } : null,
    ...overrides,
  };
}
