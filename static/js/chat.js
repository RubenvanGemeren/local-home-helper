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
        this.chats = [];
        
        this.initializeEventListeners();
        this.checkHealth();
        this.updateModelDescription();
        this.loadChats();
        
        // Ensure welcome screen is shown initially
        setTimeout(() => {
            this.updateWelcomeScreen();
            // Ensure new chat button is always visible
            this.ensureNewChatButtonVisible();
        }, 100);
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

        // Welcome screen new chat button
        const welcomeNewChatBtn = document.getElementById('welcome-new-chat-btn');
        if (welcomeNewChatBtn) {
            welcomeNewChatBtn.addEventListener('click', () => this.createNewChat());
        }

        // Home icon click
        const homeIcon = document.getElementById('home-icon');
        if (homeIcon) {
            homeIcon.addEventListener('click', () => this.returnToHomePage());
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
                    type === 'ai' ? 'Geoff' : 'System';

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
                this.chats = data.chats; // Store chats in instance
                this.renderChatList(data.chats);
                this.updateWelcomeScreen(data.chats);
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

        return chats.map((chat, index) => {
            // Assign a unique gradient based on chat ID or index
            const gradientClass = this.getChatGradient(chat.id);
            
            return `
                <div class="chat-item ${chat.id == this.currentChatId ? 'active' : ''}" 
                     data-chat-id="${chat.id}" 
                     style="--chat-gradient: ${gradientClass}">
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
            `;
        }).join('');
    }

    getChatGradient(chatId) {
        // Predefined gradients array
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg,rgb(130, 224, 162) 0%,rgb(116, 215, 197) 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
            'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
            'linear-gradient(135deg, #fdbb2d 0%,rgb(97, 192, 194) 100%)',
            'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
            'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)'
        ];
        
        // Use chat ID to consistently assign the same gradient to the same chat
        const gradientIndex = chatId % gradients.length;
        return gradients[gradientIndex];
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
                
                // Set default gradient for new chat
                this.updateMainChatBackground(data.chat_id);
                
                // Reload chat list
                await this.loadChats();
                
                // Force update welcome screen visibility to hide it
                this.updateWelcomeScreen();
                
                // Ensure chat messages are visible
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    chatMessages.style.display = 'block';
                }
                
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
            console.log('loadChat called with chatId:', chatId);
            const response = await fetch(`/api/chats/${chatId}`);
            if (response.ok) {
                const data = await response.json();
                
                // Set current chat ID first
                this.currentChatId = chatId;
                console.log('Set currentChatId to:', this.currentChatId);
                
                // Load messages into chat display
                this.loadChatIntoDisplay(data.chat);
                
                // Update active state in chat list
                this.updateActiveChat(chatId);
                
                // Update welcome screen visibility
                this.updateWelcomeScreen();
                
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
        console.log('loadChatIntoDisplay called for chat:', chat.id);
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        // Update main chat area background with the chat's gradient
        this.updateMainChatBackground(chat.id);

        // Clear current messages
        chatMessages.innerHTML = '';

        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message ai-message';
        welcomeMessage.innerHTML = `
            <div class="message-content">
                <div class="message-header">
                    <i class="fas fa-robot me-2"></i>
                    <strong>Geoff</strong>
                    <small class="text-muted ms-2">Just now</small>
                </div>
                <div class="message-text">
                    Hello, my name is Geoff, and I'm here to help you with whatever you need. I can help you with questions, solve problems and help you code. What's on your mind today?
                </div>
            </div>
        `;
        chatMessages.appendChild(welcomeMessage);

        // Add chat messages
        chat.messages.forEach(msg => {
            this.addMessage(msg.content, msg.role);
        });

        // Update welcome screen visibility - force it to hide
        console.log('Calling updateWelcomeScreen from loadChatIntoDisplay');
        this.updateWelcomeScreen();
    }

    updateMainChatBackground(chatId) {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            const gradient = this.getChatGradient(chatId);
            console.log('Setting gradient for chat', chatId, ':', gradient);
            
            // Set the CSS variable
            chatContainer.style.setProperty('--main-chat-gradient', gradient);
            
            // Also set the background directly as a fallback
            chatContainer.style.background = gradient;
            
            console.log('Chat container background set to:', chatContainer.style.background);
        }
    }

    clearChatDisplay() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            // Clear all messages and add new welcome message
            chatMessages.innerHTML = '';
            
            // Create new welcome message
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message ai-message';
            welcomeMessage.innerHTML = `
                <div class="message-content">
                    <div class="message-header">
                        <i class="fas fa-robot me-2"></i>
                        <strong>Geoff</strong>
                        <small class="text-muted ms-2">Just now</small>
                    </div>
                    <div class="message-text">
                        Hello, my name is Geoff, and I'm here to help you with whatever you need. I can help you with questions, solve problems and help you code. What's on your mind today?
                    </div>
                </div>
            `;
            chatMessages.appendChild(welcomeMessage);
        }
        
        // Only reset currentChatId if we're actually clearing for home page
        if (!this.currentChatId) {
            // Reset main chat background to default
            this.resetMainChatBackground();
            
            // Update welcome screen visibility
            this.updateWelcomeScreen();
        }
    }

    resetMainChatBackground() {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            const defaultGradient = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
            chatContainer.style.setProperty('--main-chat-gradient', defaultGradient);
            chatContainer.style.background = defaultGradient;
            console.log('Reset chat container background to default');
        }
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
                    
                    // If this was the current chat, return to home page view
                    if (chatId == this.currentChatId) {
                        this.returnToHomePage();
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

    returnToHomePage() {
        // Clear current chat ID
        this.currentChatId = null;
        
        // Clear chat display and show welcome message
        this.clearChatDisplay();
        
        // Reset main chat background to default
        this.resetMainChatBackground();
        
        // Remove active state from all chat items
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        this.showToast('Returned to home page', 'info');
    }

    updateWelcomeScreen(chats) {
        const welcomeScreen = document.getElementById('welcome-screen');
        const chatMessages = document.getElementById('chat-messages');
        const chatHeader = document.querySelector('.chat-header');
        const chatInputContainer = document.querySelector('.chat-input-container');
        
        if (!welcomeScreen || !chatMessages) return;
        
        console.log('updateWelcomeScreen called with currentChatId:', this.currentChatId);
        
        if (this.currentChatId) {
            // Chat is active, hide welcome screen
            console.log('Hiding welcome screen, showing chat messages');
            welcomeScreen.classList.add('hidden');
            chatMessages.style.display = 'block';
            
            // Show chat header and input
            if (chatHeader) chatHeader.classList.remove('hidden');
            if (chatInputContainer) chatInputContainer.classList.remove('hidden');
        } else {
            // No chat active, show welcome screen
            console.log('Showing welcome screen, hiding chat messages');
            welcomeScreen.classList.remove('hidden');
            chatMessages.style.display = 'none';
            
            // Hide chat header and input
            if (chatHeader) chatHeader.classList.add('hidden');
            if (chatInputContainer) chatInputContainer.classList.add('hidden');
            
            // If chats weren't passed, use stored chats
            if (!chats) {
                chats = this.chats;
            }
            
            // Show recent chats if they exist
            this.showRecentChats(chats);
        }
        
        // Always ensure new chat button is visible
        this.ensureNewChatButtonVisible();
    }

    showRecentChats(chats) {
        const recentChatsSection = document.getElementById('recent-chats');
        const recentChatsList = document.getElementById('recent-chats-list');
        
        if (!recentChatsSection || !recentChatsList) return;
        
        if (chats && chats.length > 0) {
            // Show the first 3 chats
            const recentChats = chats.slice(0, 3);
            recentChatsList.innerHTML = recentChats.map(chat => `
                <div class="recent-chat-item" data-chat-id="${chat.id}">
                    <div class="recent-chat-title">${this.escapeHtml(chat.title)}</div>
                    <div class="recent-chat-meta">${chat.model} • ${chat.message_count} messages</div>
                </div>
            `).join('');
            
            recentChatsSection.style.display = 'block';
            
            // Add click event listeners to recent chat items
            recentChatsList.querySelectorAll('.recent-chat-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const chatId = item.dataset.chatId;
                    console.log('Recent chat item clicked, chatId:', chatId);
                    this.loadChat(chatId);
                });
            });
        } else {
            recentChatsSection.style.display = 'none';
        }
    }

    ensureNewChatButtonVisible() {
        const newChatBtn = document.getElementById('new-chat-btn');
        const mobileNewChatBtn = document.getElementById('mobile-new-chat-btn');
        const welcomeNewChatBtn = document.getElementById('welcome-new-chat-btn');

        if (newChatBtn) newChatBtn.classList.remove('hidden');
        if (mobileNewChatBtn) mobileNewChatBtn.classList.remove('hidden');
        if (welcomeNewChatBtn) welcomeNewChatBtn.classList.remove('hidden');
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
