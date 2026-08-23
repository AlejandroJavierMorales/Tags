(function () {
    "use strict";

    var script = document.currentScript;
    if (!script) {
        var scripts = document.getElementsByTagName("script");
        for (var i = scripts.length - 1; i >= 0; i -= 1) {
            if ((scripts[i].src || "").indexOf("/embed/ai-chat.js") !== -1) {
                script = scripts[i];
                break;
            }
        }
    }
    if (!script) return;

    var businessId = script.getAttribute("data-business-id");
    var domain = script.getAttribute("data-domain") || "";
    var surfaceId = script.getAttribute("data-surface-id") || "0";
    var surfaceType = script.getAttribute("data-surface-type") || "external";
    var requestedPosition = script.getAttribute("data-position") || "";
    if (!businessId && !domain) return;

    var baseUrl = new URL(script.src).origin;
    var iframe = document.createElement("iframe");
    var query = new URLSearchParams({ surface_type: surfaceType, surface_id: surfaceId });
    if (businessId) query.set("business_id", businessId);
    if (domain) query.set("domain", domain);

    iframe.src = baseUrl + "/embed/ai-chat?" + query.toString();
    iframe.title = "Chat de asistencia";
    iframe.setAttribute("aria-label", "Chat de asistencia");
    iframe.setAttribute("allow", "clipboard-write");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "120px";
    iframe.style.zIndex = "2147483000";
    iframe.style.width = "100px";
    iframe.style.height = "80px";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.style.colorScheme = "normal";
    iframe.style.transition = "width .2s ease, height .2s ease";
    iframe.setAttribute("scrolling", "no");

    var currentPosition = requestedPosition === "left" ? "left" : "right";
    var currentOffset = 120;

    function place(position) {
        currentPosition = position === "left" ? "left" : "right";
        if (currentPosition === "left") {
            iframe.style.left = "5px";
            iframe.style.right = "auto";
        } else {
            iframe.style.right = "5px";
            iframe.style.left = "auto";
        }
    }

    place(currentPosition);

    function resize(open) {
        if (!open) {
            iframe.style.width = "100px";
            iframe.style.height = "80px";
            iframe.style.bottom = Math.max(0, Math.min(400, currentOffset)) + "px";
            return;
        }

        iframe.style.width = Math.min(400, window.innerWidth) + "px";
        iframe.style.height = Math.max(560, Math.min(720, window.innerHeight)) + "px";
        iframe.style.bottom = "0";
    }

    window.addEventListener("message", function (event) {
        if (event.source !== iframe.contentWindow) return;
        if (event.data && event.data.type === "tags-ai-chat-resize") {
            place(event.data.position);
            currentOffset = Number(event.data.launcherOffsetBottom || 120);
            resize(Boolean(event.data.open));
        }
    });

    window.addEventListener("resize", function () {
        if (iframe.style.width !== "100px") resize(true);
    });

    document.body.appendChild(iframe);
})();
