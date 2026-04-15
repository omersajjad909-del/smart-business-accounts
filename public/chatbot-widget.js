/**
 * FinovaOS Website Chatbot Widget
 *
 * Embed on any website with:
 *   <script src="https://your-domain.com/chatbot-widget.js"
 *           data-token="YOUR_WIDGET_TOKEN"
 *           data-color="#7c3aed"
 *           data-title="Chat with us"
 *           data-api="https://your-domain.com/api/chatbot">
 *   </script>
 */
(function () {
  "use strict";

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var token = script.getAttribute("data-token");
  var primaryColor = script.getAttribute("data-color") || "#7c3aed";
  var title = script.getAttribute("data-title") || "Chat with us";
  var apiBase = script.getAttribute("data-api") || "";

  if (!token) { console.warn("[FinovaOS Chatbot] Missing data-token attribute"); return; }
  if (!apiBase) { console.warn("[FinovaOS Chatbot] Missing data-api attribute"); return; }

  var sessionId = null;
  var isOpen = false;
  var messages = [];

  // ── Styles ───────────────────────────────────────────────────────────────────
  var css = [
    "#fnv-chat-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;transition:transform .2s;background:" + primaryColor + "}",
    "#fnv-chat-btn:hover{transform:scale(1.08)}",
    "#fnv-chat-widget{position:fixed;bottom:96px;right:24px;width:360px;height:520px;border-radius:16px;z-index:99998;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);transition:transform .25s,opacity .25s;transform:scale(0.95) translateY(10px);opacity:0;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
    "#fnv-chat-widget.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}",
    "#fnv-chat-header{padding:14px 16px;background:" + primaryColor + ";color:#fff;display:flex;align-items:center;justify-content:space-between}",
    "#fnv-chat-header h3{margin:0;font-size:15px;font-weight:600}",
    "#fnv-chat-close{background:none;border:none;color:#fff;cursor:pointer;font-size:18px;line-height:1;opacity:.8;padding:0}",
    "#fnv-chat-close:hover{opacity:1}",
    "#fnv-chat-body{flex:1;overflow-y:auto;padding:12px;background:#1a1a2e;display:flex;flex-direction:column;gap:8px}",
    "#fnv-chat-body::-webkit-scrollbar{width:4px}",
    "#fnv-chat-body::-webkit-scrollbar-track{background:transparent}",
    "#fnv-chat-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:4px}",
    ".fnv-msg{max-width:80%;padding:10px 13px;border-radius:14px;font-size:13px;line-height:1.5;word-break:break-word}",
    ".fnv-msg.user{align-self:flex-end;background:" + primaryColor + ";color:#fff;border-bottom-right-radius:4px}",
    ".fnv-msg.bot{align-self:flex-start;background:rgba(255,255,255,0.08);color:#e2e8f0;border-bottom-left-radius:4px}",
    ".fnv-msg.typing{color:rgba(255,255,255,0.4);font-style:italic}",
    "#fnv-chat-footer{padding:10px;background:#16213e;display:flex;gap:8px;align-items:flex-end}",
    "#fnv-chat-input{flex:1;border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:9px 12px;background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:13px;resize:none;outline:none;max-height:80px;overflow-y:auto;line-height:1.4}",
    "#fnv-chat-input::placeholder{color:rgba(255,255,255,0.3)}",
    "#fnv-send-btn{width:38px;height:38px;border-radius:10px;border:none;cursor:pointer;background:" + primaryColor + ";color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s}",
    "#fnv-send-btn:disabled{opacity:.5;cursor:default}",
    "@media(max-width:420px){#fnv-chat-widget{width:calc(100vw - 16px);right:8px;bottom:84px;height:70vh}}",
  ].join("\n");

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── DOM ──────────────────────────────────────────────────────────────────────
  var btn = document.createElement("button");
  btn.id = "fnv-chat-btn";
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = '<svg width="24" height="24" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var widget = document.createElement("div");
  widget.id = "fnv-chat-widget";
  widget.innerHTML = [
    '<div id="fnv-chat-header">',
    '  <div style="display:flex;align-items:center;gap:8px">',
    '    <div style="width:8px;height:8px;border-radius:50%;background:#4ade80"></div>',
    '    <h3>' + escHtml(title) + '</h3>',
    '  </div>',
    '  <button id="fnv-chat-close" aria-label="Close">&#x2715;</button>',
    '</div>',
    '<div id="fnv-chat-body"></div>',
    '<div id="fnv-chat-footer">',
    '  <textarea id="fnv-chat-input" placeholder="Type a message..." rows="1"></textarea>',
    '  <button id="fnv-send-btn" aria-label="Send">',
    '    <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    '  </button>',
    '</div>',
  ].join("\n");

  document.body.appendChild(btn);
  document.body.appendChild(widget);

  var body = document.getElementById("fnv-chat-body");
  var input = document.getElementById("fnv-chat-input");
  var sendBtn = document.getElementById("fnv-send-btn");

  // ── Open/close ────────────────────────────────────────────────────────────────
  function openWidget() {
    isOpen = true;
    widget.classList.add("open");
    btn.innerHTML = '<svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    if (messages.length === 0) loadGreeting();
    setTimeout(function () { input.focus(); }, 300);
  }

  function closeWidget() {
    isOpen = false;
    widget.classList.remove("open");
    btn.innerHTML = '<svg width="24" height="24" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  }

  btn.addEventListener("click", function () { isOpen ? closeWidget() : openWidget(); });
  document.getElementById("fnv-chat-close").addEventListener("click", closeWidget);

  // ── Greeting ──────────────────────────────────────────────────────────────────
  function loadGreeting() {
    fetch(apiBase + "?widget=" + encodeURIComponent(token), { method: "GET" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var greeting = (d && d.greeting) ? d.greeting : "Hi! How can I help you today?";
        var bName = (d && d.botName) ? d.botName : "Assistant";
        appendMsg("bot", greeting);
      })
      .catch(function () { appendMsg("bot", "Hi! How can I help you today?"); });
  }

  // ── Messages ──────────────────────────────────────────────────────────────────
  function appendMsg(role, text) {
    var div = document.createElement("div");
    div.className = "fnv-msg " + role;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";
    appendMsg("user", text);
    sendBtn.disabled = true;

    var typingEl = appendMsg("bot typing", "Typing...");

    fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetToken: token, message: text, sessionId: sessionId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        body.removeChild(typingEl);
        if (d.sessionId) sessionId = d.sessionId;
        appendMsg("bot", d.reply || d.error || "Sorry, something went wrong.");
      })
      .catch(function () {
        body.removeChild(typingEl);
        appendMsg("bot", "Network error. Please try again.");
      })
      .finally(function () { sendBtn.disabled = false; input.focus(); });
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 80) + "px";
  });

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Auto-open after 5 seconds on first visit
  if (!sessionStorage.getItem("fnv_chat_seen")) {
    setTimeout(function () {
      sessionStorage.setItem("fnv_chat_seen", "1");
      if (!isOpen) openWidget();
    }, 5000);
  }
})();
