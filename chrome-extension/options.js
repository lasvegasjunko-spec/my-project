async function init() {
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (apiKey) {
    document.getElementById("api-key").value = apiKey;
  }

  document.getElementById("save-btn").addEventListener("click", saveKey);
  document.getElementById("clear-btn").addEventListener("click", clearKey);
  document.getElementById("toggle-visibility").addEventListener("click", toggleVisibility);
  document.getElementById("api-key").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveKey();
  });
}

async function saveKey() {
  const input = document.getElementById("api-key");
  const key = input.value.trim();

  if (!key) {
    showStatus("APIキーを入力してください。", "error");
    return;
  }
  if (!key.startsWith("sk-ant-")) {
    showStatus("APIキーの形式が正しくありません (sk-ant- で始まる必要があります)。", "error");
    return;
  }

  await chrome.storage.sync.set({ apiKey: key });
  showStatus("保存しました。", "success");
}

async function clearKey() {
  await chrome.storage.sync.remove("apiKey");
  document.getElementById("api-key").value = "";
  showStatus("APIキーを削除しました。", "info");
}

function toggleVisibility() {
  const input = document.getElementById("api-key");
  const btn = document.getElementById("toggle-visibility");
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "隠す";
  } else {
    input.type = "password";
    btn.textContent = "表示";
  }
}

function showStatus(msg, type) {
  const el = document.getElementById("status-msg");
  el.textContent = msg;
  el.className = `status-msg status-msg--${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

init();
