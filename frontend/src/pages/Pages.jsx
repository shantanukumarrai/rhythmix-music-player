/**
 * SearchPage — Full-text song search with live results
 */
import React, { useState, useEffect, useRef } from 'react';
import { songsAPI } from '../api/client';
import { SongList } from '../components/Playlist/SongCard';
import styles from './Pages.module.css';

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);

  // Load all songs initially
  useEffect(() => {
    songsAPI.getAll({ limit: 50 })
      .then(({ data }) => setAll(data.data || []))
      .catch(console.error);
  }, []);

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await songsAPI.search(q);
        setResults(data.data || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  const displayed = query.trim() ? results : all;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Search</h1>
      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          type="text"
          placeholder="Search songs, artists, albums, genres…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
          className={styles.searchInput}
        />
        {query && <button className={styles.clearBtn} onClick={() => handleSearch('')}>×</button>}
      </div>
      {loading && <div className={styles.status}>Searching…</div>}
      {!loading && query && results.length === 0 && (
        <div className={styles.status}>No results for "{query}"</div>
      )}
      <SongList songs={displayed} />
    </div>
  );
};

/**
 * LibraryPage — User's liked songs + playlists
 */
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { playlistsAPI } from '../api/client';
import { Link } from 'react-router-dom';

export const LibraryPage = () => {
  const { user } = useAuth();
  const { likedIds } = usePlayer();
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [tab, setTab] = useState('liked');

  useEffect(() => {
    if (!user) return;
    import('../api/client').then(({ usersAPI }) => {
      usersAPI.getLiked(user.id || user._id)
        .then(({ data }) => setLikedSongs(data.data || []))
        .catch(console.error);
    });
    playlistsAPI.getAll()
      .then(({ data }) => setPlaylists(data.data || []))
      .catch(console.error);
  }, [user]);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Your Library</h1>
      <div className={styles.tabs}>
        {['liked', 'playlists'].map((t) => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t === 'liked' ? `♥ Liked (${likedSongs.length})` : `♫ Playlists (${playlists.length})`}
          </button>
        ))}
      </div>

      {tab === 'liked' && (
        likedSongs.length === 0
          ? <div className={styles.status}>You haven't liked any songs yet.</div>
          : <SongList songs={likedSongs} />
      )}

      {tab === 'playlists' && (
        <div className={styles.playlistGrid}>
          {playlists.length === 0
            ? <div className={styles.status}>No playlists yet. Create one from the sidebar.</div>
            : playlists.map((pl) => (
              <Link key={pl._id} to={`/playlist/${pl._id}`} className={styles.plCard}>
                <div className={styles.plCardArt}>♫</div>
                <div className={styles.plCardName}>{pl.name}</div>
                <div className={styles.plCardCount}>{pl.songCount} songs</div>
              </Link>
            ))
          }
        </div>
      )}
    </div>
  );
};

/**
 * PlaylistPage — Single playlist view
 */
import { useParams } from 'react-router-dom';

export const PlaylistPage = () => {
  const { id } = useParams();
  const { playSong } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    playlistsAPI.getById(id)
      .then(({ data }) => setPlaylist(data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.page}><div className={styles.status}>Loading…</div></div>;
  if (!playlist) return <div className={styles.page}><div className={styles.status}>Playlist not found.</div></div>;

  const songs = playlist.songs.map((s) => s.song).filter(Boolean);

  const playAll = () => {
    if (songs.length) playSong(songs[0], songs, 0);
  };

  return (
    <div className={styles.page}>
      <div className={styles.playlistHeader}>
        <div className={styles.playlistArt}>♫</div>
        <div className={styles.playlistMeta}>
          <div className={styles.playlistType}>Playlist</div>
          <h1 className={styles.playlistName}>{playlist.name}</h1>
          {playlist.description && <p className={styles.playlistDesc}>{playlist.description}</p>}
          <p className={styles.playlistInfo}>{songs.length} songs</p>
          <button className={styles.playAllBtn} onClick={playAll} disabled={!songs.length}>
            ▶ Play All
          </button>
        </div>
      </div>
      <SongList songs={songs} />
    </div>
  );
};

/**
 * UploadPage — Upload audio + lyrics files
 */
export const UploadPage = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [lrcFile, setLrcFile] = useState(null);
  const [meta, setMeta] = useState({ title: '', artist: '', album: '', genre: '' });
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const setM = (k) => (e) => setMeta((m) => ({ ...m, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) return;
    setUploading(true);
    setStatus('');
    try {
      const fd = new FormData();
      fd.append('audio', audioFile);
      Object.entries(meta).forEach(([k, v]) => v && fd.append(k, v));
      const { data } = await songsAPI.upload(fd, setProgress);
      const songId = data.data._id;

      if (lrcFile) {
        const lfd = new FormData();
        lfd.append('lrc', lrcFile);
        await lyricsAPI.upload(songId, lfd);
      }

      setStatus('✓ Upload successful!');
      setAudioFile(null); setLrcFile(null);
      setMeta({ title: '', artist: '', album: '', genre: '' });
      setProgress(0);
    } catch (err) {
      setStatus('✗ ' + (err.response?.data?.error || 'Upload failed'));
    } finally { setUploading(false); }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Upload Music</h1>
      <form onSubmit={handleSubmit} className={styles.uploadForm}>

        <div className={styles.dropZone} onClick={() => document.getElementById('audioInput').click()}>
          <input id="audioInput" type="file" accept="audio/*" hidden
            onChange={(e) => setAudioFile(e.target.files[0])} />
          <div className={styles.dropIcon}>♪</div>
          <div className={styles.dropText}>
            {audioFile ? audioFile.name : 'Click to select audio file'}
          </div>
          <div className={styles.dropSub}>MP3, FLAC, WAV, OGG — max 50 MB</div>
        </div>

        <div className={styles.metaGrid}>
          {[['title','Title'],['artist','Artist'],['album','Album'],['genre','Genre']].map(([k, label]) => (
            <div key={k} className={styles.field}>
              <label className={styles.label}>{label}</label>
              <input type="text" placeholder={`Song ${label.toLowerCase()}`} value={meta[k]} onChange={setM(k)} />
            </div>
          ))}
        </div>

        <div className={styles.dropZone} onClick={() => document.getElementById('lrcInput').click()}
          style={{ padding: '16px 24px' }}>
          <input id="lrcInput" type="file" accept=".lrc,text/plain" hidden
            onChange={(e) => setLrcFile(e.target.files[0])} />
          <div className={styles.dropText} style={{ fontSize: '14px' }}>
            {lrcFile ? lrcFile.name : '✦ Optional: attach .lrc lyrics file'}
          </div>
        </div>

        {progress > 0 && progress < 100 && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            <span className={styles.progressLabel}>{progress}%</span>
          </div>
        )}

        {status && <div className={`${styles.uploadStatus} ${status.startsWith('✓') ? styles.ok : styles.err}`}>{status}</div>}

        <button type="submit" className={styles.uploadBtn} disabled={uploading || !audioFile}>
          {uploading ? `Uploading… ${progress}%` : '↑ Upload Song'}
        </button>
      </form>
    </div>
  );
};

import { lyricsAPI } from '../api/client';

/**
 * ProfilePage — User preferences and account settings
 */
export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { recentlyPlayed } = usePlayer();
  const [form, setForm] = useState({ name: user?.name || '', theme: user?.preferences?.theme || 'dark' });
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const { authAPI } = await import('../api/client');
      const { data } = await authAPI.updateMe({ name: form.name, preferences: { theme: form.theme } });
      updateUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.error(err); }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Profile</h1>
      <div className={styles.profileGrid}>
        <div className={styles.profileCard}>
          <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
          <h2 className={styles.profileName}>{user?.name}</h2>
          <p className={styles.profileEmail}>{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className={styles.settingsCard}>
          <h3 className={styles.cardTitle}>Settings</h3>
          <div className={styles.field}>
            <label className={styles.label}>Display Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Theme</label>
            <select value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <button type="submit" className={styles.saveBtn}>
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </form>
      </div>

      {recentlyPlayed.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recently Played</h2>
          <SongList songs={recentlyPlayed.slice(0, 10)} />
        </section>
      )}
    </div>
  );
};

export default SearchPage;
