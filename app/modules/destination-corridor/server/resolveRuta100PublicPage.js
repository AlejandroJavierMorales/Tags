import { headers } from "next/headers";
import { getChannelContextFromHost, getHeadersHost } from "@/app/lib/channelContext";
import { getRuta100ExperienceBySlug, getRuta100PublicData } from "./getRuta100PublicData";

export async function resolveRuta100PublicPage(experienceSlug = null) {
  const requestHeaders = await headers();
  const channel = await getChannelContextFromHost(getHeadersHost(requestHeaders));
  if (channel?.code !== "ruta100cordoba" || !channel.siteId) return null;

  const data = experienceSlug
    ? await getRuta100ExperienceBySlug(channel.siteId, experienceSlug)
    : await getRuta100PublicData(channel.siteId);
  if (!data) return null;

  const publicHost = channel.primaryHost || channel.host || "ruta100cordoba.com";
  return { ...data, channel, baseUrl: `https://${publicHost}` };
}

export function ruta100Robots(data) {
  const index = Boolean(data?.fullyPublished);
  return {
    index,
    follow: index,
    googleBot: {
      index,
      follow: index,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}
