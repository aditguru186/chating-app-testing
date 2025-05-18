class ChatClient {
    constructor() {
        this.ws = null;
        this.messageCount = 0;
        this.errorCount = 0;
        this.MAX_MESSAGE_LENGTH = 1000;
        this.ERROR_THRESHOLD = 5;

        // DOM Elements
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.connectButton = document.getElementById('connect-button');
        this.disconnectButton = document.getElementById('disconnect-button');
        this.messagesContainer = document.getElementById('messages');
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.errorContainer = document.getElementById('error-container');

        // Event Listeners
        this.connectButton.addEventListener('click', () => this.connect());
        this.disconnectButton.addEventListener('click', () => this.disconnect());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        //reconnection 
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // Start with 2 seconds
        this.reconnectTimeout = null;
    }

    connect() {
        try {
            this.ws = new WebSocket('ws://localhost:3001');
            
            this.ws.onopen = () => {
                this.updateConnectionStatus(true);
                this.showMessage('Connected to server', 'system');
            };

            this.ws.onclose = () => {
                this.updateConnectionStatus(false);
                this.showMessage('Disconnected from server', 'system');

                // Only attempt to reconnect if it wasn't a manual disconnection
                if (!event.wasClean) {
                    this.tryReconnect();
                }
            };

            this.ws.onerror = (error) => {
                this.showError('WebSocket error occurred');
                console.error('WebSocket error:', error);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    switch (data.type) {
                        case 'message': // Changed from 'chat' to 'message' to match server
                            const messageText = `${data.sender}: ${data.text}`;
                            this.showMessage(messageText, 'chat');
                            break;
                        case 'system':
                        case 'status':
                            this.showMessage(data.message, 'system');
                            break;
                        case 'error':
                            this.showError(data.message);
                            break;
                        default:
                            // console.log('Unknown message type:', data);
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            };

        } catch (error) {
            this.showError('Failed to connect to server');
            console.error('Connection error:', error);
        }
    }
    tryReconnect(){
        if(this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if(this.reconnectAttempts < this.maxReconnectAttempts){
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(1.2, this.reconnectAttempts);
            this.showMessage('Connection lost. Attempting to reconnect', 'system');
            this.reconnectTimeout = setTimeout(()=>{
                this.showMessage('Reconnecting...', 'system');
                this.connect();
            },delay);
        }
        else{
            this.showError('Max reconnect attempts reached. Please try connecting manually', 'system');
            this.reconnectAttempts = 0;
        }
    }

    disconnect() {
        console.log("Disconnecting from Client : ", JSON.stringify(this.ws));
        if(this.reconnectTimeout){
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
        }
    }

    updateConnectionStatus(connected) {
        this.statusIndicator.className = connected ? 'connected' : 'disconnected';
        this.statusText.textContent = connected ? 'Connected' : 'Disconnected';
        this.connectButton.disabled = connected;
        this.disconnectButton.disabled = !connected;
        this.messageInput.disabled = !connected;
        this.sendButton.disabled = !connected;
    }

    sendMessage() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.showError('Not connected to server');
            return;
        }

        const message = this.messageInput.value.trim();
        
        if (!message) {
            this.showError('Message cannot be empty');
            return;
        }

        if (message.length > this.MAX_MESSAGE_LENGTH) {
            this.errorCount++;
            this.showError(`Message too long. Maximum length is ${this.MAX_MESSAGE_LENGTH} characters. Error count: ${this.errorCount}/${this.ERROR_THRESHOLD}`);
            
            if (this.errorCount >= this.ERROR_THRESHOLD) {
                this.showError('Error threshold exceeded. Disconnecting...');
                this.disconnect();
            }
            return;
        }

        try {
            this.ws.send(JSON.stringify({ text: message }));
            console.log(JSON.stringify({ text: message }));
            this.messageInput.value = '';
            this.showMessage(message, 'chat', true);
        } catch (error) {
            this.showError('Failed to send message');
            console.error('Send error:', error);
        }
    }

    showMessage(message, type, isOwn = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;

        if (isOwn) {
            messageDiv.classList.add('own-message');
            messageDiv.style.marginLeft = 'auto';
            messageDiv.style.backgroundColor = '#e3f2fd';
        }

        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showError(message) {
        this.errorContainer.textContent = message;
        setTimeout(() => {
            this.errorContainer.textContent = '';
        }, 5000);
    }
}

// Initialize the chat client when the page loads
window.addEventListener('load', () => {
    new ChatClient();
});
