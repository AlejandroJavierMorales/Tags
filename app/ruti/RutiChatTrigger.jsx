"use client";

export default function RutiChatTrigger() {
  function openChat() {
    window.dispatchEvent(new CustomEvent("tags:destination-assistant:open", { detail: { mode: "tourist" } }));
  }

  return <button type="button" className="tags_ruti_invitation" onClick={openChat}>Tocá a Ruti para comenzar la conversación.</button>;
}
