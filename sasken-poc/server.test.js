const WebSocket = require('ws');
const http = require('http');

describe('WebSocket Chat Server', () => {
    let serverProcess;
    let clients = [];
    const PORT = 3000;
    const WS_URL = `ws://localhost:${PORT}`;

    beforeAll((done) => {
        // Start the server in a separate process
        serverProcess = require('child_process').spawn('node', ['server.js']);
        // Wait for server to start
        setTimeout(done, 1000);
    });

    afterAll(() => {
        // Clean up clients
        clients.forEach(client => client.close());
        // Kill the server process
        serverProcess.kill();
    });

    afterEach(() => {
        // Clean up clients after each test
        clients.forEach(client => client.close());
        clients = [];
    });

    function createWebSocketClient() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WS_URL);
            clients.push(ws);

            ws.on('open', () => resolve(ws));
            ws.on('error', reject);
        });
    }

    test('Should connect to the server', async () => {
        const ws = await createWebSocketClient();
        expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    test('Should receive welcome message on connection', (done) => {
        createWebSocketClient().then(ws => {
            ws.on('message', (data) => {
                const message = JSON.parse(data);
                expect(message.type).toBe('system');
                expect(message.message).toBe('Welcome to the chat!');
                done();
            });
        });
    });

    test('Should broadcast messages to other clients', (done) => {
        Promise.all([
            createWebSocketClient(),
            createWebSocketClient()
        ]).then(([sender, receiver]) => {
            receiver.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'chat') {
                    expect(message.text).toBe('Hello, World!');
                    done();
                }
            });

            sender.send(JSON.stringify({ text: 'Hello, World!' }));
        });
    });

    test('Should handle message length validation', (done) => {
        createWebSocketClient().then(ws => {
            const longMessage = 'a'.repeat(1001);
            
            ws.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'error') {
                    expect(message.message).toContain('Message too long');
                    done();
                }
            });

            ws.send(JSON.stringify({ text: longMessage }));
        });
    });

    test('Should disconnect client after error threshold', (done) => {
        createWebSocketClient().then(ws => {
            const longMessage = 'a'.repeat(1001);
            let errorCount = 0;

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'error') {
                    errorCount++;
                    if (errorCount === 5) {
                        expect(message.message).toContain('Error threshold exceeded');
                    }
                }
            });

            ws.on('close', () => {
                expect(errorCount).toBe(5);
                done();
            });

            // Send 5 long messages
            for (let i = 0; i < 5; i++) {
                ws.send(JSON.stringify({ text: longMessage }));
            }
        });
    });
});
