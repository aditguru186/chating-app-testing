const WebSocket = require('ws');
const http = require('http');
const { create } = require('domain');


describe('WebSocket Chat Server', () => {
    let serverProcess;
    let clients = [];
    const PORT = 3001;
    const username = 'testUser';
    const WS_URL = `ws://localhost:${PORT}/ws?username=${username}`;

    beforeAll( (done)=>{
        serverProcess = require('child_process').spawn('ts-node', ['server.ts']);
        setTimeout(done, 1000);

    });
    afterAll(() => {
        clients.forEach(client => client.close());
        serverProcess.kill();
    });
    afterEach(() => {
        // Clean up clients after each test
        clients.forEach(client => client.close());
        clients = [];
    });

    function createWebSocketClient(){
        return new Promise((res,reject)=>{
            const ws = new WebSocket(WS_URL);
            clients.push(ws);

            ws.on('open', ()=> res(ws));
            ws.on('error', reject);
        });
    }

    test('Should connect to the server', async()=>{
        const ws = await createWebSocketClient();
        expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    test('Should receive welcome message on connection', async()=>{
        const ws = await createWebSocketClient();
        ws.on('message', async (data)=>{
            const message = JSON.parse(data);
            expect(message.type).toBe('system');
            expect(message.message).toBe('Welcome to the Chat!');
        })
    });

    test('Should broadcast messages', async()=>{
        try{
            const [sender, receiver] = await Promise.all([
                createWebSocketClient(),
                createWebSocketClient()
            ]);
            const message = 'Hello, World!';
            sender.send(JSON.stringify({ type: 'message', text: message }));
            receiver.on('message', (data)=>{
                const receivedMessage = JSON.parse(data);
                expect(receivedMessage.type).toBe('message');
                expect(receivedMessage.text).toBe(message);
            });
        }catch(err){
            throw new Error('Failed to broadcast message');
        }
    });

    test('Generate TOKEN & verify', async()=>{
        const userData = {
            userId: 12
        };
        const apiBaseUrl = 'http://localhost:3001/api/'; // Adjust the base URL as needed
        const genTokenResponse = await fetch(`${apiBaseUrl}genToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            query: JSON.stringify(userData)
        });
        const result = await genTokenResponse.json();
        expect(result.status).toBe(200);
        expect(result.token).toBeDefined();
        expect(result.message).toBe('Token generated successfully');

        const verifyTokenResponse = await fetch(`${apiBaseUrl}verifyToken`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${result.token}`
            }
        });
        const verifyResult = await verifyTokenResponse.json();
        expect(verifyResult.status).toBe(200);
        expect(verifyResult.valid).toBe(true);
        expect(verifyResult.message).toBe('Token is valid');
    });

    //////// negative test cases
    test('Should check length of message', async()=>{
        const ws = await createWebSocketClient();
        const longMessage = 'a'.repeat(1001); // Assuming max length is 1000
        ws.send(JSON.stringify({ type: 'message', text: longMessage }));
        ws.on('message', (data)=>{
            const message = JSON.parse(data);
            if (message.type === 'error'){
                expect(message.message).toBe('Message length exceeds 1000 characters');
            }
        });
    });

    test('Should disconnect on error threshold', async()=>{
        const ws = await createWebSocketClient();
        const longMessage = 'a'.repeat(1001); // Assuming max length is 1000
        for(let i=0;i<6;i++)
            ws.send(JSON.stringify({ type: 'message', text: longMessage }));

        ws.on('close', ()=>{
            expect(ws.readyState).toBe(WebSocket.CLOSED);
        });
    });
    
});
