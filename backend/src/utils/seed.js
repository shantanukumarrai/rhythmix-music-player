/**
 * Rhythmix - Database Seed Script
 * Run: node src/utils/seed.js
 * Creates sample users, songs, playlists, and lyrics
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Song, Playlist, LyricTrack } = require('../models');
const connectDB = require('./db');

const SAMPLE_USERS = [
  { name: 'Demo User', email: 'demo@rhythmix.app', password: 'demo123', role: 'user' },
  { name: 'Admin', email: 'admin@rhythmix.app', password: 'admin123', role: 'admin' },
];

const SAMPLE_SONGS = [
  { title: 'Midnight Circuit', artist: 'Neon Drift', album: 'Synth Dreams', genre: 'Synth', duration: 213, bpm: 128, fileUrl: '/uploads/songs/demo1.mp3', isPublic: true },
  { title: 'Golden Hour', artist: 'Solar Keys', album: 'Daybreak', genre: 'Pop', duration: 195, bpm: 96, fileUrl: '/uploads/songs/demo2.mp3', isPublic: true },
  { title: 'Lost in Static', artist: 'Phantom Wave', album: 'Frequencies', genre: 'Indie', duration: 228, bpm: 110, fileUrl: '/uploads/songs/demo3.mp3', isPublic: true },
  { title: 'Pulse & Echo', artist: 'Echo Chamber', album: 'Four on the Floor', genre: 'Dance', duration: 172, bpm: 140, fileUrl: '/uploads/songs/demo4.mp3', isPublic: true },
  { title: 'Coastal Drive', artist: 'Marina Blue', album: 'Pacific', genre: 'Chill', duration: 247, bpm: 85, fileUrl: '/uploads/songs/demo5.mp3', isPublic: true },
  { title: 'Binary Stars', artist: 'Cosmos FM', album: 'Orbit', genre: 'Ambient', duration: 310, bpm: 72, fileUrl: '/uploads/songs/demo6.mp3', isPublic: true },
];

const SAMPLE_LYRICS = {
  'Midnight Circuit': [
    { timestamp: 0, text: 'Driving through the city at midnight' },
    { timestamp: 4, text: 'Neon lights blur through the glass' },
    { timestamp: 8, text: 'Electric pulse keeps me alive' },
    { timestamp: 12, text: 'Time is moving way too fast' },
    { timestamp: 16, text: 'Oh, the circuit never sleeps' },
    { timestamp: 20, text: 'Running through the digital deep' },
    { timestamp: 24, text: "We're the signal in the noise" },
    { timestamp: 28, text: 'Two lost souls in stereo' },
    { timestamp: 32, text: 'Midnight circuit, midnight flow' },
    { timestamp: 36, text: 'Dancing in the afterglow' },
  ],
  'Golden Hour': [
    { timestamp: 0, text: 'In the golden hour we found' },
    { timestamp: 4, text: 'Something we had always sought' },
    { timestamp: 8, text: 'Tangled in the fading light' },
    { timestamp: 12, text: 'Everything you never thought' },
    { timestamp: 16, text: 'Stay a little longer here' },
    { timestamp: 20, text: 'The sky is burning amber clear' },
    { timestamp: 24, text: 'Golden, golden, all the way' },
    { timestamp: 28, text: 'Sun is setting on the bay' },
  ],
};

async function seed() {
  await connectDB();
  console.log('🌱 Starting seed...');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Song.deleteMany({}),
    Playlist.deleteMany({}),
    LyricTrack.deleteMany({}),
  ]);
  console.log('✓ Cleared existing data');

  // Create users
  const users = await User.create(SAMPLE_USERS);
  const [demoUser] = users;
  console.log(`✓ Created ${users.length} users`);

  // Create songs (attach uploader)
  const songs = await Song.create(
    SAMPLE_SONGS.map((s) => ({ ...s, uploadedBy: demoUser._id }))
  );
  console.log(`✓ Created ${songs.length} songs`);

  // Create lyrics for some songs
  const lyricPromises = songs
    .filter((s) => SAMPLE_LYRICS[s.title])
    .map((s) =>
      LyricTrack.create({
        song: s._id,
        uploadedBy: demoUser._id,
        lines: SAMPLE_LYRICS[s.title],
        source: 'manual',
        language: 'en',
      })
    );
  await Promise.all(lyricPromises);
  console.log(`✓ Created lyrics for ${lyricPromises.length} songs`);

  // Create a sample playlist
  await Playlist.create({
    name: 'My Favourites',
    owner: demoUser._id,
    songs: songs.slice(0, 4).map((s, i) => ({ song: s._id, order: i })),
    isPublic: false,
  });
  console.log('✓ Created sample playlist');

  console.log('\n🎵 Seed complete!');
  console.log('   Login: demo@rhythmix.app / demo123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
