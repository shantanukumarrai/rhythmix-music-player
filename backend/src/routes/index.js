/**
 * Rhythmix - All Routes
 * Auth, Songs, Playlists, Users, Lyrics
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth');

// ─── Multer Setup ────────────────────────────────────────────
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/songs')),
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/songs');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/thumbnails');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const lyricsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/lyrics');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${uuidv4()}.lrc`),
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid audio format'));
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid image format'));
  },
});

const uploadLrc = multer({ storage: lyricsStorage, limits: { fileSize: 1024 * 100 } });

// ─── AUTH ROUTES ─────────────────────────────────────────────
const authRouter = express.Router();
const auth = require('../controllers/authController');

authRouter.post('/signup', auth.signup);
authRouter.post('/login', auth.login);
authRouter.post('/refresh', auth.refreshToken);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', protect, auth.getMe);
authRouter.patch('/me', protect, auth.updateMe);

// ─── SONG ROUTES ─────────────────────────────────────────────
const songRouter = express.Router();
const songs = require('../controllers/songController');

songRouter.get('/', songs.getSongs);
songRouter.get('/search', songs.searchSongs);
songRouter.post('/upload', protect, uploadAudio.single('audio'), songs.uploadSong);
songRouter.get('/:id/stream', songs.streamSong);       // public, no auth needed to stream
songRouter.post('/:id/like', protect, songs.likeSong);
songRouter.delete('/:id', protect, songs.deleteSong);

// ─── PLAYLIST ROUTES ─────────────────────────────────────────
const playlistRouter = express.Router();
const { Playlist, Song } = require('../models');

// GET /api/playlists - get user's playlists
playlistRouter.get('/', protect, async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ owner: req.user.id })
      .populate('songs.song', 'title artist duration thumbnailUrl')
      .sort('-updatedAt');
    res.json({ success: true, data: playlists });
  } catch (err) { next(err); }
});

// POST /api/playlists - create playlist
playlistRouter.post('/', protect, async (req, res, next) => {
  try {
    const playlist = await Playlist.create({ ...req.body, owner: req.user.id });
    res.status(201).json({ success: true, data: playlist });
  } catch (err) { next(err); }
});

// GET /api/playlists/:id
playlistRouter.get('/:id', protect, async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('songs.song')
      .populate('owner', 'name avatar');
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });
    res.json({ success: true, data: playlist });
  } catch (err) { next(err); }
});

// PATCH /api/playlists/:id - update name/description
playlistRouter.patch('/:id', protect, async (req, res, next) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      req.body, { new: true }
    );
    if (!playlist) return res.status(404).json({ success: false, error: 'Not found or not authorized' });
    res.json({ success: true, data: playlist });
  } catch (err) { next(err); }
});

// POST /api/playlists/:id/songs - add song to playlist
playlistRouter.post('/:id/songs', protect, async (req, res, next) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, owner: req.user.id });
    if (!playlist) return res.status(404).json({ success: false, error: 'Not found' });
    const exists = playlist.songs.some(s => s.song.toString() === req.body.songId);
    if (exists) return res.status(400).json({ success: false, error: 'Song already in playlist' });
    playlist.songs.push({ song: req.body.songId, order: playlist.songs.length });
    await playlist.save();
    res.json({ success: true, data: playlist });
  } catch (err) { next(err); }
});

// DELETE /api/playlists/:id/songs/:songId
playlistRouter.delete('/:id/songs/:songId', protect, async (req, res, next) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $pull: { songs: { song: req.params.songId } } },
      { new: true }
    );
    if (!playlist) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: playlist });
  } catch (err) { next(err); }
});

// DELETE /api/playlists/:id
playlistRouter.delete('/:id', protect, async (req, res, next) => {
  try {
    await Playlist.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    res.json({ success: true, message: 'Playlist deleted' });
  } catch (err) { next(err); }
});

// ─── USER ROUTES ─────────────────────────────────────────────
const userRouter = express.Router();
const { User } = require('../models');

// GET /api/users/:id/liked - get liked songs
userRouter.get('/:id/liked', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('likedSongs');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user.likedSongs });
  } catch (err) { next(err); }
});

// GET /api/users/:id/recently-played
userRouter.get('/:id/recently-played', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('recentlyPlayed.song', 'title artist duration thumbnailUrl')
      .select('recentlyPlayed');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user.recentlyPlayed });
  } catch (err) { next(err); }
});

// ─── LYRICS ROUTES ───────────────────────────────────────────
const lyricsRouter = express.Router();
const lyrics = require('../controllers/lyricsController');

lyricsRouter.get('/:songId', lyrics.getLyrics);
lyricsRouter.get('/:songId/at', lyrics.getLyricAtTime);
lyricsRouter.post('/:songId', protect, uploadLrc.single('lrc'), lyrics.uploadLyrics);
lyricsRouter.delete('/:songId', protect, lyrics.deleteLyrics);

module.exports = { authRouter, songRouter, playlistRouter, userRouter, lyricsRouter };
