// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const storyRoutes = require('./routes/stories');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const reelsRoutes = require('./routes/reels');
const { socketHandler } = require('./utils/socket');

const app = express();
const httpServer = createServer(app);

// Set your FRONTEND_URL (or fallback) to the URL your client uses.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

// Explicitly set transports to enable both websocket and polling
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  transports: ["websocket", "polling"]
});

app.set('io', io);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory at:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reels', reelsRoutes);

socketHandler(io);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/photogram';
if (!MONGODB_URI) {
  console.error('MongoDB URI is not defined! Please check your .env file.');
  process.exit(1);
}
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Please ensure MongoDB is running and your connection string is correct.');
  });

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
