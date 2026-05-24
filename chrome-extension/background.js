const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-7";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "claude-summarize",
    title: "Claudeで要約する",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "claude-ask",
    title: "Claudeに質問する",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "claude-translate",
    title: "Claudeで日本語に翻訳する",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selectedText = info.selectionText;
  if (!selectedText) return;

  const prompts = {
    "claude-summarize": `以下のテキストを簡潔に日本語で要約してください:\n\n${selectedText}`,
    "claude-ask": `以下のテキストについて詳しく説明してください:\n\n${selectedText}`,
    "claude-translate": `以下のテキストを自然な日本語に翻訳してください:\n\n${selectedText}`,
  };

  const prompt = prompts[info.menuItemId];
  if (!prompt) return;

  const response = await callClaude([{ role: "user", content: prompt }]);

  chrome.tabs.sendMessage(tab.id, {
    type: "SHOW_RESULT",
    result: response,
    action: info.menuItemId,
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CALL_CLAUDE") {
    callClaude(message.messages)
      .then((result) => sendResponse({ success: true, result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "GET_SELECTED_TEXT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => window.getSelection()?.toString() || "",
          },
          (results) => {
            sendResponse({ text: results?.[0]?.result || "" });
          }
        );
      }
    });
    return true;
  }
});

async function callClaude(messages) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");

  if (!apiKey) {
    throw new Error(
      "APIキーが設定されていません。オプションページで設定してください。"
    );
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg = error?.error?.message || `APIエラー: ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  return textBlock?.text || "";
}
