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

const RUTI_IMAGES = {
  idle: "/assets/images/ruti/Ruti_1_idle_640x960.png",
  wave: "/assets/images/ruti/Ruti_2_saludo_ok_640x960.png",
  blink: "/assets/images/ruti/Ruti_3_pestaneo_640x960.png",
  tail: "/assets/images/ruti/Ruti_4_cola_movimiento_640x960.png",
};

export function getDestinationAssistantConfig(site, overrides = {}) {
  if (!site) return null;
  const directoryConfig = parseJson(site.directory_config);
  const configured = directoryConfig.destinationAssistant || {};
  const isMuchi = site.code === "calamuchitar";
  const isRuti = site.code === "ruta100cordoba";
  const enabled = configured.enabled ?? (isMuchi || isRuti);
  if (!enabled) return null;
  const interactionMode = ["text_text", "voice_text", "voice_voice"].includes(configured.interactionMode)
    ? configured.interactionMode
    : configured.voiceResponseEnabled ? "voice_voice" : "voice_text";

  return {
    assistantType: "destination",
    siteCode: site.code,
    assistantName: isRuti ? "Ruti" : isMuchi ? "Muchi" : (configured.assistantName || "El asistente"),
    title: configured.title || (isMuchi ? "Muchi · Tu asistente del Valle" : isRuti ? "Ruti · Tu guía por Ruta 100 Córdoba" : `Asistente de ${site.name}`),
    subtitle: configured.subtitle || (isMuchi ? "Tu guía para descubrir Calamuchita" : isRuti ? "Pueblos, paisajes y experiencias" : `Información útil de ${site.name}`),
    greeting: configured.greeting || (isMuchi
      ? "¡Hola! Soy Muchi. ¿Estás de visita o vivís en Calamuchita?"
      : isRuti ? "¡Hola! Soy Ruti. ¿Qué te gustaría descubrir por la Ruta 100 de Córdoba?"
      : `¡Hola! Soy el asistente de ${site.name}. ¿Estás de visita o vivís en la zona?`),
    primaryColor: configured.primaryColor || (isRuti ? "#6b2e0c" : "#1b6d4b"),
    launcherColor: configured.launcherColor || "transparent",
    launcherPrompt: configured.launcherPrompt || "¡Hola! ¿Te ayudo?",
    characterTitle: configured.characterTitle || (isMuchi ? "¡Hola! Soy Muchi!" : isRuti ? "¡Hola! Soy Ruti!" : "¡Hola!"),
    characterButtonLabel: configured.characterButtonLabel || (isMuchi ? "Charlá con Muchi" : isRuti ? "Charlá con Ruti" : "Iniciar conversación"),
    menuLabel: configured.menuLabel || (isMuchi ? "Charlá con Muchi" : isRuti ? "Charlá con Ruti" : "Asistente"),
    launcherOffsetBottom: Number(configured.launcherOffsetBottom ?? 12),
    locationBounds: isMuchi ? { minLatitude: -33.15, maxLatitude: -31.35, minLongitude: -65.35, maxLongitude: -63.7 } : null,
    position: configured.position || "right",
    interactionMode,
    voiceInputEnabled: interactionMode !== "text_text",
    voiceResponseEnabled: interactionMode === "voice_voice",
    character: isMuchi
      ? { type: "muchi", name: "Muchi", images: MUCHI_IMAGES }
      : isRuti ? { type: "ruti", name: "Ruti", images: RUTI_IMAGES } : null,
    ...overrides,
  };
}
