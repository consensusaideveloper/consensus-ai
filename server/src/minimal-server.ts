import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

const app = express();
const port = 8080;
const server = createServer(app);

// Basic middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test user endpoint
app.get('/api/users/:id', (req, res) => {
    console.log('User API requested:', req.params.id);
    res.json({ id: req.params.id, message: 'User found' });
});

// Test projects endpoint
app.get('/api/db/projects', (req, res) => {
    console.log('Projects API requested');
    res.json({ projects: [], message: 'Projects retrieved' });
});

// Start server
console.log(`Starting minimal server on port ${port}...`);
server.listen(port, '127.0.0.1', () => {
    console.log(`✅ Minimal server running on port ${port}`);
}).on('error', (error) => {
    console.error('❌ Server error:', error);
});