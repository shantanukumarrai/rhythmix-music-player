/**
 * Rhythmix - Lyrics Controller
 * Handles: LRC file parsing, synchronized lyrics CRUD
 */

const { LyricTrack, Song } = require('../models');
const logger = require('../utils/logger');

// ─── LRC Parser ──────────────────────────────────────────────
// Parses standard .lrc format: [mm:ss.xx] lyric text
const parseLRC = (lrcContent) => {
  const lines = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
  let match;

  while ((match = regex.exec(lrcContent)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const centiseconds = parseInt(match[3], 10);
    const text = match[4].trim();

    if (text) {
      const timestamp = minutes * 60 + seconds + centiseconds / 100;
      lines.push({ timestamp, text });
    }
  }

  return lines.sort((a, b) => a.timestamp - b.timestamp);
};

// ─── GET /api/lyrics/:songId ─────────────────────────────────
exports.getLyrics = async (req, res, next) => {
  try {
    const lyrics = await LyricTrack.findOne({ song: req.params.songId });

    if (!lyrics) {
      return res.status(404).json({ success: false, error: 'No lyrics found for this song' });
    }

    res.json({ success: true, data: lyrics });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/lyrics/:songId ─────────────────────────────────
// Accepts either: { lines: [...] } or an LRC file upload
exports.uploadLyrics = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.songId);
    if (!song) return res.status(404).json({ success: false, error: 'Song not found' });

    let lines = [];
    let rawLrc = '';
    let source = 'manual';

    if (req.file) {
      // LRC file uploaded
      const fs = require('fs');
      rawLrc = fs.readFileSync(req.file.path, 'utf-8');
      fs.unlinkSync(req.file.path); // remove temp file
      lines = parseLRC(rawLrc);
      source = 'lrc';
    } else if (req.body.lrc) {
      // LRC content as string
      rawLrc = req.body.lrc;
      lines = parseLRC(rawLrc);
      source = 'lrc';
    } else if (req.body.lines && Array.isArray(req.body.lines)) {
      // Manual JSON lines: [{ timestamp: 4.5, text: "Lyric line" }]
      lines = req.body.lines.map((l) => ({
        timestamp: parseFloat(l.timestamp),
        text: String(l.text).trim(),
      }));
      source = 'manual';
    } else {
      return res.status(400).json({ success: false, error: 'Provide lrc content or lines array' });
    }

    if (!lines.length) {
      return res.status(400).json({ success: false, error: 'Could not parse any lyric lines' });
    }

    // Upsert: update if exists, create if not
    const lyricTrack = await LyricTrack.findOneAndUpdate(
      { song: req.params.songId },
      {
        song: req.params.songId,
        uploadedBy: req.user.id,
        lines,
        rawLrc,
        source,
        language: req.body.language || 'en',
      },
      { new: true, upsert: true, runValidators: true }
    );

    logger.info(`Lyrics uploaded for song ${req.params.songId}: ${lines.length} lines`);
    res.status(201).json({ success: true, data: lyricTrack });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/lyrics/:songId/at?t=30.5 ──────────────────────
// Returns the current lyric line for a given timestamp
exports.getLyricAtTime = async (req, res, next) => {
  try {
    const t = parseFloat(req.query.t);
    if (isNaN(t)) return res.status(400).json({ success: false, error: 'Invalid timestamp' });

    const lyrics = await LyricTrack.findOne({ song: req.params.songId });
    if (!lyrics) return res.status(404).json({ success: false, error: 'No lyrics found' });

    // Binary search for current line
    const lines = lyrics.lines;
    let currentIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timestamp <= t) currentIdx = i;
      else break;
    }

    res.json({
      success: true,
      data: {
        currentLine: lines[currentIdx] || null,
        currentIndex: currentIdx,
        nextLine: lines[currentIdx + 1] || null,
        totalLines: lines.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/lyrics/:songId ──────────────────────────────
exports.deleteLyrics = async (req, res, next) => {
  try {
    await LyricTrack.findOneAndDelete({ song: req.params.songId });
    res.json({ success: true, message: 'Lyrics deleted' });
  } catch (err) {
    next(err);
  }
};
