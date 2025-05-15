const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const server = app.listen(3000, () => {
    console.log('HTTP Server running on port 3000');
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Message threshold configuration
const MESSAGE_LENGTH_LIMIT = 1000; // characters
const ERROR_THRESHOLD = 5;
const errorCounts = new Map();

// Broadcast message to all clients except sender
function broadcast(message, sender) {
    clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Send connection status message every 5-10 seconds
function sendConnectionStatus(client) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
            type: 'status',
            message: 'You are still connected'
        }));
    }
}

wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);
    errorCounts.set(ws, 0);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'system',
        message: 'Welcome to the chat!'
    }));

    // Set up periodic connection status message
    const statusInterval = setInterval(() => {
        sendConnectionStatus(ws);
    }, 5000 + Math.random() * 5000); // Random interval between 5-10 seconds

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            // Validate message length
            if (message.text && message.text.length > MESSAGE_LENGTH_LIMIT) {
                const currentErrors = errorCounts.get(ws) + 1;
                errorCounts.set(ws, currentErrors);

                if (currentErrors >= ERROR_THRESHOLD) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Error threshold exceeded. You will be disconnected.'
                    }));
                    ws.close();
                    return;
                }

                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Message too long. Maximum length is ${MESSAGE_LENGTH_LIMIT} characters.`
                }));
                return;
            }

            // Broadcast the message
            broadcast({
                type: 'chat',
                text: message.text,
                timestamp: new Date().toISOString()
            }, ws);

        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
        errorCounts.delete(ws);
        clearInterval(statusInterval);
    });
});
