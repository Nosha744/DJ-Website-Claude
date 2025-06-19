// server.js
import 'dotenv/config'; // Loads .env file
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import crypto from 'crypto';

// --- LowDB Setup for Persistent JSON Database ---
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

// ES Module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, 'db.json');

// Configure lowdb to use a JSON file for storage
const adapter = new JSONFile(file);
const defaultData = { songRequests: [] };
const db = new Low(adapter, defaultData);
await db.read(); // Read data from db.json, or create it if it doesn't exist

// --- App & Middleware Setup ---
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = "3233";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files from the root directory
app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to protect admin routes
const checkAuth = (req, res, next) => {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
};

// --- PUBLIC ENDPOINTS ---

// API to get the current song queue
app.get('/api/queue', (req, res) => {
    const publicQueue = db.data.songRequests
        .filter(req => req.status === 'pending')
        .sort((a, b) => a.order - b.order)
        .map(req => ({ name: req.name, songTitle: req.songTitle }));
    res.json(publicQueue);
});

// Endpoint to submit song request after payment
app.post('/submit-song', async (req, res) => {
    const { name, songTitle, reference } = req.body;
    await db.read(); // Get latest data

    if (!songTitle || !reference) {
        return res.status(400).json({ error: "Song title and payment reference are required." });
    }

    const existingRequest = db.data.songRequests.find(r => r.paymentReference === reference);
    if (existingRequest) {
        return res.status(409).json({ error: "This payment has already been used for a request." });
    }

    const maxOrder = db.data.songRequests.length > 0
        ? Math.max(...db.data.songRequests.map(r => r.order))
        : -1;

    const newRequest = {
        id: crypto.randomUUID(),
        name: name || 'Anonymous',
        songTitle: songTitle,
        timestamp: new Date(),
        paymentReference: reference,
        status: 'pending',
        order: maxOrder + 1
    };

    db.data.songRequests.push(newRequest);
    await db.write(); // Save changes to db.json

    console.log("Song request submitted and saved:", newRequest);
    res.status(201).json({ message: 'Song request submitted successfully!', request: newRequest });
});

// --- ADMIN ENDPOINTS ---

// Admin login page
app.get('/admin/login', (req, res) => res.render('login', { error: null }));

// Handle admin login
app.post('/admin/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: 'Invalid password. Please try again.' });
    }
});

// Admin dashboard (protected)
app.get('/admin', checkAuth, (req, res) => {
    const sortedRequests = [...db.data.songRequests].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        if (a.status === 'played' && b.status === 'played') {
            return new Date(b.timestamp) - new Date(a.timestamp); // Newest played first
        }
        return a.order - b.order;
    });
    res.render('admin', { songRequests: sortedRequests });
});

// Mark a song as played (protected)
app.post('/admin/mark-played/:id', checkAuth, async (req, res) => {
    const request = db.data.songRequests.find(r => r.id === req.params.id);
    if (request) {
        request.status = 'played';
        await db.write();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Song not found.' });
    }
});

// Update the order of songs (protected)
app.post('/admin/update-order', checkAuth, async (req, res) => {
    const { order } = req.body; // Array of song IDs
    if (!Array.isArray(order)) {
        return res.status(400).json({ success: false, message: 'Invalid order data.' });
    }
    const requestMap = new Map(db.data.songRequests.map(r => [r.id, r]));
    order.forEach((id, index) => {
        const request = requestMap.get(id);
        if (request && request.status === 'pending') {
            request.order = index;
        }
    });
    await db.write();
    res.json({ success: true });
});

// Clear all 'played' songs (protected)
app.post('/admin/clear-played', checkAuth, async (req, res) => {
    db.data.songRequests = db.data.songRequests.filter(r => r.status === 'pending');
    await db.write();
    res.json({ success: true, message: 'Played songs cleared.' });
});

// Admin logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/admin');
        res.clearCookie('connect.sid');
        res.redirect('/admin/login');
    });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Public page: http://localhost:${PORT}/index.html`);
    console.log(`Admin login: http://localhost:${PORT}/admin/login`);
});