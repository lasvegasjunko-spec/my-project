const chatHistory = [];

async function init() {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) {
    document.getElementById("api-key-warning").classList.remove("hidden");
  }

  document.getElementById("go-to-options").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById("options-link").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  await loadSelectedText();

  document.querySelectorAll(".btn-action").forEach((btn) => {
    btn.addEventListener("click", () => handleAction(btn.dataset.action));
  });

  document.getElementById("send-btn").addEventListener("click", sendChat);
  document.getElementById("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  document.getElementById("clear-result").addEventListener("click", () => {
    document.getElementById("result-section").classList.add("hidden");
    document.getElementById("result-text").textContent = "";
  });
}

async function loadSelectedText() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SELECTED_TEXT" });
  const text = response?.text?.trim();
  const preview = document.getElementById("selected-text-preview");

  if (text) {
    preview.textContent = text.length > 100 ? text.slice(0, 100) + "…" : text;
    preview.dataset.full = text;
    preview.classList.remove("empty");
  } else {
    preview.textContent = "（なし）";
    preview.dataset.full = "";
    preview.classList.add("empty");
  }
}

async function handleAction(action) {
  const selectedText = document.getElementById("selected-text-preview").dataset.full;
  if (!selectedText) {
    showResult("テキストが選択されていません。ページ上でテキストを選択してから操作してください。");
    return;
  }

  const prompts = {
    summarize: `以下のテキストを簡潔に日本語で要約してください:\n\n${selectedText}`,
    ask: `以下のテキストについて詳しく説明してください:\n\n${selectedText}`,
    translate: `以下のテキストを自然な日本語に翻訳してください:\n\n${selectedText}`,
  };

  const prompt = prompts[action];
  if (!prompt) return;

  setLoading(true);
  try {
    const result = await callClaude([{ role: "user", content: prompt }]);
    showResult(result);
  } catch (err) {
    showResult("エラー: " + err.message);
  } finally {
    setLoading(false);
  }
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addChatMessage("user", text);
  chatHistory.push({ role: "user", content: text });

  setLoading(true);
  try {
    const result = await callClaude([...chatHistory]);
    chatHistory.push({ role: "assistant", content: result });
    addChatMessage("assistant", result);
  } catch (err) {
    addChatMessage("error", "エラー: " + err.message);
  } finally {
    setLoading(false);
  }
}

function addChatMessage(role, text) {
  const container = document.getElementById("chat-messages");
  const msg = document.createElement("div");
  msg.className = `chat-message chat-message--${role}`;
  msg.textContent = text;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function showResult(text) {
  document.getElementById("result-text").textContent = text;
  document.getElementById("result-section").classList.remove("hidden");
}

async function callClaude(messages) {
  const response = await chrome.runtime.sendMessage({ type: "CALL_CLAUDE", messages });
  if (!response.success) throw new Error(response.error);
  return response.result;
}

function setLoading(on) {
  document.getElementById("loading-overlay").classList.toggle("hidden", !on);
}

init();
