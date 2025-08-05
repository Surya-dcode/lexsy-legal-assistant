// frontend/script.js

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("doc-input");
  const clientSelect = document.getElementById("client-select");
  const loadEmailsBtn = document.getElementById("load-emails");
  const chatBox = document.getElementById("chat-box");
  const sendBtn = document.getElementById("send-btn");
  const chatInput = document.getElementById("chat-input");

  const apiBase = window.location.origin;

  uploadBtn.onclick = async () => {
    const file = fileInput.files[0];
    const clientId = clientSelect.value;
    if (!file) return alert("Choose a file first.");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${apiBase}/api/documents/${clientId}/upload`, {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    if (result.success) alert("✅ Upload successful");
    else alert("❌ Upload failed: " + result.error);
  };

  loadEmailsBtn.onclick = async () => {
    const clientId = clientSelect.value;
    const res = await fetch(`${apiBase}/api/emails/${clientId}/ingest-sample-emails`, {
      method: "POST",
    });
    const result = await res.json();
    if (result.success) alert("📧 Sample emails loaded");
    else alert("❌ Email load failed: " + result.error);
  };

  sendBtn.onclick = async () => {
    const question = chatInput.value.trim();
    const clientId = clientSelect.value;
    if (!question) return;

    appendMessage("user", question);
    chatInput.value = "";

    const formData = new FormData();
    formData.append("question", question);

    const res = await fetch(`${apiBase}/api/chat/${clientId}/ask`, {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    if (result.success) appendMessage("bot", result.answer);
    else appendMessage("bot", "❌ Error: " + result.error);
  };

  function appendMessage(role, content) {
    const msg = document.createElement("div");
    msg.className = `message ${role}`;
    msg.innerText = content;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});
