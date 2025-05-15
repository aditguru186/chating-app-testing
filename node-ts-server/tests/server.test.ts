import request from 'supertest';
import { app } from '../src/server';

describe('Server', () => {
    it('should respond with a 200 status code on the root route', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
    });

    it('should respond with a 404 status code for non-existent routes', async () => {
        const response = await request(app).get('/non-existent-route');
        expect(response.status).toBe(404);
    });
});