/**
 * Tests de Autenticación
 * 
 * Ejecutar: npm test
 */

const request = require('supertest');
const express = require('express');

// Mock simple del servidor para tests
const app = express();
app.use(express.json());

// Mock de la ruta de login (simplificado para demostración)
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    // Simular validación
    if (!username || !password) {
        return res.status(400).json({ message: 'Faltan credenciales' });
    }

    if (username === 'admin' && password === '12345') {
        return res.status(200).json({
            message: 'Login exitoso',
            user: { id: 1, username: 'admin', role: 'admin' },
            token: 'fake-jwt-token'
        });
    }

    return res.status(401).json({ message: 'Credenciales incorrectas' });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

describe('API Tests', () => {

    describe('Health Check', () => {
        test('should return 200 OK', async () => {
            const response = await request(app).get('/api/health');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
        });
    });

    describe('Authentication', () => {
        test('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: '12345' });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.username).toBe('admin');
        });

        test('should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'wrongpassword' });

            expect(response.status).toBe(401);
        });

        test('should reject missing credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(response.status).toBe(400);
        });
    });

});
