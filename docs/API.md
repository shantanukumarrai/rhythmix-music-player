# 🎵 Rhythmix Music Player — Complete Documentation

## Table of Contents
1. [Project Structure](#project-structure)
2. [Quick Start](#quick-start)
3. [Environment Setup](#environment-setup)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [WebSocket Events](#websocket-events)
7. [Deployment Guide](#deployment-guide)
8. [Frontend Integration](#frontend-integration)

---

## Project Structure

```
rhythmix/
├── backend/
│   ├── src/
│   │   ├── server.js              # Entry point, Express + Socket.io
│   │   ├── controllers/
│   │   │   ├── authController.js  # signup, login, refresh, profile
│   │   │   ├── songController.js  # upload, stream, search, like
│   │   │   └── lyricsController.js# LRC parse, sync endpoints
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT protect middleware
│   │   │   ├── errorHandler.js    # Global error handler
│   │   │   └── rateLimiter.js     # express-rate-limit config
│   │   ├── models/
│   │   │   └── index.js           # User, Song, Playlist, LyricTrack
│   │   ├── routes/
│   │   │   └── index.js           # All route definitions
│   │   └── utils/
│   │       ├── db.js              # Mongoose connect
│   │       └── logger.js          # Winston logger
│   ├── uploads/                   # Auto-created on first upload
│   │   ├── songs/
│   │   ├── lyrics/
│   │   └── thumbnails/
│   ├── .env.example
│   └── package.json
└── docs/
    └── API.md                     # This file
```

---

## Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm or yarn

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
```

### 3. Start the Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

---

## Environment Setup

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | 5000 |
| `MONGO_URI` | MongoDB connection string | localhost/rhythmix |
| `JWT_SECRET` | Access token secret | **required** |
| `JWT_EXPIRE` | Access token expiry | 7d |
| `JWT_REFRESH_SECRET` | Refresh token secret | **required** |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | 30d |
| `MAX_FILE_SIZE` | Max upload size (bytes) | 52428800 (50MB) |
| `CLIENT_URL` | CORS allowed origin | http://localhost:3000 |

---

## Database Schema

### User
```json
{
  "_id": "ObjectId",
  "name": "string (required)",
  "email": "string (unique, required)",
  "password": "hashed string (bcrypt)",
  "avatar": "string (url)",
  "role": "user | admin",
  "likedSongs": ["ObjectId -> Song"],
  "recentlyPlayed": [{ "song": "ObjectId", "playedAt": "Date" }],
  "preferences": {
    "theme": "dark | light | system",
    "volume": "0-100",
    "repeatMode": "none | all | one",
    "shuffleEnabled": "boolean"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Song
```json
{
  "_id": "ObjectId",
  "title": "string (required)",
  "artist": "string (required)",
  "album": "string",
  "genre": "string",
  "year": "number",
  "duration": "number (seconds, required)",
  "bpm": "number",
  "fileUrl": "string (path, required)",
  "fileSize": "number (bytes)",
  "mimeType": "string",
  "thumbnailUrl": "string",
  "uploadedBy": "ObjectId -> User",
  "isPublic": "boolean",
  "playCount": "number",
  "likeCount": "number",
  "tags": ["string"],
  "createdAt": "Date"
}
```

### Playlist
```json
{
  "_id": "ObjectId",
  "name": "string (required)",
  "description": "string",
  "owner": "ObjectId -> User",
  "songs": [{ "song": "ObjectId", "addedAt": "Date", "order": "number" }],
  "thumbnailUrl": "string",
  "isPublic": "boolean",
  "collaborators": ["ObjectId -> User"],
  "songCount": "number",
  "createdAt": "Date"
}
```

### LyricTrack
```json
{
  "_id": "ObjectId",
  "song": "ObjectId -> Song (unique)",
  "lines": [{ "timestamp": "number (seconds)", "text": "string" }],
  "language": "string",
  "source": "lrc | manual | api",
  "rawLrc": "string",
  "createdAt": "Date"
}
```

---

## API Reference

### Base URL: `http://localhost:5000/api`

---

### Authentication

#### POST /auth/signup
Create a new account.
```json
// Request body
{ "name": "John Doe", "email": "john@example.com", "password": "secret123" }

// Response 201
{
  "success": true,
  "accessToken": "eyJ...",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com" }
}
```

#### POST /auth/login
Sign in to existing account.
```json
// Request body
{ "email": "john@example.com", "password": "secret123" }

// Response 200
{ "success": true, "accessToken": "eyJ...", "user": { ... } }
```
Sets `refreshToken` httpOnly cookie.

#### POST /auth/refresh
Get a new access token using refresh cookie.
```json
// Response 200
{ "success": true, "accessToken": "eyJ..." }
```

#### POST /auth/logout
Clear session.
```json
// Response 200
{ "success": true, "message": "Logged out successfully" }
```

#### GET /auth/me  🔒
Get authenticated user profile.
```json
// Headers: Authorization: Bearer <accessToken>
// Response 200
{ "success": true, "user": { ..., "likedSongs": [...], "recentlyPlayed": [...] } }
```

#### PATCH /auth/me  🔒
Update profile or preferences.
```json
// Request body
{ "name": "New Name", "preferences": { "theme": "light", "volume": 70 } }
```

---

### Songs

#### GET /songs
Get all public songs (paginated).
```
Query: ?page=1&limit=20&sort=-createdAt&genre=Pop&artist=Coldplay
```
```json
{
  "success": true,
  "data": [ { "title": "...", "artist": "...", "duration": 210, "fileUrl": "..." } ],
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

#### GET /songs/search
Full-text search.
```
Query: ?q=midnight
```

#### POST /songs/upload  🔒
Upload an audio file (multipart/form-data).
```
Form fields:
  audio: <file>          (required, MP3/FLAC/WAV/OGG)
  title: string          (optional, auto-extracted from metadata)
  artist: string         (optional)
  album: string          (optional)
  genre: string          (optional)
  tags: "rock,chill"     (optional, comma-separated)
  isPublic: "true"       (optional)
```

#### GET /songs/:id/stream
Stream audio with range request support (required for HTML5 seek).
```
Headers: Range: bytes=0-1048576
Response 206 Partial Content
```

#### POST /songs/:id/like  🔒
Toggle like on a song.
```json
// Response 200
{ "success": true, "liked": true }
```

#### DELETE /songs/:id  🔒
Delete a song (owner or admin only).

---

### Playlists  (all require 🔒)

| Method | Route | Description |
|---|---|---|
| GET | /playlists | List user's playlists |
| POST | /playlists | Create playlist (`{name, description, isPublic}`) |
| GET | /playlists/:id | Get playlist with songs populated |
| PATCH | /playlists/:id | Update name/description |
| POST | /playlists/:id/songs | Add song (`{songId}`) |
| DELETE | /playlists/:id/songs/:songId | Remove song from playlist |
| DELETE | /playlists/:id | Delete playlist |

---

### Lyrics

#### GET /lyrics/:songId
Get full lyrics for a song.
```json
{
  "success": true,
  "data": {
    "lines": [
      { "timestamp": 0, "text": "First lyric line" },
      { "timestamp": 4.5, "text": "Second lyric line" }
    ],
    "language": "en",
    "source": "lrc"
  }
}
```

#### GET /lyrics/:songId/at?t=30.5
Get current lyric at a specific timestamp (for seeking).
```json
{
  "success": true,
  "data": {
    "currentLine": { "timestamp": 28, "text": "Current lyric line" },
    "currentIndex": 7,
    "nextLine": { "timestamp": 32, "text": "Next lyric line" },
    "totalLines": 20
  }
}
```

#### POST /lyrics/:songId  🔒
Upload lyrics. Accepts LRC file OR JSON.

**Option A — LRC File upload:**
```
Form field: lrc: <file.lrc>
```

**Option B — LRC string:**
```json
{ "lrc": "[00:01.00]First line\n[00:04.50]Second line" }
```

**Option C — JSON lines:**
```json
{
  "lines": [
    { "timestamp": 1, "text": "First line" },
    { "timestamp": 4.5, "text": "Second line" }
  ],
  "language": "en"
}
```

#### DELETE /lyrics/:songId  🔒
Remove lyrics for a song.

---

### Users

#### GET /users/:id/liked  🔒
Get user's liked songs.

#### GET /users/:id/recently-played  🔒
Get user's recently played (last 20).

---

## WebSocket Events

Connect to `ws://localhost:5000` using Socket.io client.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ roomId, userId }` | Join a shared listening room |
| `playback_update` | `{ roomId, songId, currentTime, isPlaying }` | Broadcast playback state |
| `lyric_update` | `{ roomId, lyricIndex, timestamp }` | Sync current lyric line |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `room_state` | `{ songId, currentTime, isPlaying }` | Current room state on join |
| `playback_sync` | `{ songId, currentTime, isPlaying }` | Playback sync from another user |
| `lyric_sync` | `{ lyricIndex, timestamp }` | Lyric sync from another user |

### Frontend Socket.io Example
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Join room for shared listening
socket.emit('join_room', { roomId: 'room-123', userId: user.id });

// Sync your playback to others
socket.emit('playback_update', {
  roomId: 'room-123',
  songId: currentSong.id,
  currentTime: audio.currentTime,
  isPlaying: !audio.paused,
});

// Listen to others' playback
socket.on('playback_sync', ({ songId, currentTime, isPlaying }) => {
  if (isPlaying) audio.play();
  else audio.pause();
  audio.currentTime = currentTime;
});
```

---

## Deployment Guide

### Render (Recommended — Free Tier)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repository
4. Set:
   - Build command: `npm install`
   - Start command: `npm start`
   - Root directory: `backend`
5. Add environment variables in Render dashboard
6. Add MongoDB Atlas URI (free tier at [mongodb.com/atlas](https://mongodb.com/atlas))

### AWS EC2

```bash
# On EC2 instance (Ubuntu 22.04)
sudo apt update && sudo apt install -y nodejs npm
git clone https://github.com/your/rhythmix.git
cd rhythmix/backend
npm install
cp .env.example .env && nano .env

# Install PM2 for process management
npm install -g pm2
pm2 start src/server.js --name rhythmix
pm2 save && pm2 startup

# Nginx reverse proxy (optional)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/rhythmix
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /uploads {
        alias /path/to/rhythmix/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Vercel (Frontend only)

```bash
cd frontend
npm run build
npx vercel --prod
```

Set `VITE_API_URL=https://your-backend.render.com/api` in Vercel env vars.

---

## Frontend Integration (React)

### Install dependencies
```bash
npm create vite@latest rhythmix-frontend -- --template react
cd rhythmix-frontend
npm install axios socket.io-client react-router-dom
```

### API client setup
```javascript
// src/api/client.js
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.accessToken);
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(err.config);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

### Audio player with range streaming
```javascript
// src/hooks/useAudioPlayer.js
const useAudioPlayer = () => {
  const audioRef = useRef(new Audio());

  const loadSong = (songId) => {
    const audio = audioRef.current;
    audio.src = `${import.meta.env.VITE_API_URL}/songs/${songId}/stream`;
    audio.load();
  };

  return { audioRef, loadSong };
};
```

---

*Rhythmix v1.0.0 — Built with Node.js, Express, MongoDB, Socket.io*
