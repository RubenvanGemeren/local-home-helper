/**
 * Local Home Helper - Chat JavaScript
 * Handles chat functionality, model selection, and UI interactions
 */

class ChatApp {
    constructor() {
        this.currentModel = document.getElementById('model-select')?.value || 'llama2:7b';
        this.isLoading = false;
        this.typingIndicator = null;
        this.currentChatId = null;
        
        this.initializeEventListeners();
        this.checkHealth();
        this.updateModelDescription();
        this.loadChats();
    }

    initializeEventListeners() {
        // Send button click
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }

        // Enter key press in textarea
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Character count
            messageInput.addEventListener('input', () => this.updateCharacterCount());
        }

        // Model selection change
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
                this.updateModelDescription();
                this.updateCurrentModelDisplay();
                this.checkHealth();
            });
        }

        // Mobile model selection
        const mobileModelSelect = document.getElementById('mobile-model-select');
        if (mobileModelSelect) {
            mobileModelSelect.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
                this.updateModelDescription();
                this.updateCurrentModelDisplay();
                this.checkHealth();
                
                // Update desktop selector
                if (modelSelect) {
                    modelSelect.value = this.currentModel;
                }
            });
        }

        // Clear chat button
        const clearChatBtn = document.getElementById('clear-chat');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.clearChat());
        }

        // Mobile clear chat button
        const mobileClearChatBtn = document.getElementById('mobile-clear-chat');
        if (mobileClearChatBtn) {
            mobileClearChatBtn.addEventListener('click', () => this.clearChat());
        }

        // Refresh models button
        const refreshModelsBtn = document.getElementById('refresh-models');
        if (refreshModelsBtn) {
            refreshModelsBtn.addEventListener('click', () => this.refreshModels());
        }

        // Mobile refresh models button
        const mobileRefreshModelsBtn = document.getElementById('mobile-refresh-models');
        if (mobileRefreshModelsBtn) {
            mobileRefreshModelsBtn.addEventListener('click', () => this.refreshModels());
        }

        // Chat management buttons
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.createNewChat());
        }

        const mobileNewChatBtn = document.getElementById('mobile-new-chat-btn');
        if (mobileNewChatBtn) {
            mobileNewChatBtn.addEventListener('click', () => this.createNewChat());
        }

        // Chat list event delegation
        this.setupChatListEventListeners();
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        if (!message || this.isLoading) {
            return;
        }

        // Add user message to chat
        this.addMessage(message, 'user');
        messageInput.value = '';
        this.updateCharacterCount();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            this.isLoading = true;
            this.setSendButtonState(false);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    model: this.currentModel
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Remove typing indicator and add AI response
                this.hideTypingIndicator();
                this.addMessage(data.response, 'ai');
                
                // Update model display if it changed
                if (data.model && data.model !== this.currentModel) {
                    this.currentModel = data.model;
                    this.updateCurrentModelDisplay();
                }
                
                // Refresh chat list to show updated titles
                setTimeout(() => {
                    this.loadChats();
                }, 500); // Small delay to ensure database is updated
            } else {
                this.hideTypingIndicator();
                this.addMessage(`Error: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessage('Error: Failed to send message. Please check if Ollama is running.', 'error');
        } finally {
            this.isLoading = false;
            this.setSendButtonState(true);
        }
    }

    addMessage(content, type) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        const timestamp = new Date().toLocaleTimeString();
        const icon = type === 'user' ? 'fas fa-user' : 
                    type === 'ai' ? 'fas fa-robot' : 'fas fa-exclamation-triangle';
        const name = type === 'user' ? 'You' : 
                    type === 'ai' ? 'AI Assistant' : 'System';

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <i class="${icon} me-2"></i>
                    <strong>${name}</strong>
                    <small class="text-muted ms-2">${timestamp}</small>
                </div>
                <div class="message-text">${this.escapeHtml(content)}</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        this.typingIndicator = document.createElement('div');
        this.typingIndicator.className = 'message ai-message typing-indicator';
        this.typingIndicator.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <i class="fas fa-robot me-2"></i>
                    <strong>AI Assistant</strong>
                </div>
                <div class="typing-indicator">
                    Thinking
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;

        chatMessages.appendChild(this.typingIndicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.remove();
            this.typingIndicator = null;
        }
    }

    async clearChat() {
        try {
            const response = await fetch('/api/clear-chat', {
                method: 'POST'
            });

            if (response.ok) {
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    // Keep only the welcome message
                    const welcomeMessage = chatMessages.querySelector('.ai-message');
                    chatMessages.innerHTML = '';
                    if (welcomeMessage) {
                        chatMessages.appendChild(welcomeMessage);
                    }
                }
                
                // Clear current chat ID
                this.currentChatId = null;
                
                // Show success message
                this.showToast('Chat history cleared successfully!', 'success');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.showToast('Failed to clear chat history', 'error');
        }
    }

    async refreshModels() {
        try {
            const response = await fetch('/api/models');
            if (response.ok) {
                const data = await response.json();
                this.showToast('Models refreshed successfully!', 'success');
                this.updateModelStatus('online');
            } else {
                this.updateModelStatus('offline');
            }
        } catch (error) {
            console.error('Error refreshing models:', error);
            this.updateModelStatus('offline');
            this.showToast('Failed to refresh models', 'error');
        }
    }

    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'healthy') {
                    this.updateModelStatus('online');
                } else {
                    this.updateModelStatus('offline');
                }
            } else {
                this.updateModelStatus('offline');
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.updateModelStatus('offline');
        }
    }

    updateModelStatus(status) {
        const statusElement = document.getElementById('model-status');
        if (!statusElement) return;

        const statusMap = {
            'online': '<i class="fas fa-circle text-success"></i> Online',
            'offline': '<i class="fas fa-circle text-danger"></i> Offline',
            'checking': '<i class="fas fa-circle text-warning"></i> Checking...'
        };

        statusElement.innerHTML = statusMap[status] || statusMap['checking'];
    }

    updateModelDescription() {
        const modelSelect = document.getElementById('model-select');
        const mobileModelSelect = document.getElementById('mobile-model-select');
        const descriptionElement = document.getElementById('model-description');
        const mobileDescriptionElement = document.getElementById('mobile-model-description');

        if (modelSelect && descriptionElement) {
            const selectedOption = modelSelect.options[modelSelect.selectedIndex];
            const description = selectedOption.getAttribute('data-description');
            descriptionElement.textContent = description;
        }

        if (mobileModelSelect && mobileDescriptionElement) {
            const selectedOption = mobileModelSelect.options[mobileModelSelect.selectedIndex];
            const description = selectedOption.getAttribute('data-description');
            mobileDescriptionElement.textContent = description;
        }
    }

    updateCurrentModelDisplay() {
        const currentModelElements = document.querySelectorAll('#current-model, #current-model-display');
        currentModelElements.forEach(element => {
            element.textContent = this.currentModel;
        });
    }

    updateCharacterCount() {
        const messageInput = document.getElementById('message-input');
        const charCount = document.getElementById('char-count');
        
        if (messageInput && charCount) {
            const count = messageInput.value.length;
            charCount.textContent = count;
            
            // Change color based on count
            if (count > 1800) {
                charCount.className = 'text-danger';
            } else if (count > 1500) {
                charCount.className = 'text-warning';
            } else {
                charCount.className = 'text-muted';
            }
        }
    }

    setSendButtonState(enabled) {
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.disabled = !enabled;
            sendButton.innerHTML = enabled ? 
                '<i class="fas fa-paper-plane"></i>' : 
                '<i class="fas fa-spinner fa-spin"></i>';
        }
    }

    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        // Add to page
        document.body.appendChild(toast);

        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove after hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // Chat Management Methods
    setupChatListEventListeners() {
        // Event delegation for chat items
        document.addEventListener('click', (e) => {
            if (e.target.closest('.chat-item')) {
                const chatItem = e.target.closest('.chat-item');
                const chatId = chatItem.dataset.chatId;
                
                if (e.target.closest('.edit-chat')) {
                    e.stopPropagation();
                    this.editChatTitle(chatId, chatItem);
                } else if (e.target.closest('.delete-chat')) {
                    e.stopPropagation();
                    this.deleteChat(chatId, chatItem);
                } else {
                    this.loadChat(chatId);
                }
            }
        });
    }

    async loadChats() {
        try {
            const response = await fetch('/api/chats');
            if (response.ok) {
                const data = await response.json();
                this.renderChatList(data.chats);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    renderChatList(chats) {
        const chatList = document.getElementById('chat-list');
        const mobileChatList = document.getElementById('mobile-chat-list');
        
        if (chatList) {
            chatList.innerHTML = this.generateChatListHTML(chats);
        }
        
        if (mobileChatList) {
            mobileChatList.innerHTML = this.generateChatListHTML(chats);
        }
    }

    generateChatListHTML(chats) {
        if (chats.length === 0) {
            return '<div class="text-center text-muted py-3">No chats yet</div>';
        }

        return chats.map(chat => `
            <div class="chat-item ${chat.id == this.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                <div class="chat-item-content">
                    <div class="chat-title">${this.escapeHtml(chat.title)}</div>
                    <div class="chat-meta">
                        <small class="text-muted">${chat.model}</small>
                        <small class="text-muted ms-2">${chat.message_count} messages</small>
                    </div>
                </div>
                <div class="chat-actions">
                    <button class="btn btn-sm btn-outline-secondary edit-chat" title="Edit Title">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-chat" title="Delete Chat">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async createNewChat() {
        try {
            const response = await fetch('/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: 'New Chat',
                    model: this.currentModel
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentChatId = data.chat_id;
                
                // Clear chat display
                this.clearChatDisplay();
                
                // Reload chat list
                await this.loadChats();
                
                this.showToast('New chat created!', 'success');
            } else {
                const errorData = await response.json();
                this.showToast(`Error: ${errorData.error}`, 'error');
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            this.showToast('Failed to create new chat', 'error');
        }
    }

    async updateChatTitleInUI(chatId, newTitle) {
        // Update chat title in the UI without full refresh
        try {
            // Update all instances of this chat in the UI
            const chatItems = document.querySelectorAll(`[data-chat-id="${chatId}"]`);
            chatItems.forEach(item => {
                const titleElement = item.querySelector('.chat-title');
                if (titleElement) {
                    titleElement.textContent = newTitle;
                }
            });
        } catch (error) {
            console.error('Error updating chat title in UI:', error);
        }
    }

    async loadChat(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}`);
            if (response.ok) {
                const data = await response.json();
                this.currentChatId = chatId;
                
                // Load messages into chat display
                this.loadChatIntoDisplay(data.chat);
                
                // Update active state in chat list
                this.updateActiveChat(chatId);
                
                this.showToast('Chat loaded successfully!', 'success');
            } else {
                const errorData = await response.json();
                this.showToast(`Error: ${errorData.error}`, 'error');
            }
        } catch (error) {
            console.error('Error loading chat:', error);
            this.showToast('Failed to load chat', 'error');
        }
    }

    loadChatIntoDisplay(chat) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        // Clear current messages
        chatMessages.innerHTML = '';

        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message ai-message';
        welcomeMessage.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <i class="fas fa-robot me-2"></i>
                    <strong>AI Assistant</strong>
                    <small class="text-muted ms-2">Just now</small>
                </div>
                <div class="message-text">
                    Hello! I'm your local AI assistant running on this machine. I can help you with various tasks including answering questions, writing text, solving problems, and helping with coding. What would you like to know?
                </div>
            </div>
        `;
        chatMessages.appendChild(welcomeMessage);

        // Add chat messages
        chat.messages.forEach(msg => {
            this.addMessage(msg.content, msg.role);
        });
    }

    clearChatDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            // Keep only the welcome message
            const welcomeMessage = chatMessages.querySelector('.ai-message');
            chatMessages.innerHTML = '';
            if (welcomeMessage) {
                chatMessages.appendChild(welcomeMessage);
            }
        }
        this.currentChatId = null;
    }

    updateActiveChat(chatId) {
        // Remove active class from all chat items
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current chat
        const currentChatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (currentChatItem) {
            currentChatItem.classList.add('active');
        }
    }

    async editChatTitle(chatId, chatItem) {
        const currentTitle = chatItem.querySelector('.chat-title').textContent;
        const newTitle = prompt('Enter new chat title:', currentTitle);
        
        if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
            try {
                const response = await fetch(`/api/chats/${chatId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: newTitle.trim()
                    })
                });

                if (response.ok) {
                    chatItem.querySelector('.chat-title').textContent = newTitle.trim();
                    this.showToast('Chat title updated!', 'success');
                } else {
                    const errorData = await response.json();
                    this.showToast(`Error: ${errorData.error}`, 'error');
                }
            } catch (error) {
                console.error('Error updating chat title:', error);
                this.showToast('Failed to update chat title', 'error');
            }
        }
    }

    async deleteChat(chatId, chatItem) {
        if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/chats/${chatId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    // Remove from DOM
                    chatItem.remove();
                    
                    // If this was the current chat, clear the display
                    if (chatId == this.currentChatId) {
                        this.clearChatDisplay();
                    }
                    
                    this.showToast('Chat deleted successfully!', 'success');
                } else {
                    const errorData = await response.json();
                    this.showToast(`Error: ${errorData.error}`, 'error');
                }
            } catch (error) {
                console.error('Error deleting chat:', error);
                this.showToast('Failed to delete chat', 'error');
            }
        }
    }
}

// Initialize the chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});

// Auto-resize textarea
document.addEventListener('input', (e) => {
    if (e.target.tagName === 'TEXTAREA') {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    }
});
