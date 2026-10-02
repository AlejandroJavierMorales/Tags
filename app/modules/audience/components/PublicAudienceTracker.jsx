"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const BLOCKED_PREFIXES = ["/api", "/dashboard", "/login", "/mi-cuenta", "/auth"];

function identifier(storage, key) {
  try {
    let value = storage.getItem(key);
    if (!value) {
      value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      storage.setItem(key, value);
    }
    return value;
  } catch {
    return null;
  }
}

function eventBase() {
  const params = new URLSearchParams(window.location.search);
  return {
    host: window.location.hostname,
    path: window.location.pathname,
    visitorId: identifier(window.localStorage, "tags_audience_visitor"),
    sessionId: identifier(window.sessionStorage, "tags_audience_session"),
    referrer: document.referrer || null,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
  };
}

function send(payload) {
  const body = JSON.stringify({ ...eventBase(), ...payload });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/public/audience/events", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/public/audience/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

function clickData(target) {
  const element = target?.closest?.("a,button,[data-audience-action]");
  if (!element) return null;
  const href = element.getAttribute("href") || "";
  const explicit = element.dataset?.audienceAction;
  let eventKey = explicit || "interaction";
  if (/wa\.me|whatsapp/i.test(href)) eventKey = "whatsapp";
  else if (/^tel:/i.test(href)) eventKey = "phone";
  else if (/^mailto:/i.test(href)) eventKey = "email";
  else if (/google\.[^/]+\/maps|maps\.google|\/maps\?/i.test(href)) eventKey = "directions";
  else if (href && !href.startsWith("#")) eventKey = "navigation";
  else if (!explicit) return null;
  return {
    eventType: "action_click",
    eventKey,
    eventLabel: String(element.dataset?.audienceLabel || element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 255),
    targetUrl: href || null,
  };
}

export default function PublicAudienceTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() || "";

  useEffect(() => {
    const currentPath = pathname || window.location.pathname;
    if (BLOCKED_PREFIXES.some(prefix => currentPath === prefix || currentPath.startsWith(`${prefix}/`))) return undefined;
    const searchQuery = new URLSearchParams(queryString).get("q")?.trim() || null;
    const viewKey = `${window.location.host}${currentPath}?${queryString}`;
    let alreadyRecorded = false;
    try {
      const previous = JSON.parse(window.sessionStorage.getItem("tags_audience_last_view") || "null");
      alreadyRecorded = previous?.key === viewKey && Date.now() - Number(previous?.at || 0) < 1500;
      window.sessionStorage.setItem("tags_audience_last_view", JSON.stringify({ key: viewKey, at: Date.now() }));
    } catch {}
    if (!alreadyRecorded) {
      send({ eventType: "page_view", searchQuery });
      if (searchQuery) send({ eventType: "internal_search", eventKey: "directory_search", searchQuery });
    }
    const onClick = event => {
      const payload = clickData(event.target);
      if (payload) send(payload);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, queryString]);

  return null;
}
