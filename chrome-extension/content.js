chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_RESULT") {
    showToast(message.result, message.action);
  }
});

function showToast(text, action) {
  const existing = document.getElementById("claude-toast-container");
  if (existing) existing.remove();

  const labels = {
    "claude-summarize": "要約",
    "claude-ask": "説明",
    "claude-translate": "翻訳",
  };

  const container = document.createElement("div");
  container.id = "claude-toast-container";
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    max-width: 400px;
    min-width: 280px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    color: #1a202c;
    overflow: hidden;
    animation: claudeSlideIn 0.25s ease;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes claudeSlideIn {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    font-size: 13px;
    color: #4a5568;
  `;
  header.innerHTML = `
    <span>Claude AI — ${labels[action] || "結果"}</span>
    <button id="claude-toast-close" style="
      border: none; background: none; cursor: pointer;
      font-size: 16px; color: #718096; line-height: 1; padding: 0 2px;
    ">✕</button>
  `;

  const body = document.createElement("div");
  body.style.cssText = `
    padding: 12px 14px;
    max-height: 260px;
    overflow-y: auto;
    white-space: pre-wrap;
    line-height: 1.6;
  `;
  body.textContent = text;

  container.appendChild(header);
  container.appendChild(body);
  document.body.appendChild(container);

  document.getElementById("claude-toast-close").addEventListener("click", () => {
    container.remove();
  });

  setTimeout(() => {
    if (document.body.contains(container)) container.remove();
  }, 30000);
}
