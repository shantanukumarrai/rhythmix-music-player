/**
 * Rhythmix Music Player - Main Server
 * Entry point: initializes Express, Socket.io, and MongoDB
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const connectDB = require('./utils/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const playlistRoutes = require('./routes/playlists');
const userRoutes = require('./routes/users');
const lyricsRoutes = require('./routes/lyrics');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Socket.io setup for real-time lyrics sync
const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Make io accessible to route handlers
app.set('io', io);

// ─── Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Serve uploaded files as static
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting on API routes
app.use('/api', rateLimiter);

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lyrics', lyricsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// ─── Socket.io - Real-Time Lyrics Sync ──────────────────────
const activeRooms = new Map(); // roomId -> { songId, currentTime, isPlaying }

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Join a shared listening room
  socket.on('join_room', ({ roomId, userId }) => {
    socket.join(roomId);
    const roomState = activeRooms.get(roomId) || { songId: null, currentTime: 0, isPlaying: false };
    socket.emit('room_state', roomState);
    logger.info(`User ${userId} joined room ${roomId}`);
  });

  // Broadcast playback state to all room members
  socket.on('playback_update', ({ roomId, songId, currentTime, isPlaying }) => {
    activeRooms.set(roomId, { songId, currentTime, isPlaying });
    socket.to(roomId).emit('playback_sync', { songId, currentTime, isPlaying });
  });

  // Lyric timestamp broadcast
  socket.on('lyric_update', ({ roomId, lyricIndex, timestamp }) => {
    socket.to(roomId).emit('lyric_sync', { lyricIndex, timestamp });
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Database & Start ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`🎵 Rhythmix server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
});

module.exports = { app, server, io };
