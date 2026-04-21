local host link-http://localhost:3000/

# 🎵 Rhythmix — Full-Stack Music Player

A production-grade music player with synchronized lyrics, real-time WebSocket sync, user authentication, playlist management, and a sleek dark UI.

![Rhythmix](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20MongoDB-b8ff5a?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-7c5fff?style=flat-square)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎵 Audio Player | Play, pause, seek, skip, shuffle, repeat |
| ✦ Synced Lyrics | LRC format with karaoke-style highlighting |
| 🔒 Auth | JWT + httpOnly refresh tokens |
| 📋 Playlists | Create, manage, add/remove songs |
| 🔍 Search | Full-text search (title, artist, album, genre) |
| ♥ Library | Liked songs, recently played |
| 📤 Upload | Drag-drop audio + LRC files with metadata extraction |
| 🔴 Real-time | WebSocket room sync for shared listening |
| 🌙 Dark/Light | Full theme switching |
| 🐳 Docker | One-command deployment |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or [Atlas free tier](https://mongodb.com/atlas))

### 1 — Clone & install
```bash
git clone https://github.com/your/rhythmix.git
cd rhythmix

# Install backend
cd backend && npm install && cd ..

# Install frontend  
cd frontend && npm install && cd ..
```

### 2 — Configure environment
```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=mongodb://localhost:27017/rhythmix
JWT_SECRET=pick_a_long_random_string_here
JWT_REFRESH_SECRET=another_long_random_string
CLIENT_URL=http://localhost:3000
```

### 3 — Seed sample data (optional)
```bash
cd backend
npm run seed
# Creates demo@rhythmix.app / demo123
```

### 4 — Start backend
```bash
cd backend
npm run dev      # development (nodemon)
# or
npm start        # production
```
API runs at **http://localhost:5000**

### 5 — Start frontend
```bash
cd frontend
npm run dev
```
App runs at **http://localhost:3000**

---

## 🐳 Docker (One Command)

```bash
# Copy and fill in secrets
cp .env.example .env

docker-compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:5000
- MongoDB → localhost:27017

---

## 📁 Project Structure

```
rhythmix/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express + Socket.io entry
│   │   ├── controllers/           # Business logic
│   │   │   ├── authController.js
│   │   │   ├── songController.js
│   │   │   └── lyricsController.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT protect
│   │   │   ├── errorHandler.js
│   │   │   └── rateLimiter.js
│   │   ├── models/index.js        # User, Song, Playlist, LyricTrack
│   │   ├── routes/index.js        # All routes
│   │   └── utils/
│   │       ├── db.js
│   │       ├── logger.js
│   │       └── seed.js
│   ├── uploads/                   # Audio/image/lyric files
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # Axios + interceptors
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Auth state
│   │   │   └── PlayerContext.jsx  # Audio player state
│   │   ├── hooks/
│   │   │   ├── useLyrics.js       # Lyric sync hook
│   │   │   └── useSocket.js       # WebSocket hook
│   │   ├── components/
│   │   │   ├── Player/PlayerBar.jsx
│   │   │   ├── Sidebar/Sidebar.jsx
│   │   │   ├── Lyrics/LyricsPanel.jsx
│   │   │   ├── Auth/AuthModal.jsx
│   │   │   └── Playlist/SongCard.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   ├── LibraryPage.jsx
│   │   │   ├── PlaylistPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docs/API.md                    # Full API documentation
└── docker-compose.yml
```

---

## 🔌 API Overview

Base URL: `http://localhost:5000/api`

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /auth/signup | — | Create account |
| POST | /auth/login | — | Get tokens |
| GET | /auth/me | 🔒 | Profile |
| GET | /songs | — | List songs |
| GET | /songs/search?q= | — | Search |
| POST | /songs/upload | 🔒 | Upload audio |
| GET | /songs/:id/stream | — | Stream audio |
| POST | /songs/:id/like | 🔒 | Toggle like |
| GET | /lyrics/:songId | — | Get lyrics |
| POST | /lyrics/:songId | 🔒 | Upload LRC |
| GET | /playlists | 🔒 | My playlists |
| POST | /playlists | 🔒 | Create playlist |

→ Full docs in [docs/API.md](./docs/API.md)

---

## ☁️ Deployment

### Render (Free)
1. Push to GitHub
2. New Web Service → connect repo → Root: `backend`
3. Build: `npm install` | Start: `npm start`
4. Add env vars in dashboard
5. For frontend: New Static Site → Root: `frontend` → Build: `npm run build` → Publish: `dist`

### Vercel (Frontend) + Render (Backend)
```bash
# Frontend
cd frontend
VITE_API_URL=https://your-api.onrender.com/api npm run build
npx vercel --prod

# Backend on Render with MongoDB Atlas
```

### AWS EC2
```bash
sudo apt install -y nodejs npm nginx
git clone your-repo && cd rhythmix
cd backend && npm install
npm install -g pm2
pm2 start src/server.js --name rhythmix
pm2 save && pm2 startup
```

---

## 🔴 Real-Time Sync (WebSocket)

Share a listening session with others using Socket.io rooms:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');

// Host joins and syncs playback
socket.emit('join_room', { roomId: 'room-abc', userId: 'me' });
socket.emit('playback_update', { roomId: 'room-abc', songId, currentTime: 30, isPlaying: true });

// Guests receive sync
socket.on('playback_sync', ({ songId, currentTime, isPlaying }) => { ... });
```

---

## 📝 LRC Lyrics Format

Upload lyrics as a `.lrc` file or string:
```
[00:01.00]First line of lyrics
[00:04.50]Second line of lyrics
[00:08.20]Chorus begins here
```

Or as JSON via the API:
```json
{ "lines": [{ "timestamp": 1, "text": "First line" }, ...] }
```

---

## 🛠 Tech Stack

**Backend:** Node.js, Express, MongoDB/Mongoose, Socket.io, JWT, Multer, music-metadata, Winston

**Frontend:** React 18, Vite, React Router v6, Axios, Socket.io-client, CSS Modules

**DevOps:** Docker, Docker Compose, Nginx, PM2

---

*MIT License — Built with ♥ by Rhythmix*
