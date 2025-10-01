// frontend/script.js

// Configuration - UPDATE THIS FOR PRODUCTION
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : window.location.origin;  // Will use same origin as frontend

// DOM Elements
const clientSelect = document.getElementById('client-select');
const docInput = document.getElementById('doc-input');
const uploadBtn = document.getElementById('upload-btn');
const gmailMockBtn = document.getElementById('gmail-mock-btn');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.getElementById('status-text');

// Utility functions
function updateStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.style.color = isError ? '#dc2626' : '#059669';
    setTimeout(() => {
        statusText.textContent = 'Ready';
        statusText.style.color = '#6b7280';
    }, 3000);
}

function addMessage(content, isUser = false, messageType = null) {
    const messageDiv = document.createElement('div');
    let className = `message ${isUser ? 'user' : 'bot'}`;
    if (messageType) className += ` ${messageType}`;
    
    messageDiv.className = className;
    messageDiv.textContent = content;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addBotMessageWithSources(answer, sources = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    
    // Add the main answer
    const answerP = document.createElement('p');
    answerP.textContent = answer;
    answerP.style.margin = '0 0 10px 0';
    messageDiv.appendChild(answerP);
    
    // Add sources if available
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.style.marginTop = '10px';
        sourcesDiv.style.fontSize = '0.9em';
        sourcesDiv.style.color = '#6b7280';
        sourcesDiv.style.borderTop = '1px solid #e5e7eb';
        sourcesDiv.style.paddingTop = '8px';
        
        const sourcesTitle = document.createElement('strong');
        sourcesTitle.textContent = 'Sources: ';
        sourcesDiv.appendChild(sourcesTitle);
        
        sources.forEach((source, index) => {
            const sourceSpan = document.createElement('span');
            if (source.type === 'email') {
                sourceSpan.textContent = `📧 "${source.subject}"`;
            } else {
                sourceSpan.textContent = `📄 ${source.filename}`;
            }
            
            if (index < sources.length - 1) {
                sourceSpan.textContent += ', ';
            }
            
            sourcesDiv.appendChild(sourceSpan);
        });
        
        messageDiv.appendChild(sourcesDiv);
    }
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Event Handlers
uploadBtn.addEventListener('click', async () => {
    const file = docInput.files[0];
    if (!file) {
        updateStatus('Please select a file first', true);
        return;
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
        updateStatus('Please upload PDF, DOCX, or TXT files only', true);
        return;
    }

    const clientId = clientSelect.value;
    const formData = new FormData();
    formData.append('file', file);

    try {
        updateStatus('Uploading document...');
        uploadBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/api/documents/${clientId}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            updateStatus('Document uploaded successfully!');
            addMessage(`📄 Uploaded: ${file.name} (${result.chunks_processed} chunks processed)`, false, 'success');
            docInput.value = '';
        } else {
            updateStatus(`Upload failed: ${result.detail || result.error}`, true);
        }
    } catch (error) {
        updateStatus(`Upload error: ${error.message}`, true);
        console.error('Upload error:', error);
    } finally {
        uploadBtn.disabled = false;
    }
});

// Load Mock Gmail Thread
gmailMockBtn.addEventListener('click', async () => {
    const clientId = clientSelect.value;
    
    try {
        updateStatus('Loading mock Gmail thread...');
        gmailMockBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/api/gmail/${clientId}/ingest-mock`, {
            method: 'POST'
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            updateStatus('Mock Gmail thread loaded!');
            addMessage(`📧 Loaded ${result.emails_processed} emails from advisor equity thread (${result.chunks_created} chunks)`, false, 'success');
        } else {
            updateStatus(`Failed to load Gmail thread: ${result.detail || result.error}`, true);
        }
    } catch (error) {
        updateStatus(`Gmail loading error: ${error.message}`, true);
        console.error('Gmail loading error:', error);
    } finally {
        gmailMockBtn.disabled = false;
    }
});

async function sendMessage() {
    const question = chatInput.value.trim();
    if (!question) return;

    const clientId = clientSelect.value;
    
    // Add user message to chat
    addMessage(question, true);
    chatInput.value = '';

    try {
        updateStatus('AI is thinking...');
        sendBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('question', question);
        
        const response = await fetch(`${API_BASE}/api/chat/${clientId}/ask`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            updateStatus('Response received');
            addBotMessageWithSources(result.answer, result.sources);
        } else {
            updateStatus(`AI error: ${result.detail || result.error}`, true);
            addMessage(`❌ Error: ${result.detail || result.error}`, false, 'error');
        }
    } catch (error) {
        updateStatus(`Request failed: ${error.message}`, true);
        addMessage(`❌ Network error: ${error.message}`, false, 'error');
        console.error('Chat error:', error);
    } finally {
        sendBtn.disabled = false;
    }
}

sendBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// File input change handler
docInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        updateStatus(`Selected: ${e.target.files[0].name}`);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    addMessage('Hi! I\'m your Lexsy AI Assistant. Upload documents or load the mock Gmail thread, then ask me questions about them.');
    updateStatus('Ready');
});
