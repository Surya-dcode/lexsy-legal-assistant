// frontend/script.js

// Configuration - UPDATE THIS FOR PRODUCTION
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'https://your-railway-app.railway.app';  // UPDATE WITH YOUR RAILWAY URL

// DOM Elements
const clientSelect = document.getElementById('client-select');
const docInput = document.getElementById('doc-input');
const uploadBtn = document.getElementById('upload-btn');
const loadEmailsBtn = document.getElementById('load-emails');
const gmailAuthBtn = document.getElementById('gmail-auth-btn');
const gmailMockBtn = document.getElementById('gmail-mock-btn');
const gmailStatus = document.getElementById('gmail-status');
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

function updateGmailStatus(isConnected) {
    if (isConnected) {
        gmailStatus.textContent = '✅ Gmail Connected';
        gmailStatus.className = 'status-indicator connected';
        gmailAuthBtn.textContent = 'Gmail Connected';
        gmailAuthBtn.disabled = true;
    } else {
        gmailStatus.textContent = '❌ Gmail Not Connected';
        gmailStatus.className = 'status-indicator disconnected';
        gmailAuthBtn.textContent = 'Connect Gmail';
        gmailAuthBtn.disabled = false;
    }
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
        
        if (result.success) {
            updateStatus('Document uploaded successfully!');
            addMessage(`📄 Uploaded: ${file.name}`, false, 'success');
            docInput.value = '';
        } else {
            updateStatus(`Upload failed: ${result.error}`, true);
        }
    } catch (error) {
        updateStatus(`Upload error: ${error.message}`, true);
        console.error('Upload error:', error);
    } finally {
        uploadBtn.disabled = false;
    }
});

loadEmailsBtn.addEventListener('click', async () => {
    const clientId = clientSelect.value;
    
    try {
        updateStatus('Loading sample emails...');
        loadEmailsBtn.disabled = true;
        
        const response = await fetch(`${API_BASE}/api/emails/${clientId}/ingest-sample-emails`, {
            method: 'POST'
        });

        const result = await response.json();
        
        if (result.success) {
            updateStatus('Sample emails loaded!');
            addMessage(`📧 Loaded ${result.emails_processed} sample emails`, false, 'success');
        } else {
            updateStatus(`Failed to load emails: ${result.error}`, true);
        }
    } catch (error) {
        updateStatus(`Email loading error: ${error.message}`, true);
        console.error('Email loading error:', error);
    } finally {
        loadEmailsBtn.disabled = false;
    }
});

// Gmail Authentication
gmailAuthBtn.addEventListener('click', async () => {
    try {
        updateStatus('Initiating Gmail authentication...');
        const response = await fetch(`${API_BASE}/auth/gmail`);
        const result = await response.json();
        
        if (result.auth_url) {
            updateStatus('Opening Gmail authentication...');
            // Open Gmail auth in popup
            const popup = window.open(result.auth_url, 'gmail-auth', 'width=600,height=600,scrollbars=yes,resizable=yes');
            
            // Check for popup close or successful auth
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    updateStatus('Checking authentication status...');
                    // Check auth status after popup closes
                    setTimeout(checkGmailAuthStatus, 1000);
                }
            }, 1000);
        } else {
            updateStatus('Failed to get Gmail auth URL', true);
        }
    } catch (error) {
        updateStatus(`Gmail auth error: ${error.message}`, true);
        console.error('Gmail auth error:', error);
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
        
        if (result.success) {
            updateStatus('Mock Gmail thread loaded!');
            addMessage(`📧 Loaded ${result.emails_processed} emails from advisor equity thread`, false, 'success');
        } else {
            updateStatus(`Failed to load Gmail thread: ${result.error}`, true);
        }
    } catch (error) {
        updateStatus(`Gmail loading error: ${error.message}`, true);
        console.error('Gmail loading error:', error);
    } finally {
        gmailMockBtn.disabled = false;
    }
});

async function checkGmailAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/gmail/status`);
        const result = await response.json();
        updateGmailStatus(result.authenticated);
        
        if (result.authenticated) {
            updateStatus('Gmail connected successfully!');
            addMessage('✅ Gmail authentication successful! You can now ingest real Gmail threads.', false, 'success');
        }
    } catch (error) {
        console.error('Error checking Gmail status:', error);
        updateGmailStatus(false);
    }
}

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
        
        if (result.success) {
            updateStatus('Response received');
            addBotMessageWithSources(result.answer, result.sources);
        } else {
            updateStatus(`AI error: ${result.error}`, true);
            addMessage(`❌ Error: ${result.error}`, false, 'error');
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
    addMessage('Hi! I\'m your Lexsy AI Assistant with Gmail integration. Upload documents or load Gmail emails, then ask me questions about them.');
    updateStatus('Ready');
    
    // Check Gmail auth status on load
    checkGmailAuthStatus();
    
    // Handle Gmail auth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_auth') === 'success') {
        updateStatus('Gmail authentication successful!');
        addMessage('✅ Gmail authentication successful!', false, 'success');
        checkGmailAuthStatus();
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('gmail_auth') === 'error') {
        const errorMsg = urlParams.get('message') || 'Unknown error';
        updateStatus(`Gmail auth failed: ${errorMsg}`, true);
        addMessage(`❌ Gmail authentication failed: ${errorMsg}`, false, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});