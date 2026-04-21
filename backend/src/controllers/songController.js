/**
 * Rhythmix - Song Controller
 * Handles: upload, stream, search, like/unlike, recently played
 */

const path = require('path');
const fs = require('fs');
const { parseFile } = require('music-metadata');
const { Song, User } = require('../models');
const logger = require('../utils/logger');

// ─── GET /api/songs ──────────────────────────────────────────
exports.getSongs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', genre, artist } = req.query;
    const query = { isPublic: true };

    if (genre) query.genre = new RegExp(genre, 'i');
    if (artist) query.artist = new RegExp(artist, 'i');

    const songs = await Song.find(query)
      .populate('uploadedBy', 'name avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Song.countDocuments(query);

    res.json({
      success: true,
      data: songs,
      pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/songs/search ───────────────────────────────────
exports.searchSongs = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'Query required' });
    }

    const songs = await Song.find(
      { $text: { $search: q }, isPublic: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .populate('uploadedBy', 'name');

    res.json({ success: true, data: songs, query: q });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/songs/upload ──────────────────────────────────
exports.uploadSong = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    const filePath = req.file.path;
    const fileUrl = `/uploads/songs/${req.file.filename}`;

    // Extract metadata from audio file
    let metadata = {};
    try {
      const parsed = await parseFile(filePath);
      metadata = {
        title: parsed.common.title || req.body.title || path.parse(req.file.originalname).name,
        artist: parsed.common.artist || req.body.artist || 'Unknown Artist',
        album: parsed.common.album || req.body.album || 'Unknown Album',
        genre: parsed.common.genre?.[0] || req.body.genre || 'Unknown',
        year: parsed.common.year,
        bpm: parsed.common.bpm,
        duration: Math.round(parsed.format.duration || 0),
      };
    } catch {
      // Fallback to user-provided metadata
      metadata = {
        title: req.body.title || path.parse(req.file.originalname).name,
        artist: req.body.artist || 'Unknown Artist',
        album: req.body.album || 'Unknown Album',
        genre: req.body.genre || 'Unknown',
        duration: parseInt(req.body.duration) || 0,
      };
    }

    const song = await Song.create({
      ...metadata,
      fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id,
      isPublic: req.body.isPublic !== 'false',
      tags: req.body.tags ? req.body.tags.split(',').map((t) => t.trim()) : [],
    });

    logger.info(`Song uploaded: ${song.title} by ${req.user.id}`);
    res.status(201).json({ success: true, data: song });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/songs/:id/stream ───────────────────────────────
// Supports HTTP range requests for audio seeking
exports.streamSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

    const filePath = path.join(__dirname, '../../', song.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Audio file not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Partial content for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': song.mimeType || 'audio/mpeg',
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': song.mimeType || 'audio/mpeg',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }

    // Increment play count (async, don't await)
    Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } }).exec();

    if (req.user) {
      User.findById(req.user.id)
        .then((user) => user?.addToRecentlyPlayed(req.params.id))
        .catch(() => {});
    }
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/songs/:id/like ────────────────────────────────
exports.likeSong = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const songId = req.params.id;
    const isLiked = user.likedSongs.includes(songId);

    if (isLiked) {
      user.likedSongs.pull(songId);
      await Song.findByIdAndUpdate(songId, { $inc: { likeCount: -1 } });
    } else {
      user.likedSongs.push(songId);
      await Song.findByIdAndUpdate(songId, { $inc: { likeCount: 1 } });
    }

    await user.save();
    res.json({ success: true, liked: !isLiked });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/songs/:id ───────────────────────────────────
exports.deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

    if (song.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Delete physical file
    const filePath = path.join(__dirname, '../../', song.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await song.deleteOne();
    res.json({ success: true, message: 'Song deleted' });
  } catch (err) {
    next(err);
  }
};
