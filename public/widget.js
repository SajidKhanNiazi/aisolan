(function () {
  "use strict";

  // Prevent multiple instantiations on the same page
  if (window.__BOOKZELLO_WIDGET_INITIALIZED__) return;
  window.__BOOKZELLO_WIDGET_INITIALIZED__ = true;

  // 1. Locate the current script tag and extract configuration
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) {
          return scripts[i];
        }
      }
      return scripts[scripts.length - 1];
    })();

  var salonSlug =
    (currentScript && currentScript.getAttribute("data-salon")) ||
    (currentScript && currentScript.getAttribute("data-business")) ||
    "bookpilot-qa-salon";

  var widgetId = (currentScript && currentScript.getAttribute("data-widget-id")) || "";
  var position = (currentScript && currentScript.getAttribute("data-position")) || "bottom-right";
  var primaryColor = (currentScript && currentScript.getAttribute("data-primary-color")) || "#1852E8";
  var buttonText = (currentScript && currentScript.getAttribute("data-button-text")) || "Book Appointment";

  // Determine base host URL (where widget.js is hosted)
  var scriptSrc = currentScript && currentScript.src;
  var baseUrl = "https://bookzello.com";
  if (scriptSrc) {
    try {
      var parsedUrl = new URL(scriptSrc);
      baseUrl = parsedUrl.origin;
    } catch {
      // Fallback to bookzello.com
    }
  }

  // 2. State
  var isOpen = false;

  // 3. Create Styles
  var style = document.createElement("style");
  style.id = "bookzello-widget-styles";
  var isLeft = position === "bottom-left";

  style.textContent = [
    "#bookzello-launcher-btn {",
    "  position: fixed;",
    "  bottom: 24px;",
    isLeft ? "  left: 24px;" : "  right: 24px;",
    "  z-index: 999990;",
    "  display: inline-flex;",
    "  align-items: center;",
    "  gap: 10px;",
    "  padding: 12px 20px;",
    "  border-radius: 9999px;",
    "  background: " + primaryColor + ";",
    "  color: #ffffff;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;",
    "  font-size: 14px;",
    "  font-weight: 600;",
    "  line-height: 1.4;",
    "  border: none;",
    "  cursor: pointer;",
    "  box-shadow: 0 8px 24px -4px rgba(24, 82, 232, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.1);",
    "  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, opacity 0.2s ease;",
    "  outline: none;",
    "  user-select: none;",
    "}",
    "#bookzello-launcher-btn:hover {",
    "  transform: translateY(-2px);",
    "  box-shadow: 0 12px 28px -4px rgba(24, 82, 232, 0.5), 0 6px 16px -2px rgba(0, 0, 0, 0.15);",
    "}",
    "#bookzello-launcher-btn:active {",
    "  transform: translateY(0);",
    "}",
    "#bookzello-launcher-btn svg {",
    "  width: 18px;",
    "  height: 18px;",
    "  fill: none;",
    "  stroke: currentColor;",
    "  stroke-width: 2;",
    "  stroke-linecap: round;",
    "  stroke-linejoin: round;",
    "}",
    "#bookzello-widget-container {",
    "  position: fixed;",
    "  bottom: 84px;",
    isLeft ? "  left: 24px;" : "  right: 24px;",
    "  width: 420px;",
    "  max-width: calc(100vw - 32px);",
    "  height: 680px;",
    "  max-height: calc(100vh - 100px);",
    "  z-index: 999995;",
    "  border-radius: 20px;",
    "  overflow: hidden;",
    "  box-shadow: 0 20px 48px -8px rgba(4, 15, 40, 0.22), 0 10px 20px -4px rgba(4, 15, 40, 0.12);",
    "  border: 1px solid rgba(226, 232, 240, 0.9);",
    "  background: #ffffff;",
    "  opacity: 0;",
    "  pointer-events: none;",
    "  transform: translateY(16px) scale(0.98);",
    "  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);",
    "}",
    "#bookzello-widget-container.is-open {",
    "  opacity: 1;",
    "  pointer-events: auto;",
    "  transform: translateY(0) scale(1);",
    "}",
    "#bookzello-widget-iframe {",
    "  width: 100%;",
    "  height: 100%;",
    "  border: none;",
    "  display: block;",
    "}",
    "@media (max-width: 640px) {",
    "  #bookzello-widget-container {",
    "    bottom: 0 !important;",
    "    left: 0 !important;",
    "    right: 0 !important;",
    "    top: 0 !important;",
    "    width: 100vw !important;",
    "    max-width: 100vw !important;",
    "    height: 100% !important;",
    "    max-height: 100% !important;",
    "    border-radius: 0 !important;",
    "    border: none !important;",
    "  }",
    "  #bookzello-launcher-btn.is-hidden {",
    "    display: none !important;",
    "  }",
    "}"
  ].join("\n");

  document.head.appendChild(style);

  // 4. Create Launcher Button
  var launcherBtn = document.createElement("button");
  launcherBtn.id = "bookzello-launcher-btn";
  launcherBtn.setAttribute("type", "button");
  launcherBtn.setAttribute("aria-label", "Open appointment booking chat");
  launcherBtn.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
    '<span>' + buttonText + '</span>';

  // 5. Create Iframe Container
  var container = document.createElement("div");
  container.id = "bookzello-widget-container";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-hidden", "true");

  var iframeUrl = baseUrl + "/embed/" + encodeURIComponent(salonSlug);
  if (widgetId) {
    iframeUrl += "?widgetId=" + encodeURIComponent(widgetId);
  }

  var iframe = document.createElement("iframe");
  iframe.id = "bookzello-widget-iframe";
  iframe.setAttribute("src", iframeUrl);
  iframe.setAttribute("title", "Bookzello AI Receptionist & Booking");
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("loading", "lazy");

  container.appendChild(iframe);
  document.body.appendChild(container);
  document.body.appendChild(launcherBtn);

  // 6. Interaction Handlers
  function openWidget() {
    isOpen = true;
    container.classList.add("is-open");
    container.setAttribute("aria-hidden", "false");
    launcherBtn.classList.add("is-hidden");
    // Notify iframe
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "bookzello:open" }, baseUrl);
    }
  }

  function closeWidget() {
    isOpen = false;
    container.classList.remove("is-open");
    container.setAttribute("aria-hidden", "true");
    launcherBtn.classList.remove("is-hidden");
    launcherBtn.focus();
    // Notify iframe
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "bookzello:close" }, baseUrl);
    }
  }

  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  launcherBtn.addEventListener("click", toggleWidget);

  // 7. Cross-Origin PostMessage Communication
  window.addEventListener("message", function (event) {
    // Validate message origin
    if (event.origin !== baseUrl) {
      // In local dev, allow matching localhost
      var isLocalDev =
        (baseUrl.indexOf("localhost") !== -1 || baseUrl.indexOf("127.0.0.1") !== -1) &&
        (event.origin.indexOf("localhost") !== -1 || event.origin.indexOf("127.0.0.1") !== -1);
      if (!isLocalDev) return;
    }

    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "bookzello:close") {
      closeWidget();
    } else if (data.type === "bookzello:booking-success") {
      if (typeof window.onBookzelloBookingSuccess === "function") {
        try {
          window.onBookzelloBookingSuccess(data.payload);
        } catch (e) {
          console.error("[Bookzello Widget] Callback error:", e);
        }
      }
    }
  });

  // Global API
  window.BookzelloWidget = {
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
  };
})();
