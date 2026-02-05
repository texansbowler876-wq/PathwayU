require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const conversationRoutes = require('./routes/conversation');
const matchingRoutes = require('./routes/matching');
const emailRoutes = require('./routes/email');

// API Routes
app.use('/api', conversationRoutes);
app.use('/api', matchingRoutes);
app.use('/api/email', emailRoutes);

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve results.html for the results route
app.get('/results', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

// Start server
app.listen(port, () => {
    console.log(`==============================================`);
    console.log(`PathwayU Server is running!`);
    console.log(`==============================================`);
    console.log(`  Local:    http://localhost:${port}`);
    console.log(`  Results:  http://localhost:${port}/results`);
    console.log(`==============================================`);
    console.log(`Press Ctrl+C to stop the server`);
});

module.exports = app;
