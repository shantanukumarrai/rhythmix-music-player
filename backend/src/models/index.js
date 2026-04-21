/**
 * Rhythmix - Database Models
 * All Mongoose schemas: User, Song, Playlist, LyricTrack
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── USER MODEL ──────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 50 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Invalid email format'],
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    recentlyPlayed: [
      {
        song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
        playedAt: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      volume: { type: Number, min: 0, max: 100, default: 80 },
      repeatMode: { type: String, enum: ['none', 'all', 'one'], default: 'none' },
      shuffleEnabled: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: verify password
userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Add to recently played (max 20, no duplicates)
userSchema.methods.addToRecentlyPlayed = async function (songId) {
  this.recentlyPlayed = this.recentlyPlayed.filter(
    (r) => r.song.toString() !== songId.toString()
  );
  this.recentlyPlayed.unshift({ song: songId, playedAt: new Date() });
  if (this.recentlyPlayed.length > 20) this.recentlyPlayed.pop();
  return this.save();
};

const User = mongoose.model('User', userSchema);

// ─── SONG MODEL ──────────────────────────────────────────────
const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    album: { type: String, trim: true, default: 'Unknown Album' },
    genre: { type: String, trim: true, default: 'Unknown' },
    year: { type: Number },
    duration: { type: Number, required: true }, // in seconds
    bpm: { type: Number },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    thumbnailUrl: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: true },
    playCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    tags: [String],
    waveformData: [Number], // normalized amplitude data for waveform visualization
  },
  { timestamps: true }
);

// Index for fast search
songSchema.index({ title: 'text', artist: 'text', album: 'text', genre: 'text' });
songSchema.index({ uploadedBy: 1, createdAt: -1 });

const Song = mongoose.model('Song', songSchema);

// ─── PLAYLIST MODEL ──────────────────────────────────────────
const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [
      {
        song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
        addedAt: { type: Date, default: Date.now },
        order: { type: Number, default: 0 },
      },
    ],
    thumbnailUrl: { type: String, default: '' },
    isPublic: { type: Boolean, default: false },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalDuration: { type: Number, default: 0 }, // computed field
    songCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Recompute duration on save
playlistSchema.pre('save', function (next) {
  this.songCount = this.songs.length;
  next();
});

const Playlist = mongoose.model('Playlist', playlistSchema);

// ─── LYRIC TRACK MODEL ───────────────────────────────────────
const lyricLineSchema = new mongoose.Schema({
  timestamp: { type: Number, required: true }, // seconds
  text: { type: String, required: true },
  endTimestamp: { type: Number }, // optional end time
});

const lyricTrackSchema = new mongoose.Schema(
  {
    song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true, unique: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lines: [lyricLineSchema],
    language: { type: String, default: 'en' },
    source: { type: String, enum: ['lrc', 'manual', 'api'], default: 'lrc' },
    rawLrc: { type: String }, // store original LRC file content
  },
  { timestamps: true }
);

const LyricTrack = mongoose.model('LyricTrack', lyricTrackSchema);

module.exports = { User, Song, Playlist, LyricTrack };
