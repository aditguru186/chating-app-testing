import WebSocket from 'ws';
import express from 'express';
import path from 'path';
import { ExtendedWebSocket, ChatMessage } from './types';

export const app = express();
const server = app.listen(3001, () => {
    console.log('Chatting Server running on port 3001');
});

app.use(express.static(path.join(__dirname, 'public')));

const wss = new WebSocket.Server({ server });

const clients: Set<ExtendedWebSocket> = new Set();
const MESSAGE_LENGTH_LIMIT = 1000;
const ERROR_THRESHOLD = 5;
const errorCounts: Map<ExtendedWebSocket, number> = new Map();

function broadcast(message: ChatMessage, sender: ExtendedWebSocket): void {
    console.log('Clients:', clients);
    clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

function sendConnectionStatus(client: ExtendedWebSocket): void {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
            type: 'status',
            message: 'You are still connected',
            status_code: 200
        }));
    }
}

wss.on('connection', (ws: any) => {
    console.log('New Client Connected');
    clients.add(ws);
    errorCounts.set(ws, 0);

    ws.send(JSON.stringify({
        type: 'system',
        message: 'Welcome to the Chat!',
        status_code: 200
    }));

    const statusInterval = setInterval(() => {
        sendConnectionStatus(ws);
    }, 10000 + Math.random() * 5000);

    ws.on('message', (data: WebSocket.Data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('Received message:', message);
            if (message.text && message.text.length > MESSAGE_LENGTH_LIMIT) {
                const currentCount = errorCounts.get(ws) || 0;
                errorCounts.set(ws, currentCount + 1);
                
                if (currentCount + 1 >= ERROR_THRESHOLD) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'You have exceeded the maximum number of errors. Disconnecting...',
                        status_code: 429
                    }));
                    ws.close();
                    return;
                }
                
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Message length exceeds ${MESSAGE_LENGTH_LIMIT} characters`,
                    status_code: 400
                }));
                ws.close();
                return;
            }

            const broadcastMessage:ChatMessage = {
                type: 'message',
                text: message.text,
                sender: ws._socket.remoteAddress,
                status_code: 200
            };
            console.log('Broadcasting to clients:', Array.from(clients).length); // Add logging
            broadcast(broadcastMessage, ws);
        }
        catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
                status_code: 400
            }));
        }
    });

    ws.on('close', () => {
        console.log('Client Disconnected');
        clients.delete(ws);
        clearInterval(statusInterval);
        errorCounts.delete(ws);
    });

    ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        const currentCount = errorCounts.get(ws) || 0;
        errorCounts.set(ws, currentCount + 1);
        
        if (currentCount + 1 >= ERROR_THRESHOLD) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'You have exceeded the maximum number of errors. Disconnecting...',
                status_code: 429
            }));
            ws.close();
            return;
        }
    });
});